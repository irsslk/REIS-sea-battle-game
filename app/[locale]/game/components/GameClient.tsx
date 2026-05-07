"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { RotateCcw, Shuffle, Swords, Users } from "lucide-react";

import { useGameStore } from "@/context/game-store";
import { Locale } from "@/lib/i18n";
import { BotLevel, CellMark, ShipKind, PlacedShip } from "@/lib/game-logic";
import { buildProbabilityHeatmap } from "@/lib/probability-ai";
import { KAZAKH_CITIES, getProfile, recordMatchResult, setCity } from "@/lib/profile-service";

import { AuthButton } from "@/components/auth-button";
import { AICoachPanel } from "./AICoachPanel";
import { Board } from "./Board";
import { MultiplayerGameClient } from "./MultiplayerGameClient";
import { PostGameCoach } from "./PostGameCoach";

// ─── Ship SVG Icons ──────────────────────────────────────────────────────────

const TengriIcon = () => (
  <svg viewBox="0 0 128 22" fill="none" className="w-full h-auto">
    <path d="M3 17 L11 10 L117 10 L125 17 L117 20 L11 20Z" fill="#2C4A7A"/>
    <rect x="56" y="5" width="24" height="5" rx="1" fill="#3A5A8A"/>
    <rect x="61" y="2" width="14" height="3" rx="1" fill="#4A6AA0"/>
    <rect x="22" y="7" width="20" height="4" rx="1" fill="#3A5A8A"/>
    <line x1="22" y1="9" x2="11" y2="9" stroke="#3A5A8A" strokeWidth="2.5" strokeLinecap="round"/>
    <rect x="86" y="7" width="20" height="4" rx="1" fill="#3A5A8A"/>
    <line x1="106" y1="9" x2="117" y2="9" stroke="#3A5A8A" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="11" y1="16" x2="117" y2="16" stroke="#C8A86B" strokeWidth="0.8" opacity="0.6"/>
    <path d="M3 17 L11 10" stroke="#C8A86B" strokeWidth="1" opacity="0.8"/>
    <path d="M125 17 L117 10" stroke="#C8A86B" strokeWidth="1" opacity="0.8"/>
  </svg>
);

const BerkutIcon = () => (
  <svg viewBox="0 0 96 22" fill="none" className="w-full h-auto">
    <path d="M3 17 L10 10 L86 10 L93 17 L86 20 L10 20Z" fill="#2C4A7A"/>
    <rect x="44" y="4" width="20" height="6" rx="1" fill="#3A5A8A"/>
    <rect x="48" y="2" width="12" height="3" rx="1" fill="#4A6AA0"/>
    <rect x="18" y="7" width="18" height="4" rx="1" fill="#3A5A8A"/>
    <line x1="18" y1="9" x2="10" y2="9" stroke="#3A5A8A" strokeWidth="2" strokeLinecap="round"/>
    <line x1="10" y1="16" x2="86" y2="16" stroke="#C8A86B" strokeWidth="0.8" opacity="0.6"/>
    <path d="M3 17 L10 10" stroke="#C8A86B" strokeWidth="1" opacity="0.8"/>
    <path d="M93 17 L86 10" stroke="#C8A86B" strokeWidth="1" opacity="0.8"/>
  </svg>
);

const ZhalauIcon = () => (
  <svg viewBox="0 0 64 22" fill="none" className="w-full h-auto">
    <path d="M3 17 L10 10 L54 10 L61 17 L54 20 L10 20Z" fill="#2C4A7A"/>
    <rect x="28" y="5" width="15" height="5" rx="1" fill="#3A5A8A"/>
    <rect x="31" y="3" width="9" height="3" rx="1" fill="#4A6AA0"/>
    <line x1="10" y1="16" x2="54" y2="16" stroke="#C8A86B" strokeWidth="0.8" opacity="0.6"/>
    <path d="M3 17 L10 10" stroke="#C8A86B" strokeWidth="1" opacity="0.8"/>
    <path d="M61 17 L54 10" stroke="#C8A86B" strokeWidth="1" opacity="0.8"/>
  </svg>
);

const SunkarIcon = () => (
  <svg viewBox="0 0 32 22" fill="none" className="w-full h-auto">
    <ellipse cx="16" cy="15" rx="12" ry="5" fill="#2C4A7A"/>
    <rect x="11" y="8" width="10" height="7" rx="1" fill="#3A5A8A"/>
    <rect x="13" y="5" width="6" height="4" rx="1" fill="#4A6AA0"/>
    <line x1="16" y1="3" x2="16" y2="5" stroke="#C8A86B" strokeWidth="1.5" strokeLinecap="round"/>
    <ellipse cx="16" cy="18" rx="10" ry="2" stroke="#C8A86B" strokeWidth="0.6" opacity="0.5" fill="none"/>
  </svg>
);

const SHIP_ICONS: Record<ShipKind, React.FC> = {
  tengri: TengriIcon,
  berkut: BerkutIcon,
  zhalau: ZhalauIcon,
  sunkar: SunkarIcon,
};

// ─── Bot difficulty ───────────────────────────────────────────────────────────

const botOptions: Array<{ label: string; value: BotLevel }> = [
  { label: "Лёгкий", value: "easy" },
  { label: "Средний", value: "medium" },
  { label: "Сложный", value: "hard" },
];

// ─── Solo game ────────────────────────────────────────────────────────────────

const SoloGameClient = ({ locale }: { locale: Locale }) => {
  const [dragShipId, setDragShipId] = useState<string | null>(null);
  const [city, setCityState] = useState("");
  const [customCity, setCustomCity] = useState("");
  const [citySaved, setCitySaved] = useState(true);
  const recordedRef = useRef(false);

  useEffect(() => {
    const p = getProfile();
    setCityState(p.city || "");
    setCitySaved(Boolean(p.city));
  }, []);

  const {
    phase, ships, orientation, playerTurn, winner, botLevel,
    playerShots, botShots, turnNumber, coachReport, isBotThinking,
    setBotLevel, setLocale, toggleOrientation, placeShip,
    autoPlacePlayerFleet, startBattle, resetGame, fireAtBot, botTurn,
  } = useGameStore();

  const playerFleet = useMemo(() => ships.filter((s) => !s.instanceId.startsWith("bot-")), [ships]);
  const botFleet    = useMemo(() => ships.filter((s) =>  s.instanceId.startsWith("bot-")), [ships]);
  const allPlaced   = playerFleet.every((s) => s.isPlaced);

  const botRemainingKinds  = useMemo(() => botFleet.filter((s) => s.hitKeys.length < s.size).map((s) => s.kind),    [botFleet]);
  const playerRemainingKinds = useMemo(() => playerFleet.filter((s) => s.hitKeys.length < s.size).map((s) => s.kind), [playerFleet]);

  // Heatmap only used post-game
  const playerAimHeatmap = useMemo(
    () => buildProbabilityHeatmap(botShots, botRemainingKinds),
    [botShots, botRemainingKinds],
  );

  useEffect(() => { setLocale(locale); }, [locale, setLocale]);

  useEffect(() => {
    if (phase === "battle" && !playerTurn && !winner) {
      const t = setTimeout(() => botTurn(), 500);
      return () => clearTimeout(t);
    }
  }, [phase, playerTurn, winner, botTurn]);

  useEffect(() => {
    if (phase === "game-over" && !recordedRef.current && coachReport) {
      recordMatchResult({ won: winner === "player", accuracy: coachReport.accuracy, mode: "bot", coachReport }).catch(() => null);
      recordedRef.current = true;
    } else if (phase !== "game-over") {
      recordedRef.current = false;
    }
  }, [phase, winner, coachReport]);

  const saveCity = async () => {
    const val = city === "other" ? customCity.trim() : city;
    if (!val) return;
    try { await setCity(val); setCitySaved(true); } catch {}
  };

  return (
    <main className="min-h-[calc(100vh-56px)] bg-gradient-to-b from-[#EDE0CC] to-[#DDD0B8] p-4">
      {/* City modal */}
      {!citySaved && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#C9AA88] bg-[#F0E6D8] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#5A3A1A]">Выберите ваш город</h3>
            <p className="mt-1 text-sm text-[#8B6B4A]">Для участия в городском лидерборде</p>
            <select
              value={city}
              onChange={(e) => setCityState(e.target.value)}
              className="mt-3 w-full rounded-xl border border-[#C9AA88] bg-[#F8F1E9] px-3 py-2 text-[#2C1A0E] focus:outline-none"
            >
              <option value="">— Выберите —</option>
              {KAZAKH_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="other">Другой город</option>
            </select>
            {city === "other" && (
              <input
                value={customCity}
                onChange={(e) => setCustomCity(e.target.value)}
                placeholder="Введите город"
                className="mt-2 w-full rounded-xl border border-[#C9AA88] bg-[#F8F1E9] px-3 py-2 text-[#2C1A0E] focus:outline-none"
              />
            )}
            <button
              onClick={saveCity}
              type="button"
              className="mt-4 w-full rounded-xl bg-[#8B5A2B] py-2.5 font-bold text-[#F5EDE4] hover:bg-[#6B4020] transition"
            >
              Сохранить
            </button>
          </div>
        </div>
      )}

      {/* Post-game overlay */}
      {phase === "game-over" && coachReport && (
        <PostGameCoach
          locale={locale}
          report={coachReport}
          shotMarks={botShots}
          onPlayAgain={resetGame}
        />
      )}

      <div className="mx-auto w-full max-w-7xl space-y-4">
        {/* Game header */}
        <header className="rounded-2xl border border-[#C9AA88] bg-[#F0E6D8] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-extrabold text-[#8B5A2B]">REIS — Морской бой</h1>
              <p className="mt-0.5 text-sm text-[#6B4C30]">
                {phase === "placement" && "Расставьте флот и начните сражение"}
                {phase === "battle" && (playerTurn ? "⚔ Ваш ход — атакуйте!" : isBotThinking ? "🤔 Бот думает…" : "Ход противника")}
                {phase === "game-over" && (winner === "player" ? "🏆 Победа! Флот противника потоплен." : "💀 Поражение. Флот разгромлен.")}
              </p>
              {phase === "battle" && <p className="text-xs text-[#9E7B5A]">Ход {turnNumber}</p>}
            </div>
            <AuthButton />
          </div>
        </header>

        <section className="grid gap-4 xl:grid-cols-[300px_1fr_1fr]">
          {/* Sidebar */}
          <aside className="space-y-3">
            {/* Fleet panel */}
            <div className="rounded-2xl border border-[#C9AA88] bg-[#F0E6D8] p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-bold text-[#5A3A1A]">Флотилия</h2>
              <div className="space-y-2">
                {playerFleet.map((ship) => {
                  const Icon = SHIP_ICONS[ship.kind];
                  const placed = ship.isPlaced;
                  return (
                    <button
                      key={ship.instanceId}
                      draggable={phase === "placement"}
                      onDragStart={() => setDragShipId(ship.instanceId)}
                      type="button"
                      className={`w-full rounded-xl border p-2.5 text-left transition ${
                        placed
                          ? "border-[#8B5A2B]/40 bg-[#8B5A2B]/10"
                          : "border-[#C9AA88] bg-[#F8F1E9] hover:border-[#8B5A2B]/40"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-20 shrink-0 ${placed ? "opacity-60" : ""}`}>
                          <Icon />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[#2C1A0E]">{ship.name}</p>
                          <p className="text-xs text-[#8B6B4A]">
                            {ship.size} {ship.size === 1 ? "клетка" : "клетки"}
                            {" · "}
                            {placed ? <span className="text-[#6B8B2B]">✓ размещён</span> : "перетащите"}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Controls */}
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  onClick={toggleOrientation}
                  disabled={phase !== "placement"}
                  className="w-full rounded-xl border border-[#C9AA88] bg-[#F8F1E9] px-3 py-2 text-sm font-semibold text-[#5A3A1A] transition hover:bg-[#E8D5BB] disabled:opacity-40"
                >
                  Поворот: {orientation === "horizontal" ? "↔ Горизонтально" : "↕ Вертикально"}
                </button>
                <button
                  type="button"
                  onClick={autoPlacePlayerFleet}
                  disabled={phase !== "placement"}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#8B5A2B] px-3 py-2 text-sm font-bold text-[#F5EDE4] transition hover:bg-[#6B4020] disabled:opacity-40"
                >
                  <Shuffle className="h-4 w-4" />
                  Авторасстановка
                </button>
                <button
                  type="button"
                  onClick={startBattle}
                  disabled={!allPlaced || phase !== "placement"}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#E8B923] px-3 py-2 text-sm font-bold text-[#2C1A0E] transition hover:bg-[#D4A510] disabled:opacity-40"
                >
                  <Swords className="h-4 w-4" />
                  Начать бой!
                </button>
              </div>

              {/* Bot difficulty */}
              <div className="mt-3 rounded-xl border border-[#C9AA88] bg-[#F8F1E9] p-3">
                <p className="mb-2 text-xs font-semibold text-[#8B6B4A]">Сложность противника</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {botOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={phase !== "placement"}
                      onClick={() => setBotLevel(opt.value)}
                      className={`rounded-lg py-1 text-xs font-bold transition ${
                        botLevel === opt.value
                          ? "bg-[#8B5A2B] text-[#F5EDE4]"
                          : "bg-[#E8D5BB] text-[#5A3A1A] hover:bg-[#D4C0A0]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  onClick={resetGame}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#C9AA88] px-3 py-2 text-sm font-semibold text-[#8B3A2B] transition hover:bg-[#8B3A2B]/10"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Новая игра
                </button>
                <Link
                  href={`/${locale}/game?createRoom=1`}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#C9AA88] px-3 py-2 text-sm font-semibold text-[#2B5A8B] transition hover:bg-[#2B5A8B]/10"
                >
                  <Users className="h-3.5 w-3.5" />
                  Играть с другом
                </Link>
              </div>
            </div>

            {/* AI Coach Panel */}
            <AICoachPanel
              botLevel={botLevel}
              playerAimHeatmap={[]}
              botAimHeatmap={[]}
            />
          </aside>

          {/* Player board */}
          <Board
            title="Моя флотилия"
            marks={playerShots}
            ships={playerFleet}
            revealShips
            onCellDrop={
              phase === "placement"
                ? (coord) => { if (dragShipId) { placeShip(dragShipId, coord); setDragShipId(null); } }
                : undefined
            }
          />

          {/* Enemy board — NO heatmap during battle (only post-game via PostGameCoach) */}
          <Board
            title={isBotThinking ? "Доска противника • Бот думает…" : "Доска противника"}
            marks={botShots}
            ships={botFleet}
            heatmap={[]}
            interactive={phase === "battle" && playerTurn}
            onCellClick={phase === "battle" && playerTurn ? fireAtBot : undefined}
          />
        </section>
      </div>
    </main>
  );
};

export const GameClient = ({ locale, roomCode, createRoom }: { locale: Locale; roomCode: string | null; createRoom: boolean }) => {
  if (roomCode || createRoom) return <MultiplayerGameClient locale={locale} initialRoomCode={roomCode} createRoom={createRoom} />;
  return <SoloGameClient locale={locale} />;
};
