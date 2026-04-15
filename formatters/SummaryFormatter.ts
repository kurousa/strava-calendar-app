// ==========================================
// サマリーレポートのフォーマット処理 (SummaryFormatter.ts)
// ==========================================

/**
 * 週次・月次のサマリーレポートをフォーマットする
 */
function formatSummaryReport(data: SummaryData, period: 'weekly' | 'monthly'): string {
    const periodTitle = period === 'weekly' ? '今週' : '今月';
    const emoji = period === 'weekly' ? '📅' : '📊';

    const formatDate = (date: Date) => {
        return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
    };

    const periodRange = `${formatDate(data.startDate)} 〜 ${formatDate(data.endDate)}`;

    let message = `${emoji} **${periodTitle}のサマリーレポート** (${periodRange})\n\n`;

    message += `🏃 **総アクティビティ数:** ${data.activityCount}件\n`;
    message += `📏 **総走行距離:** ${data.totalDistanceKm.toFixed(1)} km\n`;
    message += `⏱️ **総運動時間:** ${Math.floor(data.totalMovingTimeMin / 60)}時間${data.totalMovingTimeMin % 60}分\n`;
    message += `⛰️ **総獲得標高:** ${data.totalElevationGain} m\n`;
    if (data.totalCalories > 0) {
        message += `🔥 **総消費カロリー:** ${data.totalCalories} kcal\n`;
    }

    if (data.longestActivity) {
        const longestDist = (data.longestActivity.distance / 1000).toFixed(1);
        const style = getActivityStyle(data.longestActivity.type);
        message += `\n🏆 **最長アクティビティ:**\n`;
        message += `${style.emoji} ${data.longestActivity.name} (${longestDist} km)\n`;
        message += `👉 https://www.strava.com/activities/${data.longestActivity.id}\n`;
    }

    const nextPeriod = period === 'weekly' ? '来週' : '来月';
    message += '\nお疲れ様でした！' + nextPeriod + 'も頑張りましょう！ 💪';

    return message;
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatSummaryReport
    };
}
