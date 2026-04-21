import { ChevronRight, Zap, Cloud, Heart, Activity } from "lucide-react";
import type { DashboardSummary } from "../api/types";
import { DetailStat, MetricRow } from "./Stats";

interface ActivityDetailProps {
  activity: NonNullable<DashboardSummary["lastActivity"]>;
  onBack: () => void;
}

export function ActivityDetail({ activity, onBack }: ActivityDetailProps) {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-3 rounded-2xl bg-surface-low hover:bg-on-surface hover:text-white transition-all font-bold text-xs uppercase tracking-widest flex items-center gap-2"
        >
          <ChevronRight className="w-4 h-4 rotate-180" /> Back
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-12">
          {/* Hero Section */}
          <div className="bg-strava text-white p-12 md:p-16 rounded-[64px] shadow-2xl space-y-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-16 opacity-10">
              <Zap className="w-64 h-64" />
            </div>
            <div className="space-y-4 relative z-10">
              <p className="text-xs font-black tracking-[0.5em] uppercase opacity-60">
                {activity.date}
              </p>
              <h2 className="text-5xl md:text-8xl font-black italic tracking-tighter leading-[0.85] uppercase">
                {activity.title}
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 relative z-10">
              <DetailStat label="Distance" value={activity.distance?.toFixed(2)} unit="KM" />
              <DetailStat label="Time" value={activity.duration} unit="MIN" />
              <DetailStat label="Elevation" value={Math.round(activity.elevation || 0)} unit="M" />
              <DetailStat label="Calories" value={activity.calories} unit="KCAL" />
            </div>
          </div>

          {/* AI Comment & Analysis */}
          <div className="bg-white p-12 rounded-[56px] border border-on-surface/5 shadow-xl space-y-8">
            <div className="flex items-center gap-4 text-strava">
              <Cloud className="w-6 h-6" />
              <h4 className="text-xs font-black tracking-widest uppercase">
                Atmospheric Signal / AI Analysis
              </h4>
            </div>
            <p className="text-3xl md:text-4xl font-bold tracking-tight leading-tight italic">
              {activity.aiComment ||
                "The performance analysis engine is refining its insights for this session."}
            </p>
            <div className="pt-6 flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface/30">
              <span className="px-4 py-2 bg-surface-low rounded-full truncate">
                Weather: {activity.weather || "Standard Condition"}
              </span>
              <span className="px-4 py-2 bg-surface-low rounded-full">Type: {activity.type}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          {/* Performance Deep Dive */}
          <div className="bg-on-surface text-white p-10 rounded-[56px] space-y-10">
            <h3 className="text-xs font-black tracking-widest uppercase text-white/40">
              Performance Metrics
            </h3>
            <div className="space-y-8">
              <MetricRow
                icon={<Heart className="w-5 h-5" />}
                label="Avg Heart Rate"
                value={activity.avgHr}
                unit="BPM"
              />
              <MetricRow
                icon={<Heart className="w-5 h-5" />}
                label="Max Heart Rate"
                value={activity.maxHr}
                unit="BPM"
              />
              <MetricRow
                icon={<Zap className="w-5 h-5" />}
                label="Avg Power"
                value={activity.avgWatts}
                unit="W"
              />
              <MetricRow
                icon={<Activity className="w-5 h-5" />}
                label="Avg Cadence"
                value={activity.avgCadence}
                unit="RPM"
              />
            </div>
          </div>

          <a
            href={`https://www.strava.com/activities/${activity.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-strava hover:bg-on-surface transition-all duration-500 text-white p-8 rounded-[48px] text-center font-black italic tracking-tighter text-2xl uppercase shadow-xl"
          >
            Open on Strava
          </a>
        </div>
      </div>
    </div>
  );
}
