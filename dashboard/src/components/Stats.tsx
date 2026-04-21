import type { ReactNode } from "react";

export function DetailStat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number | undefined;
  unit: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-black tracking-widest text-white/50 uppercase">{label}</p>
      <p className="text-3xl font-black italic tracking-tighter">
        {value || "-"}
        <span className="text-xs ml-1 opacity-50">{unit}</span>
      </p>
    </div>
  );
}

export function MetricRow({
  icon,
  label,
  value,
  unit,
}: {
  icon: ReactNode;
  label: string;
  value: string | number | undefined;
  unit: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-4">
      <div className="flex items-center gap-4">
        <div className="text-strava">{icon}</div>
        <span className="text-[10px] font-black tracking-widest uppercase opacity-60">{label}</span>
      </div>
      <p className="text-xl font-black italic tracking-tighter uppercase">
        {value || "N/A"}
        <span className="text-[10px] ml-1 opacity-40 not-italic">{unit}</span>
      </p>
    </div>
  );
}

export function MetaStat({
  icon,
  label,
  value,
  unit,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="flex items-center gap-5 relative z-10">
      <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md">{icon}</div>
      <div>
        <p className="text-[10px] font-black text-white/30 tracking-widest uppercase">{label}</p>
        <p className="text-3xl font-black italic tracking-tighter uppercase">
          {value} <span className="text-xs opacity-40 not-italic">{unit}</span>
        </p>
      </div>
    </div>
  );
}
