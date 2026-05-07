import { BOARD_SIZE } from "@/lib/game-logic";

export const Board = () => {
  return (
    <div className="grid grid-cols-10 gap-1 rounded-2xl bg-white/10 p-3 backdrop-blur-md">
      {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => (
        <div key={index} className="aspect-square rounded-md border border-white/20 bg-slate-900/50" />
      ))}
    </div>
  );
};
