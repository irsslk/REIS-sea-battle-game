"use client";

import { HeatmapCell } from "@/lib/probability-ai";
import { BotLevel } from "@/lib/game-logic";

interface AICoachPanelProps {
  botLevel: BotLevel;
  playerAimHeatmap: HeatmapCell[];
  botAimHeatmap: HeatmapCell[];
}

const HeatmapMini = ({ title, data }: { title: string; data: HeatmapCell[] }) => {
  const scoreByCell = new Map(data.map((cell) => [`${cell.x}:${cell.y}`, cell.score]));
  const maxScore = Math.max(1, ...data.map((cell) => cell.score));

  return (
    <div className="rounded-xl border border-white/10 bg-[#0a2444]/70 p-3">
      <h3 className="mb-2 text-xs font-semibold text-slate-100">{title}</h3>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 100 }, (_, index) => {
          const x = index % 10;
          const y = Math.floor(index / 10);
          const score = scoreByCell.get(`${x}:${y}`) ?? 0;
          const intensity = Math.min(1, score / maxScore);
          return (
            <span
              key={`${x}-${y}`}
              className="aspect-square rounded-[4px] border border-white/5"
              style={{
                backgroundColor:
                  score === 0
                    ? "rgba(19,43,71,0.45)"
                    : `rgba(${Math.round(255 * intensity)}, ${Math.round(60 * (1 - intensity))}, ${
                        255 - Math.round(130 * intensity)
                      }, ${0.15 + 0.8 * intensity})`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export const AICoachPanel = ({ botLevel, playerAimHeatmap, botAimHeatmap }: AICoachPanelProps) => {
  return (
    <aside className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-100">AI Coach / Probability Map</h2>
        <span className="rounded-full bg-amber-300 px-2 py-0.5 text-xs font-semibold text-slate-900">
          {botLevel.toUpperCase()}
        </span>
      </div>
      <p className="mb-3 text-xs text-slate-300">
        Синий цвет = низкая вероятность, красный = максимальная вероятность корабля.
      </p>
      <div className="space-y-3">
        <HeatmapMini title="Ваш прицел по врагу" data={playerAimHeatmap} />
        <HeatmapMini title="Прицел бота по вашей доске" data={botAimHeatmap} />
      </div>
    </aside>
  );
};
