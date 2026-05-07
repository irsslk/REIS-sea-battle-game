"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { RotateCcw, Shuffle, Swords, Users, Target } from "lucide-react";

import { useGameStore } from "@/context/game-store";
import { Locale } from "@/lib/i18n";
import { BotLevel, ShipKind } from "@/lib/game-logic";
import { buildProbabilityHeatmap } from "@/lib/probability-ai";
import { KAZAKH_CITIES, getProfile, recordMatchResult, setCity } from "@/lib/profile-service";

import { AuthButton } from "@/components/auth-button";
import { AICoachPanel } from "./AICoachPanel";
import { Board } from "./Board";
import { MultiplayerGameClient } from "./MultiplayerGameClient";
import { PostGameCoach } from "./PostGameCoach";

// ─── Ship SVG Icons (teal metallic style) ────────────────────────────────────

const TengriIcon = () => (
  <svg viewBox="0 0 128 22" fill="none" className="w-full h-auto">
    <path d="M3 17 L11 10 L117 10 L125 17 L117 20 L11 20Z" fill="#0A5C6B"/>
    <path d="M3 17 L11 10 L11 20Z" fill="#0F7A8A" opacity="0.6"/>
    <path d="M125 17 L117 10 L117 20Z" fill="#0F7A8A" opacity="0.6"/>
    <rect x="56" y="5" width="24" height="5" rx="1" fill="#0F7A8A"/>
    <rect x="61" y="2" width="14" height="3" rx="1" fill="#1AAFBF" opacity="0.8"/>
    <rect x="22" y="7" width="20" height="4" rx="1" fill="#0F7A8A"/>
    <line x1="22" y1="9" x2="11" y2="9" stroke="#1AAFBF" strokeWidth="2" strokeLinecap="round" opacity="0.9"/>
    <rect x="86" y="7" width="20" height="4" rx="1" fill="#0F7A8A"/>
    <line x1="106" y1="9" x2="117" y2="9" stroke="#1AAFBF" strokeWidth="2" strokeLinecap="round" opacity="0.9"/>
    <line x1="11" y1="16" x2="117" y2="16" stroke="#D4B78F" strokeWidth="0.7" opacity="0.4"/>
    <rect x="67" y="1" width="3" height="1.5" fill="#D4B78F" opacity="0.5"/>
  </svg>
);

const BerkutIcon = () => (
  <svg viewBox="0 0 96 22" fill="none" className="w-full h-auto">
    <path d="M3 17 L10 10 L86 10 L93 17 L86 20 L10 20Z" fill="#0A5C6B"/>
    <path d="M3 17 L10 10 L10 20Z" fill="#0F7A8A" opacity="0.6"/>
    <path d="M93 17 L86 10 L86 20Z" fill="#0F7A8A" opacity="0.6"/>
    <rect x="44" y="4" width="20" height="6" rx="1" fill="#0F7A8A"/>
    <rect x="48" y="2" width="12" height="3" rx="1" fill="#1AAFBF" opacity="0.8"/>
    <rect x="18" y="7" width="18" height="4" rx="1" fill="#0F7A8A"/>
    <line x1="18" y1="9" x2="10" y2="9" stroke="#1AAFBF" strokeWidth="2" strokeLinecap="round" opacity="0.9"/>
    <line x1="10" y1="16" x2="86" y2="16" stroke="#D4B78F" strokeWidth="0.7" opacity="0.4"/>
  </svg>
);

const ZhalauIcon = () => (
  <svg viewBox="0 0 64 22" fill="none" className="w-full h-auto">
    <path d="M3 17 L10 10 L54 10 L61 17 L54 20 L10 20Z" fill="#0A5C6B"/>
    <path d="M3 17 L10 10 L10 20Z" fill="#0F7A8A" opacity="0.6"/>
    <path d="M61 17 L54 10 L54 20Z" fill="#0F7A8A" opacity="0.6"/>
    <rect x="28" y="5" width="15" height="5" rx="1" fill="#0F7A8A"/>
    <rect x="31" y="3" width="9" height="3" rx="1" fill="#1AAFBF" opacity="0.8"/>
    <line x1="10" y1="16" x2="54" y2="16" stroke="#D4B78F" strokeWidth="0.7" opacity="0.4"/>
  </svg>
);

const SunkarIcon = () => (
  <svg viewBox="0 0 32 22" fill="none" className="w-full h-auto">
    <ellipse cx="16" cy="15" rx="12" ry="5" fill="#0A5C6B"/>
    <rect x="11" y="8" width="10" height="7" rx="1" fill="#0F7A8A"/>
    <rect x="13" y="5" width="6" height="4" rx="1" fill="#1AAFBF" opacity="0.8"/>
    <line x1="16" y1="3" x2="16" y2="5" stroke="#D4B78F" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>
    <ellipse cx="16" cy="18" rx="10" ry="1.5" stroke="#D4B78F" strokeWidth="0.5" opacity="0.3" fill="none"/>
  </svg>
);

const SHIP_ICONS: Record<ShipKind, React.FC> = {
  tengri: TengriIcon, berkut: BerkutIcon, zhalau: ZhalauIcon, sunkar: SunkarIcon,
};

// ─── Bot difficulty ───────────────────────────────────────────────────────────

const BOT_OPTIONS: Array<{ label: string; value: BotLevel }> = [
  { label: "ЛЁГКИЙ", value: "easy" },
  { label: "СРЕДНИЙ", value: "medium" },
  { label: "СЛОЖНЫЙ", value: "hard" },
];

// ─── Panel style helpers ──────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  background: "rgba(44,36,27,0.92)",
  border: "1px solid rgba(212,183,143,0.12)",
  borderRadius: "10px",
  boxShadow: "inset 0 1px 0 rgba(212,183,143,0.07), 0 4px 20px rgba(0,0,0,0.5)",
  backdropFilter: "blur(8px)",
};

const panelHeaderStyle: React.CSSProperties = {
  padding: "6px 12px",
  borderBottom: "1px solid rgba(63,50,40,0.8)",
  background: "rgba(28,24,20,0.7)",
  fontSize: "11px",
  fontWeight: 700,
  fontFamily: "monospace",
  letterSpacing: "0.15em",
  textTransform: "uppercase" as const,
  color: "#B0A080",
};

// ─── Solo Game ────────────────────────────────────────────────────────────────

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

  const botRemainingKinds    = useMemo(() => botFleet.filter((s) => s.hitKeys.length < s.size).map((s) => s.kind), [botFleet]);
  const playerRemainingKinds = useMemo(() => playerFleet.filter((s) => s.hitKeys.length < s.size).map((s) => s.kind), [playerFleet]);

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

  const phaseLabel =
    phase === "placement" ? "РАССТАНОВКА ФЛОТА" :
    phase === "battle" ? (playerTurn ? "⚔ ВАШ ХОД" : isBotThinking ? "ПРОТИВНИК ДУМАЕТ…" : "ХОД ПРОТИВНИКА") :
    winner === "player" ? "✦ ПОБЕДА — ФЛОТ УНИЧТОЖЕН" : "✦ ПОРАЖЕНИЕ — ФЛОТ РАЗГРОМЛЕН";

  const phaseColor =
    phase === "game-over" ? (winner === "player" ? "#0F7A8A" : "#FF4D4D") :
    phase === "battle" && playerTurn ? "#E8C97F" : "#8A7A6A";

  return (
    <main style={{
      minHeight: "calc(100vh - 52px)",
      background: "radial-gradient(ellipse at 25% 15%, #0D1A22 0%, #1C1814 55%, #130E0A 100%)",
      padding: "14px",
    }}>
      {/* City modal */}
      {!citySaved && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 30,
          display: "grid", placeItems: "center",
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(4px)",
          padding: "16px",
        }}>
          <div style={{ ...panelStyle, width: "100%", maxWidth: "420px", padding: "24px" }}>
            <p style={{ fontSize: "11px", fontFamily: "monospace", letterSpacing: "0.15em", color: "#B0A080", marginBottom: "4px" }}>ИДЕНТИФИКАЦИЯ</p>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#D4B78F", marginBottom: "16px" }}>Выберите ваш город</h3>
            <select
              value={city}
              onChange={(e) => setCityState(e.target.value)}
              style={{
                width: "100%", padding: "10px 12px",
                background: "#1A150F",
                border: "1px solid rgba(63,50,40,0.9)",
                borderRadius: "6px",
                color: "#F5EDE0",
                fontSize: "13px",
                outline: "none",
              }}
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
                style={{
                  width: "100%", marginTop: "8px", padding: "10px 12px",
                  background: "#1A150F",
                  border: "1px solid rgba(63,50,40,0.9)",
                  borderRadius: "6px",
                  color: "#F5EDE0",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            )}
            <button
              onClick={saveCity}
              type="button"
              style={{
                width: "100%", marginTop: "12px", padding: "11px",
                background: "linear-gradient(135deg, #0A5C6B, #0F7A8A)",
                border: "none", borderRadius: "6px",
                color: "#F5EDE0",
                fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.15em",
                fontSize: "11px", textTransform: "uppercase",
                cursor: "pointer",
                boxShadow: "0 0 12px rgba(15,122,138,0.3)",
              }}
            >
              Подтвердить
            </button>
          </div>
        </div>
      )}

      {/* Post-game overlay */}
      {phase === "game-over" && coachReport && (
        <PostGameCoach locale={locale} report={coachReport} shotMarks={botShots} onPlayAgain={resetGame} />
      )}

      <div style={{ maxWidth: "1400px", margin: "0 auto" }} className="space-y-3">
        {/* Header */}
        <div style={{ ...panelStyle, padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                <Target style={{ width: "14px", height: "14px", color: "#0F7A8A" }} />
                <span style={{ fontSize: "12px", fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.15em", color: "#B0A080" }}>
                  КОМАНДНЫЙ МОСТИК
                </span>
              </div>
              <p style={{ fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.08em", fontSize: "15px", color: phaseColor }}>
                {phaseLabel}
              </p>
              {phase === "battle" && (
                <p style={{ fontSize: "12px", fontFamily: "monospace", color: "#B0A080", marginTop: "2px" }}>
                  ХОД №{turnNumber}
                </p>
              )}
            </div>
            <AuthButton />
          </div>
        </div>

        {/* Main grid */}
        <div style={{ display: "grid", gap: "12px" }} className="xl:grid-cols-[280px_1fr_1fr]">
          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {/* Fleet panel */}
            <div style={panelStyle}>
              <div style={panelHeaderStyle}>Флотилия командира</div>
              <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                {playerFleet.map((ship) => {
                  const Icon = SHIP_ICONS[ship.kind];
                  const placed = ship.isPlaced;
                  return (
                    <button
                      key={ship.instanceId}
                      draggable={phase === "placement"}
                      onDragStart={() => setDragShipId(ship.instanceId)}
                      type="button"
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        background: placed ? "rgba(15,122,138,0.12)" : "rgba(28,24,20,0.7)",
                        border: placed ? "1px solid rgba(15,122,138,0.35)" : "1px solid rgba(63,50,40,0.8)",
                        borderRadius: "6px",
                        cursor: phase === "placement" ? "grab" : "default",
                        textAlign: "left",
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "64px", flexShrink: 0, opacity: placed ? 0.7 : 1 }}>
                          <Icon />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: "13px", fontWeight: 700, fontFamily: "monospace", color: "#D4B78F", letterSpacing: "0.05em" }}>
                            {ship.name}
                          </p>
                          <p style={{ fontSize: "11px", fontFamily: "monospace", color: placed ? "#0F7A8A" : "#9A8A68" }}>
                            {ship.size} ячейки{placed ? " · РАЗМЕЩЁН" : " · перетащить"}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Controls */}
              <div style={{ padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <button
                  type="button"
                  onClick={toggleOrientation}
                  disabled={phase !== "placement"}
                  style={{
                    padding: "8px",
                    background: "rgba(28,24,20,0.8)",
                    border: "1px solid rgba(63,50,40,0.8)",
                    borderRadius: "6px",
                    color: "#C0A880",
                    fontFamily: "monospace",
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    cursor: "pointer",
                    opacity: phase !== "placement" ? 0.4 : 1,
                  }}
                >
                  ПОВОРОТ: {orientation === "horizontal" ? "ГОРИЗОНТ" : "ВЕРТИКАЛЬ"}
                </button>
                <button
                  type="button"
                  onClick={autoPlacePlayerFleet}
                  disabled={phase !== "placement"}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                    padding: "8px",
                    background: "rgba(15,122,138,0.15)",
                    border: "1px solid rgba(15,122,138,0.35)",
                    borderRadius: "6px",
                    color: "#0F7A8A",
                    fontFamily: "monospace",
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    cursor: "pointer",
                    opacity: phase !== "placement" ? 0.4 : 1,
                  }}
                >
                  <Shuffle style={{ width: "12px", height: "12px" }} />
                  АВТОРАССТАНОВКА
                </button>
                <button
                  type="button"
                  onClick={startBattle}
                  disabled={!allPlaced || phase !== "placement"}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                    padding: "10px",
                    background: allPlaced && phase === "placement"
                      ? "linear-gradient(135deg, #8B6010, #D4A020)"
                      : "rgba(44,36,27,0.5)",
                    border: "1px solid rgba(212,183,143,0.3)",
                    borderRadius: "6px",
                    color: allPlaced && phase === "placement" ? "#1C1814" : "#5A4A30",
                    fontFamily: "monospace",
                    fontSize: "11px",
                    fontWeight: 800,
                    letterSpacing: "0.15em",
                    cursor: allPlaced && phase === "placement" ? "pointer" : "not-allowed",
                    boxShadow: allPlaced && phase === "placement" ? "0 0 14px rgba(212,160,32,0.3)" : "none",
                  }}
                >
                  <Swords style={{ width: "14px", height: "14px" }} />
                  В БОЙ!
                </button>
              </div>

              {/* Difficulty */}
              <div style={{
                margin: "0 10px 10px",
                padding: "8px",
                background: "rgba(28,24,20,0.6)",
                border: "1px solid rgba(63,50,40,0.6)",
                borderRadius: "6px",
              }}>
                <p style={{ fontSize: "11px", fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.15em", color: "#B0A080", marginBottom: "6px" }}>
                  УРОВЕНЬ ПРОТИВНИКА
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px" }}>
                  {BOT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={phase !== "placement"}
                      onClick={() => setBotLevel(opt.value)}
                      style={{
                        padding: "6px 2px",
                        background: botLevel === opt.value ? "rgba(15,122,138,0.25)" : "transparent",
                        border: botLevel === opt.value ? "1px solid rgba(15,122,138,0.5)" : "1px solid rgba(63,50,40,0.6)",
                        borderRadius: "4px",
                        color: botLevel === opt.value ? "#1AAFBF" : "#9A8A68",
                        fontFamily: "monospace",
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                        cursor: "pointer",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* New game / Multiplayer */}
              <div style={{ padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <button
                  type="button"
                  onClick={resetGame}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
                    padding: "7px",
                    background: "transparent",
                    border: "1px solid rgba(139,34,34,0.4)",
                    borderRadius: "6px",
                    color: "#FF8A8A",
                    fontFamily: "monospace",
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    cursor: "pointer",
                    opacity: 0.8,
                  }}
                >
                  <RotateCcw style={{ width: "12px", height: "12px" }} />
                  НОВАЯ ИГРА
                </button>
                <Link
                  href={`/${locale}/game?createRoom=1`}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
                    padding: "7px",
                    background: "transparent",
                    border: "1px solid rgba(15,122,138,0.3)",
                    borderRadius: "6px",
                    color: "#1AAFBF",
                    fontFamily: "monospace",
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textDecoration: "none",
                  }}
                >
                  <Users style={{ width: "11px", height: "11px" }} />
                  ИГРАТЬ С ДРУГОМ
                </Link>
              </div>
            </div>

            {/* AI Coach */}
            <AICoachPanel botLevel={botLevel} playerAimHeatmap={[]} botAimHeatmap={[]} />
          </div>

          {/* Player board */}
          <Board
            title="МОЯ ФЛОТИЛИЯ"
            marks={playerShots}
            ships={playerFleet}
            revealShips
            onCellDrop={
              phase === "placement"
                ? (coord) => { if (dragShipId) { placeShip(dragShipId, coord); setDragShipId(null); } }
                : undefined
            }
          />

          {/* Enemy board */}
          <Board
            title={isBotThinking ? "ДОСКА ПРОТИВНИКА — ДУМАЕТ…" : "ДОСКА ПРОТИВНИКА"}
            marks={botShots}
            ships={botFleet}
            heatmap={[]}
            interactive={phase === "battle" && playerTurn}
            onCellClick={phase === "battle" && playerTurn ? fireAtBot : undefined}
          />
        </div>
      </div>
    </main>
  );
};

export const GameClient = ({ locale, roomCode, createRoom }: { locale: Locale; roomCode: string | null; createRoom: boolean }) => {
  if (roomCode || createRoom) return <MultiplayerGameClient locale={locale} initialRoomCode={roomCode} createRoom={createRoom} />;
  return <SoloGameClient locale={locale} />;
};
