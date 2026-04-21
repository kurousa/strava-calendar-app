import { Activity, Map } from "lucide-react";
import { cn } from "../lib/utils";
import type { GearStatus } from "../api/types";

export function GearItem({ gear }: { gear: GearStatus }) {
  return (
    <div className="bg-white p-6 rounded-[32px] shadow-lg hover:shadow-xl transition-all duration-300 border border-on-surface/5 flex gap-5 items-center group">
      <div className="bg-surface-low p-4 rounded-2xl group-hover:bg-on-surface group-hover:text-white transition-colors duration-500">
        {gear.type === "Bike" ? <Activity className="w-5 h-5" /> : <Map className="w-5 h-5" />}
      </div>
      <div className="flex-1 space-y-3">
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-black tracking-tight truncate max-w-[150px] uppercase">
            {gear.name}
          </h4>
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-[8px] font-black tracking-widest uppercase",
              gear.thresholdKm && (gear.distanceKm || 0) > gear.thresholdKm * 0.8
                ? "bg-red-100 text-red-600"
                : "bg-green-100 text-green-600",
            )}
          >
            In Use
          </span>
        </div>
        <div className="space-y-1.5">
          <div className="w-full bg-surface-low h-1.5 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-1000",
                gear.thresholdKm && (gear.distanceKm || 0) > gear.thresholdKm * 0.8
                  ? "bg-red-500"
                  : "bg-strava",
              )}
              style={{
                width: `${Math.min(((gear.distanceKm || 0) / (gear.thresholdKm || 5000)) * 100, 100)}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-[8px] font-black tracking-[0.2em] text-on-surface/30 uppercase">
            <span>{Math.round(gear.distanceKm || 0)} KM</span>
            <span>{gear.thresholdKm || 5000} KM LIMIT</span>
          </div>
        </div>
      </div>
    </div>
  );
}
