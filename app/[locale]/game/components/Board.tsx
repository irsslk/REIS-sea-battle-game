"use client";

import React from "react";
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

const ROW_LABELS = ["A","B","C","D","E","F","G","H","I","J"];

const HitX = () => (
  <svg width="12" height="12" viewBox="0 0 12 12"
    style={{ filter: "drop-shadow(0 0 3px #FF4D4D) drop-shadow(0 0 7px rgba(255,77,77,0.7))" }}>
    <line x1="1.5" y1="1.5" x2="10.5" y2="10.5" stroke="#FF8A8A" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="10.5" y1="1.5" x2="1.5" y2="10.5" stroke="#FF8A8A" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

const SunkX = () => (
  <svg width="12" height="12" viewBox="0 0 12 12"
    style={{ filter: "drop-shadow(0 0 3px #FFAA00) drop-shadow(0 0 7px rgba(255,170,0,0.7))" }}>
    <line x1="1.5" y1="1.5" x2="10.5" y2="10.5" stroke="#FFD060" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="10.5" y1="1.5" x2="1.5" y2="10.5" stroke="#FFD060" strokeWidth="2.5" strokeLinecap="round"/>
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
    <section style={{
      background: "rgba(37,32,26,0.95)",
      border: "1px solid rgba(212,183,143,0.12)",
      borderRadius: "10px",
      overflow: "hidden",
      boxShadow: "inset 0 1px 0 rgba(212,183,143,0.07), 0 8px 32px rgba(0,0,0,0.6)",
      backdropFilter: "blur(8px)",
    }}>
      {/* Board header */}
      <div style={{
        padding: "7px 12px",
        borderBottom: "1px solid rgba(63,50,40,0.8)",
        background: "rgba(28,24,20,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "8px",
      }}>
        <h2 style={{
          fontSize: "12px",
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#D4B78F",
          fontFamily: "monospace",
          margin: 0,
        }}>
          {title}
        </h2>
        <div style={{
          width: "6px", height: "6px",
          borderRadius: "50%",
          background: interactive ? "#0F7A8A" : "#3F3228",
          boxShadow: interactive ? "0 0 6px #0F7A8A, 0 0 12px rgba(15,122,138,0.4)" : "none",
          flexShrink: 0,
        }} />
      </div>

      <div style={{ padding: "8px" }}>
        {/* 11×11 grid: 1 label col + 10 data cols, 1 label row + 10 data rows */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "14px repeat(10, 1fr)",
            gap: "1px",
            background: "#3F3228",
            borderRadius: "5px",
            overflow: "hidden",
          }}
        >
          {/* Corner cell */}
          <div style={{ background: "#1C1814", height: "13px" }} />

          {/* Column labels 1–10 */}
          {Array.from({ length: BOARD_SIZE }, (_, i) => (
            <div
              key={`col-${i}`}
              style={{
                background: "#1C1814",
                height: "13px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
                fontFamily: "monospace",
                fontWeight: 700,
                color: "#9A8A68",
                letterSpacing: "0.05em",
              }}
            >
              {i + 1}
            </div>
          ))}

          {/* Rows A–J */}
          {ROW_LABELS.map((letter, row) => (
            <React.Fragment key={row}>
              {/* Row label */}
              <div
                style={{
                  background: "#1C1814",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontFamily: "monospace",
                  fontWeight: 700,
                  color: "#9A8A68",
                }}
              >
                {letter}
              </div>

              {/* 10 game cells */}
              {Array.from({ length: BOARD_SIZE }, (_, col) => {
                const x = col, y = row;
                const key = coordKey({ x, y });
                const mark = marks[y][x];
                const meta = shipMap.get(key);
                const isHit  = mark === "hit";
                const isSunk = mark === "sunk";
                const isMiss = mark === "miss";
                const showShipBody = !!meta && !meta.isSunk;
                const score = heatByKey.get(key) ?? 0;
                const intensity = Math.min(1, score / maxHeat);

                // Cell background
                let bg = "#090D14";
                if (meta?.isSunk || isSunk) bg = "rgba(55,35,0,0.95)";
                else if (isHit)             bg = "rgba(65,0,0,0.95)";

                // Cell glow
                let shadow = "none";
                if (meta?.isSunk || isSunk) shadow = "0 0 8px rgba(255,170,0,0.5), inset 0 0 10px rgba(255,170,0,0.2)";
                else if (isHit)             shadow = "0 0 6px rgba(255,77,77,0.5), inset 0 0 8px rgba(255,77,77,0.2)";

                // Ship body shape styles
                let shipSpanStyle: React.CSSProperties | null = null;
                if (showShipBody && meta) {
                  const h = meta.isHorizontal;
                  const single = meta.size === 1;
                  shipSpanStyle = {
                    position: "absolute",
                    background: "linear-gradient(180deg, #1AAFBF 0%, #0F7A8A 35%, #0A5C6B 70%, #063D4A 100%)",
                    boxShadow: "inset 0 1px 0 rgba(26,175,191,0.45), inset 0 -1px 0 rgba(0,0,0,0.4)",
                    ...(single
                      ? { inset: "16%", borderRadius: "50%" }
                      : h ? {
                          top: "16%", bottom: "16%",
                          left:  meta.isStart ? "16%" : 0,
                          right: meta.isEnd   ? "16%" : 0,
                          borderRadius:
                            meta.isStart && meta.isEnd ? "50%" :
                            meta.isStart ? "50% 0 0 50%" :
                            meta.isEnd   ? "0 50% 50% 0" : 0,
                        }
                      : {
                          left: "16%", right: "16%",
                          top:    meta.isStart ? "16%" : 0,
                          bottom: meta.isEnd   ? "16%" : 0,
                          borderRadius:
                            meta.isStart && meta.isEnd ? "50%" :
                            meta.isStart ? "50% 50% 0 0" :
                            meta.isEnd   ? "0 0 50% 50%" : 0,
                        }
                    ),
                  };
                }

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onCellClick?.({ x, y })}
                    onDragOver={(e) => { if (onCellDrop) e.preventDefault(); }}
                    onDrop={(e) => { if (onCellDrop) { e.preventDefault(); onCellDrop({ x, y }); } }}
                    style={{
                      position: "relative",
                      aspectRatio: "1",
                      background: bg,
                      boxShadow: shadow,
                      cursor: interactive ? "crosshair" : "default",
                      border: "none",
                      padding: 0,
                      transition: "box-shadow 0.1s",
                    }}
                    onMouseEnter={(e) => {
                      if (interactive && mark === "unknown") {
                        (e.currentTarget as HTMLElement).style.boxShadow = "inset 0 0 0 1px rgba(15,122,138,0.6)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (interactive) {
                        (e.currentTarget as HTMLElement).style.boxShadow = shadow;
                      }
                    }}
                  >
                    {/* Ship body strip */}
                    {shipSpanStyle && <span style={shipSpanStyle} />}

                    {/* Heatmap overlay */}
                    {mark === "unknown" && score > 0 && (
                      <span style={{
                        position: "absolute", inset: 0,
                        background: `rgba(${Math.round(10 + 230 * intensity)}, ${Math.round(122 * (1 - intensity) + 30 * intensity)}, ${Math.round(138 * (1 - intensity) + 20 * intensity)}, ${0.12 + 0.55 * intensity})`,
                      }} />
                    )}

                    {/* Miss: muted dot */}
                    {isMiss && (
                      <span style={{
                        position: "absolute", inset: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <span style={{
                          width: "5px", height: "5px",
                          borderRadius: "50%",
                          background: "rgba(168,181,192,0.45)",
                          boxShadow: "0 0 4px rgba(168,181,192,0.25)",
                        }} />
                      </span>
                    )}

                    {/* Hit / Sunk X with spring animation */}
                    <AnimatePresence>
                      {(isHit || isSunk) && (
                        <motion.span
                          key="hitmark"
                          initial={{ scale: 0.1, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 600, damping: 22 }}
                          style={{
                            position: "absolute", inset: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            zIndex: 10,
                          }}
                        >
                          {isSunk ? <SunkX /> : <HitX />}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
};
