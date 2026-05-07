"use client";

import { BarChart3, Crosshair, Flame, RotateCcw, Target, Trophy } from "lucide-react";
import { CoachReport } from "@/lib/coach-analysis";
import { CellMark, BOARD_SIZE } from "@/lib/game-logic";
import { Locale } from "@/lib/i18n";

interface PostGameCoachProps {
  locale: Locale;
  report: CoachReport;
  shotMarks?: CellMark[][];
  onPlayAgain: () => void;
}

const labels = {
  en: { heading: "Post-Match Analysis", playAgain: "Play Again", accuracy: "Accuracy", shotsPerShip: "Shots/Ship", aggression: "Aggression", pattern: "Pattern", win: "VICTORY", loss: "DEFEAT", center: "Center heavy", edges: "Edge heavy", balanced: "Balanced", heatmap: "Shot Map" },
  ru: { heading: "Тактический разбор", playAgain: "Снова в бой", accuracy: "Точность", shotsPerShip: "Выстрелов/корабль", aggression: "Агрессия", pattern: "Паттерн", win: "ПОБЕДА", loss: "ПОРАЖЕНИЕ", center: "Центр", edges: "Края", balanced: "Сбалансирован", heatmap: "Карта огня" },
  kk: { heading: "Тактикалық талдау", playAgain: "Қайта ойнау", accuracy: "Дәлдік", shotsPerShip: "Кемеге атулар", aggression: "Агрессия", pattern: "Паттерн", win: "ЖЕҢІС", loss: "ЖЕҢІЛІС", center: "Орталық", edges: "Шет", balanced: "Теңгерімді", heatmap: "Ату картасы" },
} as const;

export const PostGameCoach = ({ locale, report, shotMarks, onPlayAgain }: PostGameCoachProps) => {
  const t = labels[locale];
  const isWin = report.winLoss === "win";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 40,
      display: "grid", placeItems: "center",
      background: "rgba(0,0,0,0.8)",
      backdropFilter: "blur(6px)",
      padding: "16px",
    }}>
      <section style={{
        width: "100%", maxWidth: "900px",
        background: "rgba(37,32,26,0.98)",
        border: "1px solid rgba(212,183,143,0.15)",
        borderRadius: "14px",
        padding: "24px",
        boxShadow: "0 24px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(212,183,143,0.08)",
        maxHeight: "90vh",
        overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <p style={{ fontSize: "11px", fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.25em", color: "#9A8A68", marginBottom: "4px" }}>
              AI КОМАНДНЫЙ АНАЛИЗ
            </p>
            <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#D4B78F", letterSpacing: "0.05em" }}>
              {t.heading}
            </h2>
          </div>
          <span style={{
            padding: "6px 16px",
            borderRadius: "6px",
            fontFamily: "monospace",
            fontWeight: 800,
            letterSpacing: "0.15em",
            fontSize: "12px",
            ...(isWin
              ? { background: "linear-gradient(135deg, #0A5C6B, #0F7A8A)", color: "#F5EDE0", boxShadow: "0 0 16px rgba(15,122,138,0.4)" }
              : { background: "rgba(139,34,34,0.4)", border: "1px solid rgba(255,77,77,0.3)", color: "#FF8A8A" }
            ),
          }}>
            {isWin ? t.win : t.loss}
          </span>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "20px" }}>
          {[
            { icon: Crosshair, label: t.accuracy, value: `${report.accuracy}%`, color: "#0F7A8A" },
            { icon: BarChart3, label: t.shotsPerShip, value: report.shotsPerShip, color: "#D4B78F" },
            { icon: Flame, label: t.aggression, value: `${report.aggressionScore}%`, color: "#E8C97F" },
            { icon: Trophy, label: t.pattern, value: report.pattern === "center" ? t.center : report.pattern === "edges" ? t.edges : t.balanced, color: "#A8B5C0" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} style={{
              background: "rgba(28,24,20,0.8)",
              border: "1px solid rgba(63,50,40,0.8)",
              borderRadius: "8px",
              padding: "12px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                <Icon style={{ width: "12px", height: "12px", color: "#9A8A68" }} />
                <span style={{ fontSize: "11px", fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.1em", color: "#9A8A68" }}>
                  {label}
                </span>
              </div>
              <p style={{ fontSize: "22px", fontWeight: 800, fontFamily: "monospace", color, lineHeight: 1 }}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Shot map heatmap */}
        {shotMarks && (
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <Target style={{ width: "13px", height: "13px", color: "#0F7A8A" }} />
              <p style={{ fontSize: "10px", fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.15em", color: "#B0A080" }}>
                {t.heatmap.toUpperCase()}
              </p>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(10, 1fr)",
              gap: "1px",
              background: "#3F3228",
              borderRadius: "6px",
              overflow: "hidden",
              width: "fit-content",
            }}>
              {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => {
                const x = i % BOARD_SIZE, y = Math.floor(i / BOARD_SIZE);
                const mark = shotMarks[y]?.[x];
                return (
                  <div key={i} style={{
                    width: "22px", height: "22px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "11px", fontWeight: 800, fontFamily: "monospace",
                    ...(mark === "hit" || mark === "sunk"
                      ? { background: "rgba(70,0,0,0.95)", color: "#FF8A8A", boxShadow: "inset 0 0 6px rgba(255,77,77,0.3)" }
                      : mark === "miss"
                        ? { background: "#090D14", color: "#A8B5C0" }
                        : { background: "#090D14", color: "transparent" }
                    ),
                  }}>
                    {(mark === "hit" || mark === "sunk") ? "×" : mark === "miss" ? "·" : ""}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Insights */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "20px" }}>
          {report.insights.map((insight, i) => (
            <div key={i} style={{
              padding: "8px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 500,
              lineHeight: 1.4,
              ...(insight.tone === "good"
                ? { background: "rgba(10,92,107,0.2)", border: "1px solid rgba(15,122,138,0.3)", color: "#7AC8D8" }
                : insight.tone === "warning"
                  ? { background: "rgba(139,34,34,0.2)", border: "1px solid rgba(255,77,77,0.25)", color: "#FF8A8A" }
                  : { background: "rgba(63,50,40,0.5)", border: "1px solid rgba(63,50,40,0.8)", color: "#D4B78F" }
              ),
            }}>
              {insight.text}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onPlayAgain}
          style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "12px 24px",
            background: "linear-gradient(135deg, #0A5C6B, #0F7A8A)",
            border: "none", borderRadius: "8px",
            color: "#F5EDE0",
            fontFamily: "monospace", fontWeight: 800, letterSpacing: "0.15em",
            fontSize: "12px", textTransform: "uppercase",
            cursor: "pointer",
            boxShadow: "0 0 16px rgba(15,122,138,0.4)",
          }}
        >
          <RotateCcw style={{ width: "14px", height: "14px" }} />
          {t.playAgain}
        </button>
      </section>
    </div>
  );
};
