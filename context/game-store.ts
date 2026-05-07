"use client";

import { create } from "zustand";

import {
  BotLevel,
  CellMark,
  Coord,
  GamePhase,
  Orientation,
  PlacedShip,
  ShipKind,
  ShotResult,
  areAllShipsSunk,
  applyShot,
  autoPlaceFleet,
  buildFleetInstances,
  canPlaceShip,
  coordKey,
  createEmptyMarks,
  getShipCells,
} from "@/lib/game-logic";
import { analyzeMatch, CoachReport } from "@/lib/coach-analysis";
import { defaultLocale, Locale } from "@/lib/i18n";
import { chooseBotShot } from "@/lib/probability-ai";

interface FireLogEntry {
  by: "player" | "bot";
  coord: Coord;
  result: Exclude<ShotResult, "repeat">;
}

interface FleetShip extends PlacedShip {
  isPlaced: boolean;
}

interface GameStore {
  phase: GamePhase;
  botLevel: BotLevel;
  orientation: Orientation;
  playerTurn: boolean;
  winner: "player" | "bot" | null;
  locale: Locale;
  coachReport: CoachReport | null;
  ships: FleetShip[];
  playerShots: CellMark[][];
  botShots: CellMark[][];
  log: FireLogEntry[];
  turnNumber: number;
  isBotThinking: boolean;
  setBotLevel: (level: BotLevel) => void;
  setLocale: (locale: Locale) => void;
  toggleOrientation: () => void;
  placeShip: (shipId: string, start: Coord) => boolean;
  autoPlacePlayerFleet: () => void;
  startBattle: () => void;
  resetGame: () => void;
  fireAtBot: (target: Coord) => void;
  botTurn: () => void;
}

const initializeShips = (): FleetShip[] =>
  buildFleetInstances().map((ship) => ({
    ...ship,
    cells: [],
    hitKeys: [],
    isPlaced: false,
  }));

const placeMark = (grid: CellMark[][], coord: Coord, mark: CellMark): CellMark[][] =>
  grid.map((row, y) => row.map((cell, x) => (x === coord.x && y === coord.y ? mark : cell)));

const placeManyMarks = (grid: CellMark[][], coords: Coord[], mark: CellMark): CellMark[][] => {
  const keys = new Set(coords.map(coordKey));
  return grid.map((row, y) =>
    row.map((cell, x) => {
      if (!keys.has(coordKey({ x, y }))) {
        return cell;
      }
      return mark;
    }),
  );
};

const remainingShipKinds = (fleet: FleetShip[]): ShipKind[] => {
  const remaining: ShipKind[] = [];
  for (const ship of fleet) {
    if (ship.hitKeys.length < ship.size) {
      remaining.push(ship.kind);
    }
  }
  return remaining;
};

export const useGameStore = create<GameStore>((set, get) => ({
  phase: "placement",
  botLevel: "medium",
  orientation: "horizontal",
  playerTurn: true,
  winner: null,
  locale: defaultLocale,
  coachReport: null,
  ships: initializeShips(),
  playerShots: createEmptyMarks(),
  botShots: createEmptyMarks(),
  log: [],
  turnNumber: 0,
  isBotThinking: false,

  setBotLevel: (level) => set({ botLevel: level }),
  setLocale: (locale) => set({ locale }),

  toggleOrientation: () =>
    set((state) => ({
      orientation: state.orientation === "horizontal" ? "vertical" : "horizontal",
    })),

  placeShip: (shipId, start) => {
    const state = get();
    if (state.phase !== "placement") {
      return false;
    }

    const targetShip = state.ships.find((ship) => ship.instanceId === shipId);
    if (!targetShip) {
      return false;
    }

    const candidateCells = getShipCells(start, targetShip.size, state.orientation);
    const placedShips = state.ships.filter((ship) => ship.isPlaced);

    const valid = canPlaceShip(placedShips, candidateCells, shipId);
    if (!valid) {
      return false;
    }

    set((current) => ({
      ships: current.ships.map((ship) =>
        ship.instanceId === shipId ? { ...ship, cells: candidateCells, isPlaced: true } : ship,
      ),
    }));
    return true;
  },

  autoPlacePlayerFleet: () => {
    const randomized = autoPlaceFleet();
    set((state) => ({
      ships: state.ships.map((ship) => {
        const found = randomized.find((item) => item.instanceId === ship.instanceId);
        if (!found) {
          return ship;
        }
        return { ...ship, cells: found.cells, hitKeys: [], isPlaced: true };
      }),
    }));
  },

  startBattle: () => {
    const state = get();
    const allPlaced = state.ships.every((ship) => ship.isPlaced);
    if (!allPlaced || state.phase !== "placement") {
      return;
    }

    const botFleet = autoPlaceFleet().map((ship) => ({
      ...ship,
      instanceId: `bot-${ship.instanceId}`,
      isPlaced: true,
    }));

    set({
      phase: "battle",
      playerTurn: true,
      winner: null,
      coachReport: null,
      botShots: createEmptyMarks(),
      playerShots: createEmptyMarks(),
      log: [],
      turnNumber: 0,
      ships: [...state.ships, ...botFleet],
    });
  },

  resetGame: () =>
    set({
      phase: "placement",
      winner: null,
      coachReport: null,
      playerTurn: true,
      orientation: "horizontal",
      ships: initializeShips(),
      botShots: createEmptyMarks(),
      playerShots: createEmptyMarks(),
      log: [],
      turnNumber: 0,
      isBotThinking: false,
    }),

  fireAtBot: (target) => {
    const state = get();
    if (state.phase !== "battle" || !state.playerTurn || state.winner) {
      return;
    }
    if (state.botShots[target.y][target.x] !== "unknown") {
      return;
    }

    const playerFleet = state.ships.filter((ship) => !ship.instanceId.startsWith("bot-"));
    const botFleet = state.ships.filter((ship) => ship.instanceId.startsWith("bot-"));
    const shotKeys = new Set<string>();
    for (let y = 0; y < 10; y += 1) {
      for (let x = 0; x < 10; x += 1) {
        if (state.botShots[y][x] !== "unknown") {
          shotKeys.add(coordKey({ x, y }));
        }
      }
    }

    const outcome = applyShot(botFleet, target, shotKeys);
    if (outcome.result === "repeat") {
      return;
    }

    let nextBotShots = state.botShots;
    if (outcome.result === "miss") {
      nextBotShots = placeMark(nextBotShots, target, "miss");
    }
    if (outcome.result === "hit") {
      nextBotShots = placeMark(nextBotShots, target, "hit");
    }
    if (outcome.result === "sunk" && outcome.sunkCells) {
      nextBotShots = placeManyMarks(nextBotShots, outcome.sunkCells, "sunk");
    }

    const botDead = areAllShipsSunk(botFleet);
    const winner = botDead ? "player" : null;
    const coachReport =
      botDead && winner
        ? analyzeMatch({
            locale: state.locale,
            winner,
            log: [...state.log, { by: "player", coord: target, result: outcome.result }],
            playerFleet,
            enemyFleet: botFleet,
          })
        : null;
    set({
      ships: [...playerFleet, ...botFleet],
      botShots: nextBotShots,
      playerTurn: outcome.result === "miss" ? false : true,
      phase: botDead ? "game-over" : "battle",
      winner,
      coachReport,
      turnNumber: state.turnNumber + 1,
      log: [...state.log, { by: "player", coord: target, result: outcome.result }],
    });
  },

  botTurn: () => {
    const state = get();
    if (state.phase !== "battle" || state.playerTurn || state.winner) {
      return;
    }

    set({ isBotThinking: true });

    let mutable = get();
    let keepShooting = true;

    while (keepShooting) {
      const playerFleet = mutable.ships.filter((ship) => !ship.instanceId.startsWith("bot-"));
      const botFleet = mutable.ships.filter((ship) => ship.instanceId.startsWith("bot-"));
      const remaining = remainingShipKinds(playerFleet);
      const target = chooseBotShot({
        level: mutable.botLevel,
        marks: mutable.playerShots,
        remainingShips: remaining,
      });

      const shotKeys = new Set<string>();
      for (let y = 0; y < 10; y += 1) {
        for (let x = 0; x < 10; x += 1) {
          if (mutable.playerShots[y][x] !== "unknown") {
            shotKeys.add(coordKey({ x, y }));
          }
        }
      }

      const outcome = applyShot(playerFleet, target, shotKeys);
      if (outcome.result === "repeat") {
        keepShooting = false;
        continue;
      }

      let nextPlayerShots = mutable.playerShots;
      if (outcome.result === "miss") {
        nextPlayerShots = placeMark(nextPlayerShots, target, "miss");
      }
      if (outcome.result === "hit") {
        nextPlayerShots = placeMark(nextPlayerShots, target, "hit");
      }
      if (outcome.result === "sunk" && outcome.sunkCells) {
        nextPlayerShots = placeManyMarks(nextPlayerShots, outcome.sunkCells, "sunk");
      }

      const playerDead = areAllShipsSunk(playerFleet);
      const winner = playerDead ? "bot" : null;
      const nextLog = [...mutable.log, { by: "bot" as const, coord: target, result: outcome.result as "miss" | "hit" | "sunk" }];
      mutable = {
        ...mutable,
        ships: [...playerFleet, ...botFleet],
        playerShots: nextPlayerShots,
        phase: playerDead ? "game-over" : "battle",
        winner,
        coachReport:
          playerDead && winner
            ? analyzeMatch({
                locale: mutable.locale,
                winner,
                log: nextLog,
                playerFleet,
                enemyFleet: botFleet,
              })
            : mutable.coachReport,
        turnNumber: mutable.turnNumber + 1,
        playerTurn: outcome.result === "miss",
        log: nextLog,
      };

      keepShooting = !mutable.playerTurn && mutable.phase === "battle";
    }

    set({ ...mutable, isBotThinking: false });
  },
}));
