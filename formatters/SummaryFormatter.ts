// ==========================================
// サマリーレポート用のフォーマット処理 (SummaryFormatter.ts)
// ==========================================

/**
 * サマリーレポートをDiscord向けのメッセージ形式にフォーマットする
 */
function formatSummaryReport(summary: SummaryData, period: 'weekly' | 'monthly'): string {
    const periodText = period === 'weekly' ? '今週' : '今月';
    const tz = Session.getScriptTimeZone();
    const dateRangeText = `${Utilities.formatDate(summary.startDate, tz, 'MM/dd')} 〜 ${Utilities.formatDate(summary.endDate, tz, 'MM/dd')}`;

    const title = `📊 **${periodText}のサマリーレポート (${dateRangeText})**`;

    const totalStats = [
        `総走行距離: **${(summary.totalDistance / 1000).toFixed(1)} km**`,
        `総移動時間: **${formatDuration(summary.totalMovingTime)}**`,
        `総獲得標高: **${summary.totalElevationGain} m**`,
        `総消費カロリー: **${Math.round(summary.totalCalories)} kcal**`,
        `アクティビティ数: **${summary.activityCount} 回**`,
    ].join('\n');

    let typeBreakdown = '';
    const sortedTypes = Object.entries(summary.typeStats).sort((a, b) => b[1].distance - a[1].distance);
    if (sortedTypes.length > 0) {
        typeBreakdown = '\n\n**種目別内訳:**\n' + sortedTypes.map(([type, stats]) => {
            const style = getActivityStyle(type);
            const distText = stats.distance > 0 ? ` / ${(stats.distance / 1000).toFixed(1)} km` : '';
            return `${style.emoji} ${type}: ${stats.count} 回${distText}`;
        }).join('\n');
    }

    let longestActivityText = '';
    if (summary.longestActivity) {
        const longest = summary.longestActivity;
        const style = getActivityStyle(longest.type);
        longestActivityText = `\n\n**最長のアクティビティ:**\n${style.emoji} ${longest.name} (${(longest.distance / 1000).toFixed(1)} km / ${formatDuration(longest.moving_time)})`;
    }

    return `${title}\n\n${totalStats}${typeBreakdown}${longestActivityText}`;
}

/**
 * 秒数を「H時間M分」の形式に変換する
 */
function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}時間${minutes}分`;
    } else {
        return `${minutes}分`;
    }
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatSummaryReport,
        formatDuration,
    };
}
