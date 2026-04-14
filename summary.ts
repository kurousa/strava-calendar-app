// ==========================================
// サマリーレポートのロジック (summary.ts)
// ==========================================

/**
 * 週間サマリーを生成してDiscordに送信する（GASトリガーから実行）
 */
function generateWeeklySummary(): void {
    generateSummary('weekly');
}

/**
 * 月間サマリーを生成してDiscordに送信する（GASトリガーから実行）
 */
function generateMonthlySummary(): void {
    generateSummary('monthly');
}

/**
 * サマリーを生成して送信するメインロジック
 */
function generateSummary(period: 'weekly' | 'monthly'): void {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (period === 'weekly') {
        // 今週の月曜日 00:00:00 から 日曜日 23:59:59 まで
        const day = now.getDay(); // 0:日, 1:月, ...
        const diffToMonday = day === 0 ? 6 : day - 1;
        startDate = new Date(now);
        startDate.setDate(now.getDate() - diffToMonday);
        startDate.setHours(0, 0, 0, 0);

        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
    } else {
        // 今月の1日 00:00:00 から 末日 23:59:59 まで
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    Logger.log(`[Summary] 期間: ${startDate.toLocaleString()} 〜 ${endDate.toLocaleString()}`);

    const activities = getStravaActivities(startDate, endDate);
    if (activities.length === 0) {
        Logger.log('期間内にアクティビティが見つかりませんでした。サマリーの送信をスキップします。');
        return;
    }

    const summaryData = aggregateActivities(activities, startDate, endDate);
    const message = formatSummaryReport(summaryData, period);

    if (typeof sendDiscordMessage === 'function') {
        sendDiscordMessage(message);
    } else {
        Logger.log('sendDiscordMessage が定義されていません。');
        Logger.log('Summary Message:\n' + message);
    }
}

/**
 * アクティビティの一覧から統計データを集計する
 */
function aggregateActivities(activities: StravaActivity[], startDate: Date, endDate: Date): SummaryData {
    const summary: SummaryData = {
        totalDistance: 0,
        totalMovingTime: 0,
        totalElevationGain: 0,
        totalCalories: 0,
        activityCount: activities.length,
        longestActivity: null,
        typeStats: {},
        startDate: startDate,
        endDate: endDate
    };

    activities.forEach(activity => {
        summary.totalDistance += activity.distance || 0;
        summary.totalMovingTime += activity.moving_time || 0;
        summary.totalElevationGain += activity.total_elevation_gain || 0;
        summary.totalCalories += activity.calories || 0;

        // 種目別の統計
        const type = activity.type;
        if (!summary.typeStats[type]) {
            summary.typeStats[type] = { count: 0, distance: 0, movingTime: 0 };
        }
        summary.typeStats[type].count++;
        summary.typeStats[type].distance += activity.distance || 0;
        summary.typeStats[type].movingTime += activity.moving_time || 0;

        // 最長のアクティビティ（距離ベース）
        if (!summary.longestActivity || (activity.distance || 0) > (summary.longestActivity.distance || 0)) {
            summary.longestActivity = activity;
        }
    });

    return summary;
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateWeeklySummary,
        generateMonthlySummary,
        generateSummary,
        aggregateActivities,
    };
}
