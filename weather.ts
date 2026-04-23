// ==========================================
// 天気情報取得処理 (weather.ts)
// WeatherAPI.com (APIキー必須) を利用して過去の天気を取得します。
// ==========================================
let _weatherApiKeyCache: string | null = null;

function fetchWeatherData(lat: number, lng: number, dateObj: Date): string {
    // 1. APIキーの取得
    if (_weatherApiKeyCache === null) {
        _weatherApiKeyCache = PropertiesService.getScriptProperties().getProperty(Config.PROP_WEATHER_API_KEY) || '';
    }
    const apiKey = _weatherApiKeyCache;
    if (!apiKey) {
        Logger.log('[Weather API Error] APIキーが設定されていません。');
        return '';
    }

    // 2. 日付と時間のフォーマット
    const dateString = Utilities.formatDate(dateObj, "Asia/Tokyo", "yyyy-MM-dd");
    const hourIndex = parseInt(Utilities.formatDate(dateObj, "Asia/Tokyo", "H"), 10);

    // 3. エンドポイントの構築 (history.json)
    // q=lat,lng で座標指定、dt=日付 で過去データを取得
    // lang=ja で日本語の天気情報を取得
    const url = `${Config.WEATHER_API_BASE}/history.json?key=${apiKey}&q=${lat},${lng}&dt=${dateString}&lang=ja`;

    try {
        const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
        const data = JSON.parse(response.getContentText());

        if (response.getResponseCode() !== 200) {
            Logger.log(`[Weather API Error] ${data.error?.message}`);
            return '';
        }

        // 4. 指定した時間 (hourIndex) のデータを抽出
        const forecastDay = data.forecast?.forecastday?.[0];
        if (!forecastDay || !forecastDay.hour) return '';

        const hourlyData = forecastDay.hour[hourIndex];
        if (!hourlyData) return '';

        const temp = hourlyData.temp_c; // 気温 (℃)
        const wind = hourlyData.wind_kph; // 風速 (km/h)
        
        // condition.text には "Sunny", "Partly cloudy", "Light rain" などが入る
        const conditionText = hourlyData.condition?.text || '不明';

        return `天気: ${conditionText} / 気温: ${temp}℃ / 風速: ${wind}km/h`;
        
    } catch (e) {
        Logger.log(`[Weather API Exception] ${e}`);
        const errorMsg = `[Weather API Error] 天気情報の取得に失敗しました: ${e}`;
        if (typeof sendErrorEmail === 'function') sendErrorEmail(errorMsg);
        return '';
    }
}


/**
 * 複数のアクティビティに対する天気情報をUrlFetchApp.fetchAllを使って一括で取得し、
 * アクティビティオブジェクトのweatherTextに設定します。
 * WeatherAPI.com の history.json エンドポイントを使用します。
 */
function fetchWeatherDataBatch(activities: StravaActivity[]): void {
    // 1. APIキーの取得（fetchWeatherData と同じキャッシュを共有）
    if (_weatherApiKeyCache === null) {
        _weatherApiKeyCache = PropertiesService.getScriptProperties().getProperty(Config.PROP_WEATHER_API_KEY) || '';
    }
    const apiKey = _weatherApiKeyCache;
    if (!apiKey) {
        Logger.log('[Weather API Error] APIキーが設定されていません。');
        return;
    }

    const requests: GoogleAppsScript.URL_Fetch.URLFetchRequest[] = [];
    const mapping: { activity: StravaActivity, hourIndex: number }[] = [];

    activities.forEach(activity => {
        if (activity.weatherText) return;
        if (!activity.start_latlng || activity.start_latlng.length !== 2) return;

        const dateObj = getActivityStartDate(activity);

        const dateString = Utilities.formatDate(dateObj, "Asia/Tokyo", "yyyy-MM-dd");
        const hourIndex = parseInt(Utilities.formatDate(dateObj, "Asia/Tokyo", "H"), 10);

        // q=lat,lng で座標指定、dt=日付 で過去データを取得、lang=ja で日本語の天気情報を取得
        const url = `${Config.WEATHER_API_BASE}/history.json?key=${apiKey}&q=${activity.start_latlng[0]},${activity.start_latlng[1]}&dt=${dateString}&lang=ja`;

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

                const forecastDay = data.forecast?.forecastday?.[0];
                if (!forecastDay || !forecastDay.hour) return;

                const { activity, hourIndex } = mapping[i];
                const hourlyData = forecastDay.hour[hourIndex];
                if (!hourlyData) return;

                const temp = hourlyData.temp_c;           // 気温 (℃)
                const wind = hourlyData.wind_kph;          // 風速 (km/h)
                const conditionText = hourlyData.condition?.text || '不明';

                if (temp != null && wind != null) {
                    activity.weatherText = `天気: ${conditionText} / 気温: ${temp}℃ / 風速: ${wind}km/h`;
                }
            } catch (e) {
                // 個別レスポンスのパースエラーは無視して続行
            }
        });
    } catch (e) {
        Logger.log(`[Weather API Batch Exception] ${e}`);
        const errorMsg = `[Weather API Batch Error] 天気情報の一括取得に失敗しました: ${e}`;
        if (typeof sendErrorEmail === 'function') sendErrorEmail(errorMsg);
    }
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        fetchWeatherData,
        fetchWeatherDataBatch,
    };
}
