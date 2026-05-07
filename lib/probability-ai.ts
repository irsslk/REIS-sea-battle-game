import {
  BOARD_SIZE,
  BotLevel,
  CellMark,
  Coord,
  Orientation,
  SHIP_SET,
  ShipKind,
  coordKey,
  getShipCells,
  isInsideBoard,
} from "@/lib/game-logic";

export type HeatmapCell = { x: number; y: number; score: number };

export interface BotDecisionInput {
  level: BotLevel;
  marks: CellMark[][];
  remainingShips: ShipKind[];
}

const shipSizeMap: Record<ShipKind, number> = SHIP_SET.reduce(
  (acc, ship) => ({ ...acc, [ship.kind]: ship.size }),
  {} as Record<ShipKind, number>,
);

const allUnknownCells = (marks: CellMark[][]): Coord[] => {
  const output: Coord[] = [];
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      if (marks[y][x] === "unknown") {
        output.push({ x, y });
      }
    }
  }
  return output;
};

const activeHits = (marks: CellMark[][]): Set<string> => {
  const hits = new Set<string>();
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      if (marks[y][x] === "hit") {
        hits.add(coordKey({ x, y }));
      }
    }
  }
  return hits;
};

const unresolvedHitCoords = (marks: CellMark[][]): Coord[] => {
  const output: Coord[] = [];
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      if (marks[y][x] === "hit") {
        output.push({ x, y });
      }
    }
  }
  return output;
};

const isPlacementCompatible = (marks: CellMark[][], cells: Coord[], hitSet: Set<string>): boolean => {
  const cellKeys = new Set(cells.map(coordKey));

  for (const cell of cells) {
    const mark = marks[cell.y][cell.x];
    if (mark === "miss" || mark === "sunk") {
      return false;
    }
  }

  for (const hitKey of hitSet) {
    if (!cellKeys.has(hitKey)) {
      return false;
    }
  }

  return true;
};

export const buildProbabilityHeatmap = (marks: CellMark[][], remainingShips: ShipKind[]): HeatmapCell[] => {
  const scoreMap = new Map<string, number>();
  const hitSet = activeHits(marks);
  const unresolvedHits = unresolvedHitCoords(marks);

  for (const kind of remainingShips) {
    const size = shipSizeMap[kind];
    (["horizontal", "vertical"] as Orientation[]).forEach((orientation) => {
      for (let y = 0; y < BOARD_SIZE; y += 1) {
        for (let x = 0; x < BOARD_SIZE; x += 1) {
          const cells = getShipCells({ x, y }, size, orientation);
          if (!cells.every(isInsideBoard)) {
            continue;
          }
          if (!isPlacementCompatible(marks, cells, hitSet)) {
            continue;
          }
          for (const cell of cells) {
            const key = coordKey(cell);
            if (marks[cell.y][cell.x] !== "unknown") {
              continue;
            }
            scoreMap.set(key, (scoreMap.get(key) ?? 0) + 1);
          }
        }
      }
    });
  }

  if (unresolvedHits.length > 0) {
    for (const hit of unresolvedHits) {
      const neighbors: Coord[] = [
        { x: hit.x + 1, y: hit.y },
        { x: hit.x - 1, y: hit.y },
        { x: hit.x, y: hit.y + 1 },
        { x: hit.x, y: hit.y - 1 },
      ].filter(isInsideBoard);
      for (const cell of neighbors) {
        if (marks[cell.y][cell.x] !== "unknown") {
          continue;
        }
        const key = coordKey(cell);
        scoreMap.set(key, (scoreMap.get(key) ?? 0) + 6);
      }
    }
  }

  return allUnknownCells(marks).map((coord) => ({
    ...coord,
    score: scoreMap.get(coordKey(coord)) ?? 0,
  }));
};

const pickRandom = (cells: Coord[]): Coord => cells[Math.floor(Math.random() * cells.length)];

const pickWeighted = (cells: HeatmapCell[]): Coord => {
  const total = cells.reduce((sum, cell) => sum + Math.max(1, cell.score), 0);
  let threshold = Math.random() * total;
  for (const cell of cells) {
    threshold -= Math.max(1, cell.score);
    if (threshold <= 0) {
      return { x: cell.x, y: cell.y };
    }
  }
  return { x: cells[0].x, y: cells[0].y };
};

export const chooseBotShot = ({ level, marks, remainingShips }: BotDecisionInput): Coord => {
  const unknown = allUnknownCells(marks);
  if (unknown.length === 0) {
    return { x: 0, y: 0 };
  }
  const heatmap = buildProbabilityHeatmap(marks, remainingShips).sort((a, b) => b.score - a.score);

  if (heatmap.length === 0) {
    return pickRandom(unknown);
  }

  if (level === "easy") {
    if (Math.random() < 0.72) {
      return pickRandom(unknown);
    }
    return pickWeighted(heatmap);
  }

  if (level === "medium") {
    const top = heatmap.slice(0, Math.max(10, Math.floor(heatmap.length * 0.3)));
    return pickWeighted(top);
  }

  const maxScore = heatmap[0].score;
  const bestCells = heatmap.filter((cell) => cell.score === maxScore);
  return pickRandom(bestCells.map((cell) => ({ x: cell.x, y: cell.y })));
};
