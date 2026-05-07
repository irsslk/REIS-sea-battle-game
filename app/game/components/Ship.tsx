interface ShipProps {
  name: string;
  size: number;
}

export const Ship = ({ name, size }: ShipProps) => {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-emerald-300/20 bg-slate-950/60 px-3 py-2">
      <span className="text-sm text-emerald-100">{name}</span>
      <div className="flex gap-1">
        {Array.from({ length: size }, (_, index) => (
          <span key={index} className="h-3 w-3 rounded-sm bg-emerald-400/90" />
        ))}
      </div>
    </div>
  );
};
