// ==========================================
// ラン・ウォーク (Run / Walk) 専用のフォーマット処理
// ==========================================
function formatPace(averageSpeed: number | undefined): string {
    if (!averageSpeed || averageSpeed <= 0) {
        return "測定なし";
    }
    const secondsPerKm = 1000 / averageSpeed;
    const paceMin = Math.floor(secondsPerKm / 60);
    const paceSec = Math.floor(secondsPerKm % 60)
        .toString()
        .padStart(2, "0");
    return `${paceMin}'${paceSec}" /km`;
}

function makeRunDescription(activity: StravaActivity): string {
    // 共通のメトリクス計算 (DefaultFormatter.ts で定義、GAS環境/vitestでグローバル解決)
    const { distanceKm, timeMin, elevation, hr, weather, aiComment } = getCommonMetrics(activity);

    // ラン専用の計算（ペース）
    const paceText = formatPace(activity.average_speed);
    const weatherLine = weather ? `${weather}` : '';

    const descriptionLines = [
        `距離: ${distanceKm} km`,
        `時間: ${timeMin} 分`,
        `ペース: ${paceText}`,
        `獲得標高: ${elevation} m`,
        `平均心拍数: ${hr}`,
        weatherLine,
    ].filter(Boolean);

    if (aiComment) {
        descriptionLines.push('', `🤖 AIコーチ: ${aiComment}`);
    }

    descriptionLines.push('', `詳細: https://www.strava.com/activities/${activity.id}`);

    return descriptionLines.join('\n');
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        formatPace,
        makeRunDescription,
    };
}
