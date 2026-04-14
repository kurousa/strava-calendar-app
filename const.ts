"use strict";

// ==========================================
// 定数定義 (const.ts)
// ==========================================

/**
 * Object.freeze をネストされたオブジェクトにも適用するヘルパー関数
 */
function deepFreeze<T extends Record<string, any>>(object: T): Readonly<T> {
    const propNames = Object.getOwnPropertyNames(object);
    for (const name of propNames) {
        const value = object[name];
        if (value && typeof value === 'object') {
            deepFreeze(value as Record<string, any>);
        }
    }
    return Object.freeze(object);
}

// 1つの var オブジェクトとして定義する（GASのグローバルスコープ共有のため）
var Config = {
    // プロパティキー
    PROP_CALENDAR_ID: 'CALENDAR_ID',
    PROP_STRAVA_CLIENT_ID: 'STRAVA_CLIENT_ID',
    PROP_STRAVA_CLIENT_SECRET: 'STRAVA_CLIENT_SECRET',
    PROP_STRAVA_SCOPE: 'STRAVA_SCOPE',
    PROP_STRAVA_VERIFY_TOKEN: 'STRAVA_WEBHOOK_VERIFY_TOKEN',
    PROP_WEB_APP_URL: 'WEB_APP_URL',
    PROP_SPREADSHEET_ID: 'SPREADSHEET_ID',
    PROP_DISCORD_WEBHOOK_URL: 'DISCORD_WEBHOOK_URL',
    PROP_GEMINI_API_KEY: 'GEMINI_API_KEY',
    PROP_LAST_ERROR_NOTIFIED_AT: 'LAST_ERROR_NOTIFIED_AT',

    // API エンドポイント
    STRAVA_API_BASE: 'https://www.strava.com/api/v3',
    OPEN_METEO_API_BASE: 'https://api.open-meteo.com/v1/forecast',
    GEMINI_API_BASE: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',

    // 設定定数
    CALENDAR_API_DELAY_MS: 200,
    STRAVA_API_DELAY_MS: 200,
    STRAVA_ACTIVITY_ID_REGEX: /strava\.com\/activities\/(\d+)/i,

    DISTANCE_ACTIVITIES: new Set([
        'Run', 'Ride', 'Walk', 'Hike', 'Swim', 'AlpineSki', 'BackcountrySki', 'NordicSki', 'RollerSki',
        'Canoeing', 'Kayaking', 'Rowing', 'StandUpPaddling', 'Surfing', 'Sail', 'Windsurf', 'IceSkate',
        'InlineSkate', 'Skateboard', 'Snowshoe', 'Kitesurf', 'VirtualRide', 'VirtualRun', 'GravelRide',
        'MountainBikeRide', 'EMountainBikeRide', 'Velomobile', 'Handcycle', 'Wheelchair'
    ]),

    MAP_FOLDER_NAME: 'Strava_Route_Maps',
    GEAR_CONFIG_PREFIX: 'GEAR_CONFIG_',
    BACKUP_SHEET_NAME: 'Activities',

    // アクティビティごとのスタイルデータ
    ACTIVITY_STYLE_DATA: {
        'Walk': { emoji: '🚶', colorName: 'GREEN' },
        'Run': { emoji: '🏃', colorName: 'BLUE' },
        'VirtualRun': { emoji: '🏃', colorName: 'BLUE' },
        'Ride': { emoji: '🚴', colorName: 'RED' },
        'VirtualRide': { emoji: '🚴', colorName: 'RED' },
        'Swim': { emoji: '🏊', colorName: 'CYAN' },
        'Hike': { emoji: '🥾', colorName: 'PALE_GREEN' },
        'Workout': { emoji: '🏋️', colorName: 'ORANGE' },
        'WeightTraining': { emoji: '🏋️', colorName: 'ORANGE' },
        'Yoga': { emoji: '🧘', colorName: 'GREEN' },
    },

    DEFAULT_ACTIVITY_STYLE_DATA: { emoji: '🏅', colorName: 'GRAY' }
};

// オブジェクトを凍結して変更不可にする
deepFreeze(Config);

// Node.js環境（テスト時）でのグローバル化
if (typeof global !== 'undefined') {
    (global as any).Config = Config;
    // 既存のコード（テスト等）との互換性のため、個別の定数もグローバルに展開する
    Object.assign(global, Config);
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Config,
        ...Config
    };
}
