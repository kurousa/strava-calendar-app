// ==========================================
// 天気情報取得処理 (weather.ts)
// Open-Meteo API (APIキー不要) を利用して過去の天気を取得します。
// ==========================================

function getWeatherEmoji(code: number): string {
    // WMO Weather interpretation codes (https://open-meteo.com/en/docs)
    if (code === 0) return '☀️ 晴れ';
    if (code === 1 || code === 2 || code === 3) return '⛅ 曇り';
    if (code >= 45 && code <= 48) return '🌫️ 霧';
    if (code >= 51 && code <= 67) return '🌧️ 雨';
    if (code >= 71 && code <= 77) return '❄️ 雪';
    if (code >= 80 && code <= 82) return '🚿 にわか雨';
    if (code >= 95 && code <= 99) return '⛈️ 雷雨';
    return '☁️ 不明';
}

function fetchWeatherData(lat: number, lng: number, dateObj: Date): string {
    // Asia/Tokyo タイムゾーン基準で日付と時間を取得 (GitHub ActionsなどのUTC環境でも正しく動作させるため)
    const dateString = Utilities.formatDate(dateObj, "Asia/Tokyo", "yyyy-MM-dd");
    const hourIndex = parseInt(Utilities.formatDate(dateObj, "Asia/Tokyo", "H"), 10);

    // 過去92日まで取得可能な forecast エンドポイントを使用
    // https://open-meteo.com/en/docs#api-reference
    // hourly=temperature_2m,weathercode,windspeed_10m で気温、天気コード、風速を取得
    // timezone=Asia%2FTokyo で東京のタイムゾーンを指定
    // windspeed_unit=kmh で風速をkm/h単位で取得
    const url = `${Config.OPEN_METEO_API_BASE}?latitude=${lat}&longitude=${lng}&start_date=${dateString}&end_date=${dateString}&hourly=temperature_2m,weathercode,windspeed_10m&timezone=Asia%2FTokyo&windspeed_unit=kmh`;

    try {
        const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
        if (response.getResponseCode() !== 200) {
            Logger.log(`[Weather API Error] ${response.getContentText()}`);
            return '';
        }
        
        const data = JSON.parse(response.getContentText());
        if (!data.hourly) {
            return "";
        }
        const temp = data.hourly.temperature_2m[hourIndex];
        if (temp === null || temp === undefined) return '';
        const code = data.hourly.weathercode[hourIndex];
        if (code === null || code === undefined) return '';
        const wind = data.hourly.windspeed_10m[hourIndex];
        if (wind === null || wind === undefined) return '';

        const weatherStr = getWeatherEmoji(code);
        return `天気: ${weatherStr} / 気温: ${temp}℃ / 風速: ${wind}km/h`;
        
    } catch (e) {
        Logger.log(`[Weather API Exception] ${e}`);
        const errorMsg = `[Weather API Error] 天気情報の取得に失敗しました: ${e}`;
        if (typeof sendErrorEmail === 'function') sendErrorEmail(errorMsg);
        return '';
    }
}

// Node.js環境（テスト時）のみエクスポートする

/**
 * 複数のアクティビティに対する天気情報をUrlFetchApp.fetchAllを使って一括で取得し、
 * アクティビティオブジェクトのweatherTextに設定します。
 */
function fetchWeatherDataBatch(activities: StravaActivity[]): void {
    const requests: GoogleAppsScript.URL_Fetch.URLFetchRequest[] = [];
    const mapping: { activity: StravaActivity, hourIndex: number }[] = [];

    activities.forEach(activity => {
        if (activity.weatherText) return;
        if (!activity.start_latlng || activity.start_latlng.length !== 2) return;

        const dateObj = activity.start_date_local
            ? new Date(activity.start_date_local.replace(/Z$/i, ''))
            : new Date(activity.start_date);

        const dateString = Utilities.formatDate(dateObj, "Asia/Tokyo", "yyyy-MM-dd");
        const hourIndex = parseInt(Utilities.formatDate(dateObj, "Asia/Tokyo", "H"), 10);

        const url = `${Config.OPEN_METEO_API_BASE}?latitude=${activity.start_latlng[0]}&longitude=${activity.start_latlng[1]}&start_date=${dateString}&end_date=${dateString}&hourly=temperature_2m,weathercode,windspeed_10m&timezone=Asia%2FTokyo&windspeed_unit=kmh`;

        requests.push({ url, muteHttpExceptions: true });
        mapping.push({ activity, hourIndex });
    });

    if (requests.length === 0) return;

    try {
        const responses = UrlFetchApp.fetchAll(requests);
        responses.forEach((response, i) => {
            if (response.getResponseCode() !== 200) return;
            try {
                const data = JSON.parse(response.getContentText());
                if (!data.hourly) return;

                const { activity, hourIndex } = mapping[i];
                const temp = data.hourly.temperature_2m[hourIndex];
                const code = data.hourly.weathercode[hourIndex];
                const wind = data.hourly.windspeed_10m[hourIndex];

                if (temp != null && code != null && wind != null) {
                    activity.weatherText = `天気: ${getWeatherEmoji(code)} / 気温: ${temp}℃ / 風速: ${wind}km/h`;
                }
            } catch (e) {
                // Parsing error for a single response
            }
        });
    } catch (e) {
        Logger.log(`[Weather API Batch Exception] ${e}`);
        const errorMsg = `[Weather API Batch Error] 天気情報の一括取得に失敗しました: ${e}`;
        if (typeof sendErrorEmail === 'function') sendErrorEmail(errorMsg);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { fetchWeatherData, fetchWeatherDataBatch, getWeatherEmoji };
}