import { Locale } from "@/lib/i18n";
import { Coord, ShipKind } from "@/lib/game-logic";

export interface CoachLogEntry {
  by: "player" | "bot";
  coord: Coord;
  result: "miss" | "hit" | "sunk";
}

export interface CoachFleetShip {
  kind: ShipKind;
  cells: Coord[];
}

export interface CoachAnalysisInput {
  locale: Locale;
  winner: "player" | "bot";
  log: CoachLogEntry[];
  playerFleet: CoachFleetShip[];
  enemyFleet: CoachFleetShip[];
}

export interface CoachInsight {
  tone: "good" | "neutral" | "warning";
  text: string;
}

export interface CoachReport {
  accuracy: number;
  shotsPerShip: number;
  winLoss: "win" | "loss";
  aggressionScore: number;
  pattern: "center" | "edges" | "balanced";
  insights: CoachInsight[];
}

const tr = {
  en: {
    randomShotWarning: "You fired too many random cells. Use the probability heatmap more consistently.",
    lineFinishGood: "Great line finishing after a hit. This is one of your strongest tactical habits.",
    cornerPredictable: "Your ship placement looked predictable near corners. Mix center and edge lanes more often.",
    highAccuracy: (v: number) => `Accuracy ${v}% — above average.`,
    lowAccuracy: (v: number) => `Accuracy ${v}% is below target. Focus on pattern search before chasing.`,
    centerPattern: "You over-focused center cells. Spread opening shots wider.",
    edgePattern: "You over-focused edge cells. Switch to mixed center-edge probing.",
  },
  ru: {
    randomShotWarning: "Ты слишком часто стрелял в случайные клетки. Лучше чаще использовать probability heatmap.",
    lineFinishGood: "Отлично добивал корабли по линиям — это сильная сторона.",
    cornerPredictable: "Твоя расстановка была предсказуемой в углах. Рекомендация: чаще используй центр и края.",
    highAccuracy: (v: number) => `Точность ${v}% — выше среднего.`,
    lowAccuracy: (v: number) => `Точность ${v}% ниже целевой. Сначала ищи паттерн, потом добивай.`,
    centerPattern: "Ты слишком часто стрелял в центр. Расширяй стартовый охват.",
    edgePattern: "Ты слишком часто стрелял по краям. Добавь баланс с центральной зоной.",
  },
  kk: {
    randomShotWarning: "Сен кездейсоқ ұяшықтарға тым көп аттың. Probability heatmap-ты жиірек қолдан.",
    lineFinishGood: "Кеме тапқаннан кейін сызықпен жақсы добив жасайсың — бұл күшті жағың.",
    cornerPredictable: "Кемелер бұрыштарда болжамды болды. Орталық пен шет аймақтарды көбірек араластыр.",
    highAccuracy: (v: number) => `Дәлдік ${v}% — ортадан жоғары.`,
    lowAccuracy: (v: number) => `Дәлдік ${v}% мақсаттан төмен. Әуелі паттерн тап, сосын добив жаса.`,
    centerPattern: "Орталыққа тым көп аттың. Бастапқы аймақты кеңейт.",
    edgePattern: "Шеттерге тым көп аттың. Орталық пен шет теңгерімін ұста.",
  },
};

const isCenter = ({ x, y }: Coord): boolean => x >= 3 && x <= 6 && y >= 3 && y <= 6;
const isEdge = ({ x, y }: Coord): boolean => x === 0 || y === 0 || x === 9 || y === 9;
const isCornerZone = ({ x, y }: Coord): boolean => (x <= 2 || x >= 7) && (y <= 2 || y >= 7);

export const analyzeMatch = (input: CoachAnalysisInput): CoachReport => {
  const copy = tr[input.locale];
  const playerShots = input.log.filter((item) => item.by === "player");
  const hits = playerShots.filter((item) => item.result === "hit" || item.result === "sunk");
  const accuracyRaw = playerShots.length > 0 ? hits.length / playerShots.length : 0;
  const accuracy = Math.round(accuracyRaw * 100);

  const sunkEvents = playerShots.filter((item) => item.result === "sunk").length;
  const totalEnemyShips = input.enemyFleet.length;
  const normalizedSinks = Math.max(1, Math.min(totalEnemyShips, sunkEvents));
  const shotsPerShip = Number((playerShots.length / normalizedSinks).toFixed(1));

  let aggressive = 0;
  let aggressiveWindows = 0;
  for (let i = 0; i < playerShots.length - 1; i += 1) {
    const current = playerShots[i];
    if (current.result !== "hit") {
      continue;
    }
    aggressiveWindows += 1;
    const next = playerShots[i + 1];
    const distance = Math.abs(current.coord.x - next.coord.x) + Math.abs(current.coord.y - next.coord.y);
    if (distance === 1) {
      aggressive += 1;
    }
  }
  const aggressionScore = Math.round((aggressive / Math.max(1, aggressiveWindows)) * 100);

  const centerRate = playerShots.filter((item) => isCenter(item.coord)).length / Math.max(1, playerShots.length);
  const edgeRate = playerShots.filter((item) => isEdge(item.coord)).length / Math.max(1, playerShots.length);
  const pattern: CoachReport["pattern"] =
    centerRate > 0.45 ? "center" : edgeRate > 0.45 ? "edges" : "balanced";

  const cornerPlaced =
    input.playerFleet.flatMap((ship) => ship.cells).filter((cell) => isCornerZone(cell)).length /
    Math.max(1, input.playerFleet.flatMap((ship) => ship.cells).length);

  const insights: CoachInsight[] = [];
  if (aggressionScore < 45) {
    insights.push({ tone: "warning", text: copy.randomShotWarning });
  } else {
    insights.push({ tone: "good", text: copy.lineFinishGood });
  }

  if (cornerPlaced > 0.48) {
    insights.push({ tone: "warning", text: copy.cornerPredictable });
  }

  insights.push({
    tone: accuracy >= 55 ? "good" : "neutral",
    text: accuracy >= 55 ? copy.highAccuracy(accuracy) : copy.lowAccuracy(accuracy),
  });

  if (pattern === "center") {
    insights.push({ tone: "neutral", text: copy.centerPattern });
  }
  if (pattern === "edges") {
    insights.push({ tone: "neutral", text: copy.edgePattern });
  }

  return {
    accuracy,
    shotsPerShip,
    winLoss: input.winner === "player" ? "win" : "loss",
    aggressionScore,
    pattern,
    insights,
  };
};
