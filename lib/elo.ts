export interface EloResult {
  nextElo: number;
  delta: number;
  kFactor: number;
}

export const computeKFactor = (currentElo: number): number => {
  const raw = 30 - (currentElo - 1000) / 50;
  return Math.max(10, Math.min(35, Math.round(raw)));
};

export const calculateEloDelta = (currentElo: number, won: boolean): EloResult => {
  const kFactor = computeKFactor(currentElo);
  const delta = won ? kFactor : -Math.round(kFactor * 0.5 + 5);
  return {
    delta,
    kFactor,
    nextElo: Math.max(0, currentElo + delta),
  };
};
