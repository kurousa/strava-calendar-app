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
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&start_date=${dateString}&end_date=${dateString}&hourly=temperature_2m,weathercode,windspeed_10m&timezone=Asia%2FTokyo`;

    try {
        const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
        if (response.getResponseCode() !== 200) {
            Logger.log(`[Weather API Error] ${response.getContentText()}`);
            return '';
        }
        
        const data = JSON.parse(response.getContentText());
        const temp = data.hourly.temperature_2m[hourIndex];
        const code = data.hourly.weathercode[hourIndex];
        const wind = data.hourly.windspeed_10m[hourIndex];

        if (temp === null || temp === undefined) return '';

        const weatherStr = getWeatherEmoji(code);
        return `天気: ${weatherStr} / 気温: ${temp}℃ / 風速: ${wind}m/s`;
        
    } catch (e) {
        Logger.log(`[Weather API Exception] ${e}`);
        return '';
    }
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { fetchWeatherData, getWeatherEmoji };
}