export const BOARD_SIZE = 10;

export type ShipKind = "tengri" | "berkut" | "zhalau" | "sunkar";
export type Orientation = "horizontal" | "vertical";
export type CellMark = "unknown" | "miss" | "hit" | "sunk";
export type ShotResult = "miss" | "hit" | "sunk" | "repeat";
export type GamePhase = "placement" | "battle" | "game-over";
export type BotLevel = "easy" | "medium" | "hard";

export interface Coord {
  x: number;
  y: number;
}

export interface ShipDefinition {
  kind: ShipKind;
  name: string;
  size: number;
  count: number;
}

export interface PlacedShip {
  instanceId: string;
  kind: ShipKind;
  name: string;
  size: number;
  cells: Coord[];
  hitKeys: string[];
}

export interface ShotOutcome {
  result: ShotResult;
  shipId?: string;
  sunkCells?: Coord[];
}

export const SHIP_SET: ShipDefinition[] = [
  { kind: "tengri", name: "Тенгри", size: 4, count: 1 },
  { kind: "berkut", name: "Беркут", size: 3, count: 2 },
  { kind: "zhalau", name: "Жалау", size: 2, count: 3 },
  { kind: "sunkar", name: "Сункар", size: 1, count: 4 },
];

export const createCellMatrix = <T>(factory: (coord: Coord) => T): T[][] =>
  Array.from({ length: BOARD_SIZE }, (_, y) =>
    Array.from({ length: BOARD_SIZE }, (_, x) => factory({ x, y })),
  );

export const createEmptyMarks = (): CellMark[][] => createCellMatrix(() => "unknown");

export const coordKey = ({ x, y }: Coord): string => `${x}:${y}`;

export const isInsideBoard = ({ x, y }: Coord): boolean =>
  x >= 0 && y >= 0 && x < BOARD_SIZE && y < BOARD_SIZE;

export const getShipCells = (start: Coord, size: number, orientation: Orientation): Coord[] =>
  Array.from({ length: size }, (_, index) =>
    orientation === "horizontal"
      ? { x: start.x + index, y: start.y }
      : { x: start.x, y: start.y + index },
  );

const getNeighborCells = (coord: Coord): Coord[] =>
  Array.from({ length: 9 }, (_, i) => {
    const dx = (i % 3) - 1;
    const dy = Math.floor(i / 3) - 1;
    return { x: coord.x + dx, y: coord.y + dy };
  }).filter(isInsideBoard);

export const canPlaceShip = (ships: PlacedShip[], candidateCells: Coord[], ignoreShipId?: string): boolean => {
  if (!candidateCells.every(isInsideBoard)) {
    return false;
  }

  const candidateSet = new Set(candidateCells.map(coordKey));
  const blocked = new Set<string>();

  for (const ship of ships) {
    if (ignoreShipId && ship.instanceId === ignoreShipId) {
      continue;
    }
    for (const cell of ship.cells) {
      blocked.add(coordKey(cell));
      for (const neighbor of getNeighborCells(cell)) {
        blocked.add(coordKey(neighbor));
      }
    }
  }

  for (const key of candidateSet) {
    if (blocked.has(key)) {
      return false;
    }
  }

  return true;
};

export const buildFleetInstances = (): Array<Omit<PlacedShip, "cells" | "hitKeys">> => {
  const instances: Array<Omit<PlacedShip, "cells" | "hitKeys">> = [];

  for (const ship of SHIP_SET) {
    for (let i = 1; i <= ship.count; i += 1) {
      instances.push({
        instanceId: `${ship.kind}-${i}`,
        kind: ship.kind,
        name: ship.name,
        size: ship.size,
      });
    }
  }

  return instances;
};

export const autoPlaceFleet = (): PlacedShip[] => {
  const placedShips: PlacedShip[] = [];
  const instances = buildFleetInstances();

  for (const instance of instances) {
    let placed = false;
    let attempts = 0;

    while (!placed && attempts < 500) {
      attempts += 1;
      const orientation: Orientation = Math.random() > 0.5 ? "horizontal" : "vertical";
      const x = Math.floor(Math.random() * BOARD_SIZE);
      const y = Math.floor(Math.random() * BOARD_SIZE);
      const cells = getShipCells({ x, y }, instance.size, orientation);

      if (canPlaceShip(placedShips, cells)) {
        placedShips.push({
          ...instance,
          cells,
          hitKeys: [],
        });
        placed = true;
      }
    }
  }

  return placedShips;
};

export const applyShot = (ships: PlacedShip[], target: Coord, shotKeys: Set<string>): ShotOutcome => {
  const key = coordKey(target);
  if (shotKeys.has(key)) {
    return { result: "repeat" };
  }

  for (const ship of ships) {
    const hasCell = ship.cells.some((cell) => coordKey(cell) === key);
    if (!hasCell) {
      continue;
    }

    if (!ship.hitKeys.includes(key)) {
      ship.hitKeys.push(key);
    }

    const sunk = ship.hitKeys.length >= ship.size;
    return sunk
      ? { result: "sunk", shipId: ship.instanceId, sunkCells: ship.cells }
      : { result: "hit", shipId: ship.instanceId };
  }

  return { result: "miss" };
};

export const areAllShipsSunk = (ships: PlacedShip[]): boolean =>
  ships.every((ship) => ship.hitKeys.length >= ship.size);
