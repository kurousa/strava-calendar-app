// ==========================================
// 週次・月次サマリーの集計と通知 (summary.ts)
// ==========================================

/**
 * 指定期間のアクティビティをStravaから取得し、サマリーデータを生成する
 */
function generateSummary(startDate: Date, endDate: Date): SummaryData {
    const activities = getStravaActivities(startDate, endDate);

    let totalDistance = 0;
    let totalMovingTime = 0;
    let totalElevationGain = 0;
    let totalCalories = 0;
    let longestActivity: StravaActivity | null = null;
    let maxDistance = -1;

    activities.forEach(activity => {
        totalDistance += activity.distance || 0;
        totalMovingTime += activity.moving_time || 0;
        totalElevationGain += activity.total_elevation_gain || 0;

        // Strava Summary Activity API では calories が含まれない場合がある
        // その場合は詳細を取得する必要があるが、API制限を考慮して一旦あるものだけで集計
        // (webhook等で詳細取得済みのものがキャッシュされている場合はそれを使う等の拡張も考えられる)
        if (activity.calories) {
            totalCalories += activity.calories;
        }

        if (activity.distance > maxDistance) {
            maxDistance = activity.distance;
            longestActivity = activity;
        }
    });

    return {
        totalDistanceKm: totalDistance / 1000,
        totalMovingTimeMin: Math.floor(totalMovingTime / 60),
        totalElevationGain: totalElevationGain,
        totalCalories: totalCalories,
        longestActivity: longestActivity,
        activityCount: activities.length,
        startDate: startDate,
        endDate: endDate
    };
}

/**
 * 【トリガー用】日曜の夜に実行される週次サマリー送信
 */
function sendWeeklySummary(): void {
    const now = new Date();
    // 日曜日（0）の場合、先週の月曜（6日前）から今日まで
    // 他の曜日に実行された場合でも「直近の月曜〜日曜」を出すように調整
    const endDate = new Date(now);
    const startDate = new Date(now);

    // 直近の月曜日を計算
    const day = now.getDay(); // 0 (Sun) to 6 (Sat)
    const diff = (day === 0 ? 6 : day - 1);
    startDate.setDate(now.getDate() - diff);
    startDate.setHours(0, 0, 0, 0);

    const data = generateSummary(startDate, endDate);

    if (data.activityCount === 0) {
        Logger.log('今週のアクティビティはありませんでした。サマリー送信をスキップします。');
        return;
    }

    const message = formatSummaryReport(data, 'weekly');
    sendDiscordMessage(message);
}

/**
 * 【トリガー用】月末に実行される月次サマリー送信
 */
function sendMonthlySummary(): void {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now);

    const data = generateSummary(startDate, endDate);

    if (data.activityCount === 0) {
        Logger.log('今月のアクティビティはありませんでした。サマリー送信をスキップします。');
        return;
    }

    const message = formatSummaryReport(data, 'monthly');
    sendDiscordMessage(message);
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateSummary,
        sendWeeklySummary,
        sendMonthlySummary
    };
}
