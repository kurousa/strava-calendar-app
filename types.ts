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
    weatherText?: string;            // 追加: アプリ内で動的に付与する天気テキスト
    [key: string]: unknown;
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
