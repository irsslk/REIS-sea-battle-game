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

const toneClass = {
  good:    "border-[#6B8B2B]/40 bg-[#6B8B2B]/10 text-[#3A5A0E]",
  neutral: "border-[#8B6B2B]/40 bg-[#8B6B2B]/10 text-[#5A3A0E]",
  warning: "border-[#8B2B2B]/40 bg-[#8B2B2B]/10 text-[#5A0E0E]",
} as const;

const labels = {
  en: { heading: "Post-match breakdown", playAgain: "Play again", accuracy: "Accuracy", shotsPerShip: "Shots/ship", aggression: "Aggression", pattern: "Pattern", win: "VICTORY", loss: "DEFEAT", center: "Center heavy", edges: "Edge heavy", balanced: "Balanced", heatmap: "Shot map" },
  ru: { heading: "Разбор матча", playAgain: "Играть снова", accuracy: "Точность", shotsPerShip: "Выстрелов/корабль", aggression: "Агрессия", pattern: "Паттерн", win: "ПОБЕДА", loss: "ПОРАЖЕНИЕ", center: "Центр", edges: "Края", balanced: "Сбалансирован", heatmap: "Карта выстрелов" },
  kk: { heading: "Матч талдауы", playAgain: "Қайта ойнау", accuracy: "Дәлдік", shotsPerShip: "Кемеге атулар", aggression: "Агрессия", pattern: "Паттерн", win: "ЖЕҢІС", loss: "ЖЕҢІЛІС", center: "Орталық", edges: "Шет", balanced: "Теңгерімді", heatmap: "Ату картасы" },
} as const;

export const PostGameCoach = ({ locale, report, shotMarks, onPlayAgain }: PostGameCoachProps) => {
  const t = labels[locale];

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-[#2C1A0E]/70 p-4 backdrop-blur-sm">
      <section className="w-full max-w-4xl rounded-3xl border border-[#C9AA88] bg-[#F0E6D8] p-6 shadow-2xl overflow-y-auto max-h-[90vh]">

        {/* Header */}
        <header className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9E7B5A]">AI Coach</p>
            <h2 className="text-2xl font-extrabold text-[#2C1A0E]">{t.heading}</h2>
          </div>
          <span className={`rounded-full px-4 py-1.5 text-sm font-bold ${
            report.winLoss === "win"
              ? "bg-[#6B8B2B] text-white"
              : "bg-[#8B2B2B] text-white"
          }`}>
            {report.winLoss === "win" ? t.win : t.loss}
          </span>
        </header>

        {/* Stats grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Crosshair, label: t.accuracy, value: `${report.accuracy}%`, color: "text-[#6B8B2B]" },
            { icon: BarChart3, label: t.shotsPerShip, value: report.shotsPerShip, color: "text-[#2B5A8B]" },
            { icon: Flame, label: t.aggression, value: `${report.aggressionScore}%`, color: "text-[#8B5A2B]" },
            { icon: Trophy, label: t.pattern, value: report.pattern === "center" ? t.center : report.pattern === "edges" ? t.edges : t.balanced, color: "text-[#5A2B8B]" },
          ].map(({ icon: Icon, label, value, color }) => (
            <article key={label} className="rounded-xl border border-[#C9AA88] bg-[#F8F1E9] p-3">
              <div className="mb-1.5 flex items-center gap-2 text-[#8B6B4A]">
                <Icon className="h-4 w-4" />
                <span className="text-xs font-semibold">{label}</span>
              </div>
              <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
            </article>
          ))}
        </div>

        {/* Shot heatmap */}
        {shotMarks && (
          <div className="mt-5">
            <div className="mb-2 flex items-center gap-2 text-[#5A3A1A]">
              <Target className="h-4 w-4 text-[#8B5A2B]" />
              <p className="text-sm font-bold">{t.heatmap}</p>
              <span className="text-xs text-[#9E7B5A]">— красный = попадание, голубой = промах</span>
            </div>
            <div
              className="grid grid-cols-10 rounded-xl overflow-hidden w-fit"
              style={{ gap: "1px", background: "#C9AA88" }}
            >
              {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => {
                const x = i % BOARD_SIZE;
                const y = Math.floor(i / BOARD_SIZE);
                const mark = shotMarks[y]?.[x];
                return (
                  <div
                    key={i}
                    className={`h-6 w-6 flex items-center justify-center text-[10px] font-bold ${
                      mark === "hit" || mark === "sunk"
                        ? "bg-[#CC2222] text-white"
                        : mark === "miss"
                          ? "bg-[#A8C8E0]"
                          : "bg-[#D8EBF8]"
                    }`}
                  >
                    {(mark === "hit" || mark === "sunk") ? "×" : ""}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Insights */}
        <div className="mt-5 space-y-2">
          {report.insights.map((insight, i) => (
            <div key={i} className={`rounded-xl border px-3 py-2 text-sm font-medium ${toneClass[insight.tone]}`}>
              {insight.text}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onPlayAgain}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#8B5A2B] px-6 py-2.5 font-bold text-[#F5EDE4] transition hover:bg-[#6B4020]"
        >
          <RotateCcw className="h-4 w-4" />
          {t.playAgain}
        </button>
      </section>
    </div>
  );
};
