// ==========================================
// 【Webアプリ用】画面から受け取った日付でインポートを実行
// ==========================================
function importPastActivitiesFromWeb(startStr, endStr) {
    // 画面からの文字列(YYYY-MM-DD)をDateオブジェクトに変換
    const startDate = new Date(`${startStr}T00:00:00`);
    const endDate = new Date(`${endStr}T23:59:59`);

    return importPastActivities(startDate, endDate);
}


// ==========================================
// 指定した期間の過去データを取り込む (画面からの実行用)
// ==========================================
function importPastActivities(startDate, endDate, perPage = 200) {
    // Web画面以外（エディタ等）から直接実行された場合のデフォルト（テスト用）
    if (!startDate || !endDate) {
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1); // 1ヶ月前
        endDate = new Date();
        Logger.log('※引数が指定されていないため、直近1ヶ月の期間で実行します。');
    }

    Logger.log(`[Import] ${startDate.toLocaleDateString()} から ${endDate.toLocaleDateString()} のデータを取り込みます...`);

    // api.js の関数を呼び出し
    const activities = getStravaActivities(startDate, endDate, perPage);

    if (activities.length === 0) {
        const msg = '該当する期間のアクティビティはありませんでした。';
        return msg;
    }

    const calendar = getTargetCalendar();
    if (!calendar) return 'カレンダーの取得に失敗しました。';

    let successCount = 0;
    let skipCount = 0;

    // ⚡ Bolt Optimization: Batch load existing events to avoid N+1 queries
    // Fetch all events for the entire import period in one Calendar API call
    const existingEvents = calendar.getEvents(startDate, endDate);

    // Create a Set of existing Strava activity IDs for O(1) lookup
    const existingActivityIds = new Set();
    existingEvents.forEach(event => {
        const desc = event.getDescription();
        if (desc) {
            const match = desc.match(/strava\.com\/activities\/(\d+)/);
            if (match && match[1]) {
                existingActivityIds.add(match[1]);
            }
        }
    });

    Logger.log(`[Import] 既にカレンダーにあるイベントを ${existingActivityIds.size} 件検出しました。`);

    activities.forEach(activity => {
        const activityIdStr = String(activity.id);
        if (existingActivityIds.has(activityIdStr)) {
            Logger.log(`スキップ: 既に登録済みのアクティビティです: ${activity.id}`);
            skipCount++;
            return;
        }

        const result = processActivityToCalendar(activity, calendar);
        if (result === 'skipped') skipCount++;
        if (result === 'success') successCount++;
    });

    const resultMsg = `✅ 完了! 新規登録: ${successCount}件 / スキップ: ${skipCount}件`;
    Logger.log(resultMsg);
    return resultMsg;
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        importPastActivities,
    };
}
