"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";

import { PostGameCoach } from "@/app/[locale]/game/components/PostGameCoach";
import { createClient } from "@/supabase/client";
import { analyzeMatch, CoachReport } from "@/lib/coach-analysis";
import {
  CellMark,
  Coord,
  Orientation,
  PlacedShip,
  applyShot,
  areAllShipsSunk,
  autoPlaceFleet,
  buildFleetInstances,
  canPlaceShip,
  coordKey,
  createEmptyMarks,
  getShipCells,
} from "@/lib/game-logic";
import { Locale } from "@/lib/i18n";
import { recordMatchResult } from "@/lib/profile-service";
import { Board } from "./Board";

type Phase = "placement" | "battle" | "game-over";

interface MultiplayerGameClientProps {
  locale: Locale;
  initialRoomCode: string | null;
  createRoom: boolean;
}

interface FleetShip extends PlacedShip {
  isPlaced: boolean;
}

interface ShotLog {
  by: "player" | "bot";
  coord: Coord;
  result: "miss" | "hit" | "sunk";
}

const randomId = () => Math.random().toString(36).slice(2, 10);
const makeRoomCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

const toFleet = (): FleetShip[] =>
  buildFleetInstances().map((ship) => ({ ...ship, cells: [], hitKeys: [], isPlaced: false }));

const pickRandomUnknown = (marks: CellMark[][]): Coord | null => {
  const available: Coord[] = [];
  for (let y = 0; y < 10; y += 1) {
    for (let x = 0; x < 10; x += 1) {
      if (marks[y][x] === "unknown") {
        available.push({ x, y });
      }
    }
  }
  if (available.length === 0) {
    return null;
  }
  return available[Math.floor(Math.random() * available.length)];
};

export const MultiplayerGameClient = ({ locale, initialRoomCode, createRoom }: MultiplayerGameClientProps) => {
  const [roomCode] = useState<string | null>(() => initialRoomCode ?? (createRoom ? makeRoomCode() : null));
  const [playerId] = useState<string>(() => {
    if (typeof window === "undefined") {
      return "";
    }
    let saved = localStorage.getItem("reis-player-id");
    if (!saved) {
      saved = randomId();
      localStorage.setItem("reis-player-id", saved);
    }
    return saved;
  });
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [phase, setPhase] = useState<Phase>("placement");
  const [orientation, setOrientation] = useState<Orientation>("horizontal");
  const [myFleet, setMyFleet] = useState<FleetShip[]>(toFleet());
  const [myMarks, setMyMarks] = useState<CellMark[][]>(createEmptyMarks());
  const [enemyMarks, setEnemyMarks] = useState<CellMark[][]>(createEmptyMarks());
  const [myTurn, setMyTurn] = useState(false);
  const [countdown, setCountdown] = useState(45);
  const [status, setStatus] = useState("Ожидание подключения...");
  const [dragShipId, setDragShipId] = useState<string | null>(null);
  const [opponentReady, setOpponentReady] = useState(false);
  const [winner, setWinner] = useState<"player" | "bot" | null>(null);
  const [log, setLog] = useState<ShotLog[]>([]);
  const recordedRef = useRef(false);
  const myFleetRef = useRef(myFleet);
  const myMarksRef = useRef(myMarks);
  const phaseRef = useRef(phase);

  const allPlaced = myFleet.every((ship) => ship.isPlaced);
  const playerCells = useMemo(() => myFleet.filter((ship) => ship.isPlaced), [myFleet]);

  useEffect(() => {
    myFleetRef.current = myFleet;
    myMarksRef.current = myMarks;
    phaseRef.current = phase;
  }, [myFleet, myMarks, phase]);

  useEffect(() => {
    if (createRoom && roomCode && !initialRoomCode) {
      const url = `${window.location.origin}/${locale}/game?room=${roomCode}`;
      window.history.replaceState({}, "", `/${locale}/game?room=${roomCode}`);
      navigator.clipboard.writeText(url).catch(() => null);
    }
  }, [createRoom, roomCode, locale, initialRoomCode]);

  useEffect(() => {
    if (!playerId || !roomCode) {
      return;
    }
    const supabase = createClient();
    const ch = supabase.channel(`reis-room-${roomCode}`, {
      config: { broadcast: { self: false }, presence: { key: playerId } },
    });

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      const size = Object.keys(state).length;
      setStatus(size >= 2 ? "Оба игрока в комнате" : "Ожидание соперника...");
    });

    ch.on("broadcast", { event: "ready" }, ({ payload }) => {
      if (payload.playerId !== playerId) {
        setOpponentReady(true);
        setStatus("Противник готов. Ожидание старта...");
      }
    });

    ch.on("broadcast", { event: "start" }, ({ payload }) => {
      setPhase("battle");
      setMyTurn(payload.turn === playerId);
      setCountdown(45);
      setStatus(payload.turn === playerId ? "Ваш ход" : "Противник думает...");
    });

    ch.on("broadcast", { event: "shot" }, async ({ payload }) => {
      if (payload.from === playerId || phaseRef.current !== "battle") {
        return;
      }
      const shotsSet = new Set<string>();
      for (let y = 0; y < 10; y += 1) {
        for (let x = 0; x < 10; x += 1) {
          if (myMarksRef.current[y][x] !== "unknown") {
            shotsSet.add(coordKey({ x, y }));
          }
        }
      }
      const mutableFleet = [...myFleetRef.current];
      const outcome = applyShot(mutableFleet, { x: payload.x, y: payload.y }, shotsSet);
      if (outcome.result === "repeat") {
        return;
      }
      setMyFleet(mutableFleet);
      setLog((prev) => [...prev, { by: "bot", coord: { x: payload.x, y: payload.y }, result: outcome.result }]);
      setMyMarks((prev) => {
        const next = prev.map((row) => [...row]);
        if (outcome.result === "miss") next[payload.y][payload.x] = "miss";
        if (outcome.result === "hit") next[payload.y][payload.x] = "hit";
        if (outcome.result === "sunk" && outcome.sunkCells) {
          outcome.sunkCells.forEach((cell) => {
            next[cell.y][cell.x] = "sunk";
          });
        }
        return next;
      });
      const dead = areAllShipsSunk(mutableFleet);
      ch.send({
        type: "broadcast",
        event: "shot_result",
        payload: {
          to: payload.from,
          from: playerId,
          x: payload.x,
          y: payload.y,
          result: outcome.result,
          sunkCells: outcome.sunkCells ?? [],
          dead,
        },
      });
      if (dead) {
        ch.send({ type: "broadcast", event: "game_over", payload: { winner: payload.from } });
        setPhase("game-over");
        setWinner("bot");
      } else {
        setMyTurn(true);
        setCountdown(45);
        setStatus("Ваш ход");
      }
    });

    ch.on("broadcast", { event: "shot_result" }, ({ payload }) => {
      if (payload.to !== playerId) {
        return;
      }
      setLog((prev) => [...prev, { by: "player", coord: { x: payload.x, y: payload.y }, result: payload.result }]);
      setEnemyMarks((prev) => {
        const next = prev.map((row) => [...row]);
        if (payload.result === "miss") next[payload.y][payload.x] = "miss";
        if (payload.result === "hit") next[payload.y][payload.x] = "hit";
        if (payload.result === "sunk") {
          payload.sunkCells.forEach((cell: Coord) => {
            next[cell.y][cell.x] = "sunk";
          });
        }
        return next;
      });
      if (payload.dead) {
        setPhase("game-over");
        setWinner("player");
      } else {
        setMyTurn(false);
        setStatus("Противник думает...");
      }
    });

    ch.on("broadcast", { event: "game_over" }, ({ payload }) => {
      const result = payload.winner === playerId ? "player" : "bot";
      setWinner(result);
      setPhase("game-over");
    });

    ch.subscribe(async (s) => {
      if (s === "SUBSCRIBED") {
        await ch.track({ playerId, ready: false });
      }
    });

    setChannel(ch);
    return () => {
      ch.unsubscribe();
    };
  }, [playerId, roomCode, locale]);

  useEffect(() => {
    if (phase !== "battle" || !myTurn) {
      return;
    }
    const timer = setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          const fallback = pickRandomUnknown(enemyMarks);
          if (fallback && channel) {
            channel.send({ type: "broadcast", event: "shot", payload: { from: playerId, x: fallback.x, y: fallback.y } });
            setMyTurn(false);
            setStatus("Противник думает...");
          }
          return 45;
        }
        return current - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, myTurn, enemyMarks, channel, playerId]);

  const coachReport: CoachReport | null = useMemo(() => {
    if (phase !== "game-over" || !winner) {
      return null;
    }
    return analyzeMatch(
      {
        locale,
        winner,
        log,
        playerFleet: myFleet,
        enemyFleet: myFleet,
      },
    );
  }, [phase, winner, locale, log, myFleet]);

  useEffect(() => {
    if (phase === "game-over" && coachReport && !recordedRef.current) {
      recordMatchResult({
        won: winner === "player",
        accuracy: coachReport.accuracy,
        mode: "multiplayer",
        coachReport,
      }).catch(() => null);
      recordedRef.current = true;
    } else if (phase !== "game-over") {
      recordedRef.current = false;
    }
  }, [phase, coachReport, winner]);

  const placeShip = (shipId: string, start: Coord) => {
    const ship = myFleet.find((item) => item.instanceId === shipId);
    if (!ship) return;
    const cells = getShipCells(start, ship.size, orientation);
    const placed = myFleet.filter((item) => item.isPlaced);
    if (!canPlaceShip(placed, cells, shipId)) return;
    setMyFleet((prev) =>
      prev.map((item) => (item.instanceId === shipId ? { ...item, cells, isPlaced: true, hitKeys: [] } : item)),
    );
  };

  const fire = (coord: Coord) => {
    if (!channel || !myTurn || phase !== "battle" || enemyMarks[coord.y][coord.x] !== "unknown") return;
    channel.send({ type: "broadcast", event: "shot", payload: { from: playerId, x: coord.x, y: coord.y } });
  };

  const markReady = async () => {
    if (!allPlaced || !channel) return;
    channel.send({ type: "broadcast", event: "ready", payload: { playerId } });
    const current = channel.presenceState();
    const players = Object.keys(current);
    const hostId = players.sort()[0];
    setStatus("Ожидание готовности соперника...");
    if (opponentReady && hostId === playerId) {
      channel.send({ type: "broadcast", event: "start", payload: { turn: hostId } });
    }
  };

  const autoPlace = () => {
    const fleet = autoPlaceFleet();
    setMyFleet((prev) =>
      prev.map((ship) => {
        const found = fleet.find((item) => item.instanceId === ship.instanceId);
        return found ? { ...ship, cells: found.cells, isPlaced: true, hitKeys: [] } : ship;
      }),
    );
  };

  const copyInvite = async () => {
    if (!roomCode) return;
    const url = `${window.location.origin}/${locale}/game?room=${roomCode}`;
    await navigator.clipboard.writeText(url);
    setStatus("Invite link скопирован");
  };

  return (
    <main className="min-h-[calc(100vh-65px)] bg-gradient-to-b from-[#061a35] via-[#0e2f4f] to-[#1b3d2d] p-4 text-white">
      {phase === "game-over" && coachReport && <PostGameCoach locale={locale} report={coachReport} onPlayAgain={() => window.location.reload()} />}
      <div className="mx-auto w-full max-w-7xl space-y-4">
        <header className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h1 className="text-2xl font-bold">REIS Multiplayer</h1>
          <p className="text-sm text-slate-200/80">{status}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded bg-white/10 px-2 py-1">Room: {roomCode ?? "..."}</span>
            <button type="button" onClick={copyInvite} className="rounded bg-cyan-300/25 px-2 py-1">
              Копировать invite link
            </button>
            {phase === "battle" && <span className="rounded bg-amber-300/20 px-2 py-1">Таймер хода: {countdown}с</span>}
          </div>
        </header>

        <section className="grid gap-4 xl:grid-cols-[320px_1fr_1fr]">
          <aside className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h2 className="mb-3 text-sm font-semibold">Мой флот</h2>
            <div className="space-y-2">
              {myFleet.map((ship) => (
                <button
                  key={ship.instanceId}
                  draggable={phase === "placement"}
                  onDragStart={() => setDragShipId(ship.instanceId)}
                  type="button"
                  className={`w-full rounded-xl border px-3 py-2 text-left ${ship.isPlaced ? "border-emerald-300/40 bg-emerald-400/15" : "border-white/20 bg-slate-900/50"}`}
                >
                  {ship.name} ({ship.size})
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setOrientation((p) => (p === "horizontal" ? "vertical" : "horizontal"))}
              className="mt-3 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2"
            >
              Поворот: {orientation === "horizontal" ? "Горизонтально" : "Вертикально"}
            </button>
            <button type="button" onClick={autoPlace} className="mt-2 w-full rounded-xl bg-emerald-300 px-3 py-2 text-slate-900">
              Авторасстановка
            </button>
            <button type="button" onClick={markReady} disabled={!allPlaced} className="mt-2 w-full rounded-xl bg-cyan-300 px-3 py-2 text-slate-900 disabled:opacity-40">
              Ready
            </button>
          </aside>

          <Board
            title="Моя флотилия"
            marks={myMarks}
            ships={playerCells}
            revealShips
            onCellDrop={
              phase === "placement"
                ? (coord) => {
                    if (!dragShipId) return;
                    placeShip(dragShipId, coord);
                    setDragShipId(null);
                  }
                : undefined
            }
          />
          <Board
            title={myTurn ? "Доска противника • Ваш ход" : "Доска противника • Противник думает..."}
            marks={enemyMarks}
            interactive={phase === "battle" && myTurn}
            onCellClick={fire}
          />
        </section>
      </div>
    </main>
  );
};
