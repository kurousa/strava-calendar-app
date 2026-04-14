// ==========================================
// 定数定義 (const.ts)
// ==========================================

// プロパティキー
const PROP_CALENDAR_ID = 'CALENDAR_ID';
const PROP_STRAVA_CLIENT_ID = 'STRAVA_CLIENT_ID';
const PROP_STRAVA_CLIENT_SECRET = 'STRAVA_CLIENT_SECRET';
const PROP_STRAVA_SCOPE = 'STRAVA_SCOPE';
const PROP_STRAVA_VERIFY_TOKEN = 'STRAVA_WEBHOOK_VERIFY_TOKEN';
const PROP_WEB_APP_URL = 'WEB_APP_URL';
const PROP_SPREADSHEET_ID = 'SPREADSHEET_ID';
const PROP_DISCORD_WEBHOOK_URL = 'DISCORD_WEBHOOK_URL';
const PROP_GEMINI_API_KEY = 'GEMINI_API_KEY';
const PROP_LAST_ERROR_NOTIFIED_AT = 'LAST_ERROR_NOTIFIED_AT';

// API エンドポイント
const STRAVA_API_BASE = 'https://www.strava.com/api/v3';
const OPEN_METEO_API_BASE = 'https://api.open-meteo.com/v1/forecast';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// 設定定数
const CALENDAR_API_DELAY_MS = 200;
const STRAVA_API_DELAY_MS = 200;
const STRAVA_ACTIVITY_ID_REGEX = /strava\.com\/activities\/(\d+)/i;

const DISTANCE_ACTIVITIES = new Set([
    'Run', 'Ride', 'Walk', 'Hike', 'Swim', 'AlpineSki', 'BackcountrySki', 'NordicSki', 'RollerSki',
    'Canoeing', 'Kayaking', 'Rowing', 'StandUpPaddling', 'Surfing', 'Sail', 'Windsurf', 'IceSkate',
    'InlineSkate', 'Skateboard', 'Snowshoe', 'Kitesurf', 'VirtualRide', 'VirtualRun', 'GravelRide',
    'MountainBikeRide', 'EMountainBikeRide', 'Velomobile', 'Handcycle', 'Wheelchair'
]);

const MAP_FOLDER_NAME = 'Strava_Route_Maps';
const GEAR_CONFIG_PREFIX = 'GEAR_CONFIG_';
const BACKUP_SHEET_NAME = 'Activities';

// アクティビティごとのスタイルデータ (EventColor は lazy init で解決)
const ACTIVITY_STYLE_DATA = {
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
};

const DEFAULT_ACTIVITY_STYLE_DATA = { emoji: '🏅', colorName: 'GRAY' };

// Node.js環境（テスト時）でのグローバル化
if (typeof global !== 'undefined') {
    Object.assign(global, {
        PROP_CALENDAR_ID,
        PROP_STRAVA_CLIENT_ID,
        PROP_STRAVA_CLIENT_SECRET,
        PROP_STRAVA_SCOPE,
        PROP_STRAVA_VERIFY_TOKEN,
        PROP_WEB_APP_URL,
        PROP_SPREADSHEET_ID,
        PROP_DISCORD_WEBHOOK_URL,
        PROP_GEMINI_API_KEY,
        PROP_LAST_ERROR_NOTIFIED_AT,
        STRAVA_API_BASE,
        OPEN_METEO_API_BASE,
        GEMINI_API_BASE,
        CALENDAR_API_DELAY_MS,
        STRAVA_API_DELAY_MS,
        STRAVA_ACTIVITY_ID_REGEX,
        DISTANCE_ACTIVITIES,
        MAP_FOLDER_NAME,
        GEAR_CONFIG_PREFIX,
        BACKUP_SHEET_NAME,
        ACTIVITY_STYLE_DATA,
        DEFAULT_ACTIVITY_STYLE_DATA
    });
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PROP_CALENDAR_ID,
        PROP_STRAVA_CLIENT_ID,
        PROP_STRAVA_CLIENT_SECRET,
        PROP_STRAVA_SCOPE,
        PROP_STRAVA_VERIFY_TOKEN,
        PROP_WEB_APP_URL,
        PROP_SPREADSHEET_ID,
        PROP_DISCORD_WEBHOOK_URL,
        PROP_GEMINI_API_KEY,
        PROP_LAST_ERROR_NOTIFIED_AT,
        STRAVA_API_BASE,
        OPEN_METEO_API_BASE,
        GEMINI_API_BASE,
        CALENDAR_API_DELAY_MS,
        STRAVA_API_DELAY_MS,
        STRAVA_ACTIVITY_ID_REGEX,
        DISTANCE_ACTIVITIES,
        MAP_FOLDER_NAME,
        GEAR_CONFIG_PREFIX,
        BACKUP_SHEET_NAME,
        ACTIVITY_STYLE_DATA,
        DEFAULT_ACTIVITY_STYLE_DATA
    };
}
