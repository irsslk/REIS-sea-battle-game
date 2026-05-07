"use client";

import { AnimatePresence, motion } from "framer-motion";

import { BOARD_SIZE, CellMark, Coord, PlacedShip, coordKey } from "@/lib/game-logic";
import { HeatmapCell } from "@/lib/probability-ai";

interface BoardProps {
  title: string;
  marks: CellMark[][];
  ships?: PlacedShip[];
  interactive?: boolean;
  revealShips?: boolean;
  heatmap?: HeatmapCell[];
  onCellClick?: (coord: Coord) => void;
  onCellDrop?: (coord: Coord) => void;
}

type ShipCellMeta = {
  isStart: boolean;
  isEnd: boolean;
  isHorizontal: boolean;
  isSunk: boolean;
  size: number;
};

const HitX = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" className="absolute inset-0 m-auto z-10">
    <line x1="2" y1="2" x2="11" y2="11" stroke="#CC1111" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="11" y1="2" x2="2" y2="11" stroke="#CC1111" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const Board = ({
  title,
  marks,
  ships = [],
  interactive = false,
  revealShips = false,
  heatmap = [],
  onCellClick,
  onCellDrop,
}: BoardProps) => {
  // Build ship cell metadata map
  const shipMap = new Map<string, ShipCellMeta>();
  for (const ship of ships) {
    if (!revealShips) continue;
    const horizontal = ship.cells.length <= 1 || ship.cells[0].y === ship.cells[1].y;
    const isSunk = ship.hitKeys.length === ship.size;
    ship.cells.forEach((cell, i) => {
      shipMap.set(coordKey(cell), {
        isStart: i === 0,
        isEnd: i === ship.cells.length - 1,
        isHorizontal: horizontal,
        isSunk,
        size: ship.size,
      });
    });
  }

  const heatByKey = new Map(heatmap.map((c) => [coordKey(c), c.score]));
  const maxHeat = Math.max(1, ...heatmap.map((c) => c.score));

  return (
    <section className="rounded-2xl border border-[#C9AA88] bg-[#F0E6D8] p-3 shadow-md">
      <h2 className="mb-2 text-sm font-bold text-[#5A3A1A]">{title}</h2>

      {/* Parchment board: bg acts as 1px gap between cells */}
      <div
        className="grid grid-cols-10 rounded-xl overflow-hidden"
        style={{ gap: "1px", background: "#8AAFC4" }}
      >
        {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, idx) => {
          const x = idx % BOARD_SIZE;
          const y = Math.floor(idx / BOARD_SIZE);
          const coord = { x, y };
          const key = coordKey(coord);
          const mark = marks[y][x];
          const meta = shipMap.get(key);
          const isHit = mark === "hit" || mark === "sunk";
          const isMiss = mark === "miss";
          const score = heatByKey.get(key) ?? 0;
          const intensity = Math.min(1, score / maxHeat);

          // Cell base background
          let cellBg = "bg-[#C8E0F0]"; // sea blue — default
          if (meta) {
            cellBg = meta.isSunk ? "bg-[#B03030]" : "bg-[#2C4A7A]";
          }
          if (isHit && !meta) cellBg = "bg-[#C8E0F0]"; // enemy hit cell, no ship shown

          // Ship body shape (inner positioned span, horizontal ship = narrow strip, vertical = tall strip)
          const showShipBody = !!meta && !meta.isSunk;
          let shipRounding = "";
          if (showShipBody) {
            if (meta.size === 1) {
              shipRounding = "rounded-full inset-[4px]";
            } else if (meta.isHorizontal) {
              shipRounding = [
                "inset-y-[4px]",
                meta.isStart ? "left-[4px] right-0 rounded-l-full" : "",
                meta.isEnd ? "right-[4px] left-0 rounded-r-full" : "",
                !meta.isStart && !meta.isEnd ? "inset-x-0" : "",
              ].join(" ");
            } else {
              shipRounding = [
                "inset-x-[4px]",
                meta.isStart ? "top-[4px] bottom-0 rounded-t-full" : "",
                meta.isEnd ? "bottom-[4px] top-0 rounded-b-full" : "",
                !meta.isStart && !meta.isEnd ? "inset-y-0" : "",
              ].join(" ");
            }
          }

          return (
            <button
              key={key}
              type="button"
              onClick={() => onCellClick?.(coord)}
              onDragOver={(e) => { if (onCellDrop) e.preventDefault(); }}
              onDrop={(e) => { if (onCellDrop) { e.preventDefault(); onCellDrop(coord); } }}
              className={`relative aspect-square ${cellBg} ${interactive ? "cursor-pointer hover:brightness-90" : "cursor-default"}`}
            >
              {/* Ship body strip (own ships, not yet sunk) */}
              {showShipBody && (
                <span
                  className={`absolute bg-gradient-to-b from-[#4A6FA5] to-[#2C4A7A] ${shipRounding}`}
                />
              )}

              {/* Heatmap overlay */}
              {mark === "unknown" && score > 0 && (
                <span
                  className="absolute inset-0"
                  style={{
                    background: `rgba(${Math.round(220 * intensity)}, ${Math.round(80 * (1 - intensity))}, 20, ${0.15 + 0.65 * intensity})`,
                  }}
                />
              )}

              {/* Miss: white ripple dot */}
              {isMiss && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="h-2.5 w-2.5 rounded-full bg-white/80 shadow-sm" />
                </span>
              )}

              {/* Hit / Sunk: red X */}
              <AnimatePresence>
                {isHit && (
                  <motion.span
                    key="hitx"
                    initial={{ scale: 0.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <HitX />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>
    </section>
  );
};
