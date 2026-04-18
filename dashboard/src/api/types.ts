export interface ApiResponse<T> {
  status: 'success' | 'error';
  code: number;
  data?: T;
  message?: string;
}

export interface Activity {
  id: string;
  date: string;
  title: string;
  type: string;
  distance: number;
  duration: number;
  elevation: number;
  avgHr?: number;
  maxHr?: number;
  avgWatts?: number;
  avgCadence?: number;
  calories?: number;
  mapUrl?: string;
  weather?: string;
  aiComment?: string;
}

export interface GearStatus {
  id: string;
  name: string;
  type: string;
  distanceKm: number;
  thresholdKm: number;
  isPeriodic: boolean;
}

export interface DashboardSummary {
  lastActivity: Activity | null;
  fitness: number;
  gears: GearStatus[];
  history: { date: string; value: number }[];
  heatmapData: { date: string; value: number }[];
}
