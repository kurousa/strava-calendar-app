import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';

interface HeatmapProps {
  data: { date: string; value: number }[];
}

export function Heatmap({ data }: HeatmapProps) {
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  return (
    <div className="bg-white/60 backdrop-blur-xl rounded-[40px] p-8 md:p-10 space-y-6 border border-white/20 shadow-2xl relative overflow-hidden group">
      <div className="space-y-1">
        <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">Activity</h2>
        <p className="text-[10px] font-bold tracking-widest text-on-surface/40 uppercase">30-Day Activity Map</p>
      </div>

      <div className="heatmap-container mx-auto max-w-[280px]">
        <CalendarHeatmap
          startDate={thirtyDaysAgo}
          endDate={today}
          values={data || []}
          horizontal={false}
          gutterSize={2}
          classForValue={(value: { date: string; value: number } | undefined) => {
            if (!value || value.value === 0) {
              return 'color-empty';
            }
            const val = value.value;
            if (val < 30) return 'color-strava-1';
            if (val < 60) return 'color-strava-2';
            if (val < 90) return 'color-strava-3';
            return 'color-strava-4';
          }}
          // @ts-ignore
          tooltipDataAttrs={(value) => {
            if (!value || !value.date) return {};
            return {
              'data-tip': `${value.date}: TSS ${(value as any).value}`,
            };
          }}
        />
      </div>

      <div className="flex justify-end items-center gap-2">
        <span className="text-[8px] font-bold text-on-surface/30 uppercase tracking-widest">Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-surface-low" />
          <div className="w-3 h-3 rounded-sm bg-strava/20" />
          <div className="w-3 h-3 rounded-sm bg-strava/40" />
          <div className="w-3 h-3 rounded-sm bg-strava/70" />
          <div className="w-3 h-3 rounded-sm bg-strava" />
        </div>
        <span className="text-[8px] font-bold text-on-surface/30 uppercase tracking-widest">More</span>
      </div>
    </div>
  );
}
