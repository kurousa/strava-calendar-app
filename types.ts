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
    mapUrl?: string;  // 追加
    aiComment?: string; // 追加
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
