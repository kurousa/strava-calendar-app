// ==========================================
// Strava API レスポンスの型定義
// ==========================================

/**
 * Strava APIから返されるアクティビティの型定義
 */
interface StravaActivity {
    id: number;
    name: string;
    type: string;
    sport_type?: string;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    total_elevation_gain: number;
    start_date: string;
    start_date_local?: string;
    average_speed?: number;
    max_speed?: number;
    average_heartrate?: number;
    max_heartrate?: number;
    has_heartrate?: boolean;
    average_watts?: number;
    average_cadence?: number;
    start_latlng?: [number, number]; // 追加: 開始地点の緯度経度 [lat, lng]
    map?: {
        summary_polyline: string;
    };                               // 追加: ルートのポリラインデータ
    mapUrl?: string;                 // 追加: 生成されたマップ画像のURL
    weatherText?: string;            // 追加: アプリ内で動的に付与する天気テキスト
    aiComment?: string;              // 追加: AIによる労いのコメント
    calories?: number;               // 追加: 消費カロリー
    [key: string]: unknown;
}

/**
 * Strava API アスリート情報の詳細型定義
 */
interface StravaAthlete {
    id: number;
    username: string;
    firstname: string;
    lastname: string;
    bio: string;
    city: string;
    state: string;
    country: string;
    sex: 'M' | 'F' | null;
    premium: boolean;
    summit: boolean;
    created_at: string;
    updated_at: string;
    weight: number | null;
    ftp: number | null;
    measurement_preference: 'feet' | 'meters';
    bikes: StravaGear[];
    shoes: StravaGear[];
    [key: string]: unknown;
}

interface StravaGear {
    id: string;
    primary: boolean;
    name: string;
    resource_state: number;
    distance: number; // 単位: メートル
}
/**
 * 共通メトリクスの型定義
 */
interface CommonMetrics {
    distanceKm: string;
    timeMin: number;
    elevation: number;
    hr: string;
    weather?: string; // 追加
    aiComment?: string; // 追加
    mapUrl?: string;  // 追加
}

/**
 * アクティビティスタイルの型定義
 */
interface ActivityStyle {
    emoji: string;
    color: string | GoogleAppsScript.Calendar.EventColor;
}

/**
 * 検索パラメータの型定義
 */
interface SearchParams {
    per_page: number;
    after?: number;
    before?: number;
    page?: number;
}

/**
 * Strava Webhook イベントの型定義
 */
interface StravaWebhookEvent {
    object_type: 'activity' | 'athlete';
    object_id: number;
    aspect_type: 'create' | 'update' | 'delete';
    updates: {
        title?: string;
        type?: string;
        private?: 'true' | 'false';
        authorized?: 'false';
    };
    owner_id: number;
    subscription_id: number;
    event_time: number;
}

/**
 * Strava Webhook 購読情報の型定義
 */
interface StravaWebhookSubscription {
    id: number;
    resource_state: number;
    application_id: number;
    callback_url: string;
    created_at: string;
    updated_at: string;
}

/**
 * サマリーデータの型定義
 */
interface SummaryData {
    totalDistanceKm: number;
    totalMovingTimeMin: number;
    totalElevationGain: number;
    totalCalories: number;
    longestActivity: StravaActivity | null;
    activityCount: number;
    startDate: Date;
    endDate: Date;
}

/**
 * 各機材の現在のステータス情報の型定義
 */
interface GearStatus {
    id: string;
    name: string;
    type: 'Bike' | 'Shoes';
    distanceKm: number;
    thresholdKm: number;
    isPeriodic: boolean;
}

interface Activity {
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

interface DashboardSummary {
    lastActivity: Activity | null;
    fitness: number;
    gears: GearStatus[];
    history: Array<{ date: string; value: number }>;
    heatmapData: Array<{ date: string; value: number }>;
}

/**
 * APIレスポンスの共通型定義
 */
type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

interface ApiSuccessResponse<T> {
    status: 'success';
    code: number;
    data: T;
}

interface ApiErrorResponse {
    status: 'error';
    code: number;
    message: string;
}
