"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { Copy, RotateCcw, Shuffle, Swords, Users } from "lucide-react";

import { PostGameCoach } from "@/app/[locale]/game/components/PostGameCoach";
import { createClient } from "@/supabase/client";
import { analyzeMatch, CoachReport } from "@/lib/coach-analysis";
import {
  CellMark, Coord, Orientation, PlacedShip,
  applyShot, areAllShipsSunk, autoPlaceFleet,
  buildFleetInstances, canPlaceShip, coordKey,
  createEmptyMarks, getShipCells,
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

interface FleetShip extends PlacedShip { isPlaced: boolean; }

interface ShotLog {
  by: "player" | "bot";
  coord: Coord;
  result: "miss" | "hit" | "sunk";
}

const randomId  = () => Math.random().toString(36).slice(2, 10);
const makeRoomCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

const toFleet = (): FleetShip[] =>
  buildFleetInstances().map((s) => ({ ...s, cells: [], hitKeys: [], isPlaced: false }));

const pickRandomUnknown = (marks: CellMark[][]): Coord | null => {
  const available: Coord[] = [];
  for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++)
    if (marks[y][x] === "unknown") available.push({ x, y });
  return available.length ? available[Math.floor(Math.random() * available.length)] : null;
};

// ─── shared panel style (matches solo game) ──────────────────────────────────
const panelStyle: React.CSSProperties = {
  background: "rgba(44,36,27,0.92)",
  border: "1px solid rgba(212,183,143,0.12)",
  borderRadius: "10px",
  boxShadow: "inset 0 1px 0 rgba(212,183,143,0.07), 0 4px 20px rgba(0,0,0,0.5)",
  backdropFilter: "blur(8px)",
};

const label: React.CSSProperties = {
  fontSize: "11px", fontFamily: "monospace", fontWeight: 700,
  letterSpacing: "0.15em", textTransform: "uppercase" as const,
  color: "#B0A080",
};

export const MultiplayerGameClient = ({ locale, initialRoomCode, createRoom }: MultiplayerGameClientProps) => {
  const [roomCode] = useState<string | null>(() =>
    initialRoomCode ?? (createRoom ? makeRoomCode() : null)
  );
  const [playerId] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    let saved = localStorage.getItem("reis-player-id");
    if (!saved) { saved = randomId(); localStorage.setItem("reis-player-id", saved); }
    return saved;
  });

  const [channel, setChannel]           = useState<RealtimeChannel | null>(null);
  const [phase, setPhase]               = useState<Phase>("placement");
  const [orientation, setOrientation]   = useState<Orientation>("horizontal");
  const [myFleet, setMyFleet]           = useState<FleetShip[]>(toFleet());
  const [myMarks, setMyMarks]           = useState<CellMark[][]>(createEmptyMarks());
  const [enemyMarks, setEnemyMarks]     = useState<CellMark[][]>(createEmptyMarks());
  const [myTurn, setMyTurn]             = useState(false);
  const [countdown, setCountdown]       = useState(45);
  const [status, setStatus]             = useState("Ожидание подключения...");
  const [dragShipId, setDragShipId]     = useState<string | null>(null);
  const [winner, setWinner]             = useState<"player" | "bot" | null>(null);
  const [log, setLog]                   = useState<ShotLog[]>([]);
  const [copied, setCopied]             = useState(false);

  // Refs — avoids stale closures in event handlers
  const myFleetRef       = useRef(myFleet);
  const myMarksRef       = useRef(myMarks);
  const phaseRef         = useRef(phase);
  const myReadyRef       = useRef(false);        // has THIS player clicked ready?
  const opponentReadyRef = useRef(false);        // has OPPONENT clicked ready?
  const channelRef       = useRef<RealtimeChannel | null>(null);
  const recordedRef      = useRef(false);

  useEffect(() => { myFleetRef.current = myFleet; },  [myFleet]);
  useEffect(() => { myMarksRef.current = myMarks; },  [myMarks]);
  useEffect(() => { phaseRef.current   = phase; },    [phase]);
  useEffect(() => { channelRef.current = channel; },  [channel]);

  const allPlaced    = myFleet.every((s) => s.isPlaced);
  const playerCells  = useMemo(() => myFleet.filter((s) => s.isPlaced), [myFleet]);

  // Copy invite link on room creation
  useEffect(() => {
    if (createRoom && roomCode && !initialRoomCode) {
      window.history.replaceState({}, "", `/${locale}/game?room=${roomCode}`);
      navigator.clipboard.writeText(`${window.location.origin}/${locale}/game?room=${roomCode}`).catch(() => null);
    }
  }, [createRoom, roomCode, locale, initialRoomCode]);

  // ── Start the battle locally (called by whoever sends the start event)
  const applyStart = (turn: string) => {
    setPhase("battle");
    setMyTurn(turn === playerId);
    setCountdown(45);
    setStatus(turn === playerId ? "Ваш ход" : "Противник думает...");
  };

  // ── Send start + apply locally (host only)
  const sendStart = (ch: RealtimeChannel, hostId: string) => {
    ch.send({ type: "broadcast", event: "start", payload: { turn: hostId } });
    applyStart(hostId); // self: false means sender won't receive its own broadcast
  };

  // Channel setup
  useEffect(() => {
    if (!playerId || !roomCode) return;
    const supabase = createClient();
    const ch = supabase.channel(`reis-room-${roomCode}`, {
      config: { broadcast: { self: false }, presence: { key: playerId } },
    });

    ch.on("presence", { event: "sync" }, () => {
      const size = Object.keys(ch.presenceState()).length;
      setStatus(size >= 2 ? "Оба игрока в комнате" : "Ожидание соперника...");
    });

    ch.on("broadcast", { event: "ready" }, ({ payload }) => {
      if (payload.playerId === playerId) return;
      opponentReadyRef.current = true;
      setStatus("Противник готов — нажмите Ready");

      // If we're already ready and we're the host → start
      if (myReadyRef.current) {
        const hostId = Object.keys(ch.presenceState()).sort()[0];
        if (hostId === playerId) sendStart(ch, hostId);
      }
    });

    ch.on("broadcast", { event: "start" }, ({ payload }) => {
      applyStart(payload.turn);
    });

    ch.on("broadcast", { event: "shot" }, ({ payload }) => {
      if (payload.from === playerId || phaseRef.current !== "battle") return;

      const shotsSet = new Set<string>();
      for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++)
        if (myMarksRef.current[y][x] !== "unknown") shotsSet.add(coordKey({ x, y }));

      const mutableFleet = [...myFleetRef.current];
      const outcome = applyShot(mutableFleet, { x: payload.x, y: payload.y }, shotsSet);
      if (outcome.result === "repeat") return;

      setMyFleet(mutableFleet);
      setLog((prev) => [...prev, {
        by: "bot" as const,
        coord: { x: payload.x, y: payload.y },
        result: outcome.result as "miss" | "hit" | "sunk",
      }]);
      setMyMarks((prev) => {
        const next = prev.map((row) => [...row]);
        if (outcome.result === "miss") next[payload.y][payload.x] = "miss";
        if (outcome.result === "hit")  next[payload.y][payload.x] = "hit";
        if (outcome.result === "sunk" && outcome.sunkCells)
          outcome.sunkCells.forEach((c) => { next[c.y][c.x] = "sunk"; });
        return next;
      });

      const dead = areAllShipsSunk(mutableFleet);
      ch.send({
        type: "broadcast", event: "shot_result",
        payload: { to: payload.from, from: playerId, x: payload.x, y: payload.y, result: outcome.result, sunkCells: outcome.sunkCells ?? [], dead },
      });

      if (dead) {
        ch.send({ type: "broadcast", event: "game_over", payload: { winner: payload.from } });
        setPhase("game-over"); setWinner("bot");
      } else {
        setMyTurn(true); setCountdown(45); setStatus("Ваш ход");
      }
    });

    ch.on("broadcast", { event: "shot_result" }, ({ payload }) => {
      if (payload.to !== playerId) return;
      setLog((prev) => [...prev, { by: "player", coord: { x: payload.x, y: payload.y }, result: payload.result }]);
      setEnemyMarks((prev) => {
        const next = prev.map((row) => [...row]);
        if (payload.result === "miss") next[payload.y][payload.x] = "miss";
        if (payload.result === "hit")  next[payload.y][payload.x] = "hit";
        if (payload.result === "sunk") payload.sunkCells.forEach((c: Coord) => { next[c.y][c.x] = "sunk"; });
        return next;
      });
      if (payload.dead) { setPhase("game-over"); setWinner("player"); }
      else { setMyTurn(false); setStatus("Противник думает..."); }
    });

    ch.on("broadcast", { event: "game_over" }, ({ payload }) => {
      setWinner(payload.winner === playerId ? "player" : "bot");
      setPhase("game-over");
    });

    ch.subscribe(async (s) => {
      if (s === "SUBSCRIBED") await ch.track({ playerId, ready: false });
    });

    setChannel(ch);
    return () => { ch.unsubscribe(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, roomCode]);

  // Turn countdown — auto-fire on timeout
  useEffect(() => {
    if (phase !== "battle" || !myTurn) return;
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          const fallback = pickRandomUnknown(enemyMarks);
          if (fallback && channelRef.current) {
            channelRef.current.send({ type: "broadcast", event: "shot", payload: { from: playerId, x: fallback.x, y: fallback.y } });
            setMyTurn(false); setStatus("Противник думает...");
          }
          return 45;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, myTurn, enemyMarks, playerId]);

  // Coach report
  const coachReport: CoachReport | null = useMemo(() => {
    if (phase !== "game-over" || !winner) return null;
    return analyzeMatch({ locale, winner, log, playerFleet: myFleet, enemyFleet: myFleet });
  }, [phase, winner, locale, log, myFleet]);

  useEffect(() => {
    if (phase === "game-over" && coachReport && !recordedRef.current) {
      recordMatchResult({ won: winner === "player", accuracy: coachReport.accuracy, mode: "multiplayer", coachReport }).catch(() => null);
      recordedRef.current = true;
    } else if (phase !== "game-over") recordedRef.current = false;
  }, [phase, coachReport, winner]);

  // Actions
  const placeShip = (shipId: string, start: Coord) => {
    const ship = myFleet.find((s) => s.instanceId === shipId);
    if (!ship) return;
    const cells = getShipCells(start, ship.size, orientation);
    if (!canPlaceShip(myFleet.filter((s) => s.isPlaced), cells, shipId)) return;
    setMyFleet((prev) => prev.map((s) => s.instanceId === shipId ? { ...s, cells, isPlaced: true, hitKeys: [] } : s));
  };

  const fire = (coord: Coord) => {
    if (!channel || !myTurn || phase !== "battle" || enemyMarks[coord.y][coord.x] !== "unknown") return;
    channel.send({ type: "broadcast", event: "shot", payload: { from: playerId, x: coord.x, y: coord.y } });
  };

  const markReady = () => {
    if (!allPlaced || !channel) return;
    myReadyRef.current = true;
    channel.send({ type: "broadcast", event: "ready", payload: { playerId } });
    setStatus("Ожидание готовности соперника...");

    // If opponent already clicked ready and we're the host → start immediately
    if (opponentReadyRef.current) {
      const hostId = Object.keys(channel.presenceState()).sort()[0];
      if (hostId === playerId) sendStart(channel, hostId);
    }
  };

  const autoPlace = () => {
    const fleet = autoPlaceFleet();
    setMyFleet((prev) => prev.map((ship) => {
      const found = fleet.find((s) => s.instanceId === ship.instanceId);
      return found ? { ...ship, cells: found.cells, isPlaced: true, hitKeys: [] } : ship;
    }));
  };

  const copyInvite = async () => {
    if (!roomCode) return;
    await navigator.clipboard.writeText(`${window.location.origin}/${locale}/game?room=${roomCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const phaseColor =
    phase === "game-over" ? (winner === "player" ? "#0F7A8A" : "#FF4D4D") :
    myTurn ? "#E8C97F" : "#B0A080";

  return (
    <main style={{
      minHeight: "calc(100vh - 52px)",
      background: "radial-gradient(ellipse at 25% 15%, #0D1A22 0%, #1C1814 55%, #130E0A 100%)",
      padding: "14px",
    }}>
      {phase === "game-over" && coachReport && (
        <PostGameCoach locale={locale} report={coachReport} shotMarks={enemyMarks} onPlayAgain={() => window.location.reload()} />
      )}

      <div style={{ maxWidth: "1400px", margin: "0 auto" }} className="space-y-3">
        {/* Header */}
        <div style={{ ...panelStyle, padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                <Users style={{ width: "13px", height: "13px", color: "#0F7A8A" }} />
                <span style={{ ...label }}>МУЛЬТИПЛЕЕР</span>
              </div>
              <p style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "15px", color: phaseColor, letterSpacing: "0.05em" }}>
                {phase === "placement" ? status :
                 phase === "battle" ? (myTurn ? "⚔ ВАШ ХОД" : "ПРОТИВНИК ДУМАЕТ…") :
                 winner === "player" ? "✦ ПОБЕДА" : "✦ ПОРАЖЕНИЕ"}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              {roomCode && (
                <button onClick={copyInvite} style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  padding: "6px 12px",
                  background: copied ? "rgba(15,122,138,0.2)" : "rgba(44,36,27,0.8)",
                  border: "1px solid rgba(63,50,40,0.8)",
                  borderRadius: "6px",
                  color: copied ? "#1AAFBF" : "#B0A080",
                  fontFamily: "monospace", fontSize: "11px", fontWeight: 700,
                  letterSpacing: "0.1em", cursor: "pointer",
                }}>
                  <Copy style={{ width: "11px", height: "11px" }} />
                  {copied ? "СКОПИРОВАНО" : `КОД: ${roomCode}`}
                </button>
              )}
              {phase === "battle" && (
                <span style={{
                  padding: "6px 12px",
                  background: countdown <= 10 ? "rgba(139,34,34,0.3)" : "rgba(44,36,27,0.8)",
                  border: `1px solid ${countdown <= 10 ? "rgba(255,77,77,0.3)" : "rgba(63,50,40,0.8)"}`,
                  borderRadius: "6px",
                  fontFamily: "monospace", fontSize: "13px", fontWeight: 800,
                  color: countdown <= 10 ? "#FF8A8A" : "#E8C97F",
                  letterSpacing: "0.1em",
                }}>
                  {countdown}с
                </span>
              )}
            </div>
          </div>
        </div>

        <section style={{ display: "grid", gap: "12px" }} className="xl:grid-cols-[280px_1fr_1fr]">
          {/* Sidebar */}
          <aside style={{ ...panelStyle }}>
            <div style={{ padding: "8px 12px 0", borderBottom: "1px solid rgba(63,50,40,0.7)", paddingBottom: "7px" }}>
              <p style={{ ...label }}>Мой флот</p>
            </div>
            <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: "5px" }}>
              {myFleet.map((ship) => (
                <button
                  key={ship.instanceId}
                  draggable={phase === "placement"}
                  onDragStart={() => setDragShipId(ship.instanceId)}
                  type="button"
                  style={{
                    width: "100%", padding: "8px 10px", textAlign: "left",
                    background: ship.isPlaced ? "rgba(15,122,138,0.12)" : "rgba(28,24,20,0.7)",
                    border: ship.isPlaced ? "1px solid rgba(15,122,138,0.35)" : "1px solid rgba(63,50,40,0.8)",
                    borderRadius: "6px", cursor: phase === "placement" ? "grab" : "default",
                  }}
                >
                  <span style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 700, color: "#D4B78F" }}>{ship.name}</span>
                  <span style={{ fontFamily: "monospace", fontSize: "11px", color: ship.isPlaced ? "#0F7A8A" : "#9A8A68", marginLeft: "6px" }}>
                    {ship.size} кл{ship.isPlaced ? " · ✓" : ""}
                  </span>
                </button>
              ))}
            </div>

            {phase === "placement" && (
              <div style={{ padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <button onClick={() => setOrientation((p) => p === "horizontal" ? "vertical" : "horizontal")} type="button" style={{
                  padding: "8px", background: "rgba(28,24,20,0.8)", border: "1px solid rgba(63,50,40,0.8)",
                  borderRadius: "6px", color: "#C0A880", fontFamily: "monospace", fontSize: "12px",
                  fontWeight: 700, letterSpacing: "0.08em", cursor: "pointer",
                }}>
                  ПОВОРОТ: {orientation === "horizontal" ? "↔ ГОРИЗОНТ" : "↕ ВЕРТИКАЛЬ"}
                </button>
                <button onClick={autoPlace} type="button" style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  padding: "8px", background: "rgba(15,122,138,0.15)", border: "1px solid rgba(15,122,138,0.35)",
                  borderRadius: "6px", color: "#0F7A8A", fontFamily: "monospace", fontSize: "12px",
                  fontWeight: 700, letterSpacing: "0.08em", cursor: "pointer",
                }}>
                  <Shuffle style={{ width: "13px", height: "13px" }} />
                  АВТОРАССТАНОВКА
                </button>
                <button onClick={markReady} disabled={!allPlaced} type="button" style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  padding: "10px",
                  background: allPlaced ? "linear-gradient(135deg, #8B6010, #D4A020)" : "rgba(44,36,27,0.5)",
                  border: "1px solid rgba(212,183,143,0.3)", borderRadius: "6px",
                  color: allPlaced ? "#1C1814" : "#5A4A30",
                  fontFamily: "monospace", fontSize: "12px", fontWeight: 800, letterSpacing: "0.15em",
                  cursor: allPlaced ? "pointer" : "not-allowed",
                  boxShadow: allPlaced ? "0 0 14px rgba(212,160,32,0.3)" : "none",
                }}>
                  <Swords style={{ width: "14px", height: "14px" }} />
                  ГОТОВ К БОЮ
                </button>
              </div>
            )}

            {phase === "battle" && (
              <div style={{ padding: "0 10px 10px" }}>
                <button onClick={() => window.location.reload()} type="button" style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
                  width: "100%", padding: "8px",
                  background: "transparent", border: "1px solid rgba(139,34,34,0.4)",
                  borderRadius: "6px", color: "#FF8A8A",
                  fontFamily: "monospace", fontSize: "11px", fontWeight: 700, cursor: "pointer",
                }}>
                  <RotateCcw style={{ width: "12px", height: "12px" }} />
                  ПОКИНУТЬ БОЙ
                </button>
              </div>
            )}
          </aside>

          <Board
            title="МОЯ ФЛОТИЛИЯ"
            marks={myMarks}
            ships={playerCells}
            revealShips
            onCellDrop={phase === "placement"
              ? (coord) => { if (dragShipId) { placeShip(dragShipId, coord); setDragShipId(null); } }
              : undefined
            }
          />
          <Board
            title={myTurn ? "ДОСКА ПРОТИВНИКА — ВАШ ХОД" : "ДОСКА ПРОТИВНИКА"}
            marks={enemyMarks}
            interactive={phase === "battle" && myTurn}
            onCellClick={fire}
          />
        </section>
      </div>
    </main>
  );
};
