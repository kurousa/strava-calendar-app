// ==========================================
// 自転車 (Ride / VirtualRide) 専用のフォーマット処理
// ==========================================
function makeRideDescription(activity: StravaActivity): string {
    // 共通のメトリクス計算 (DefaultFormatter.ts で定義、GAS環境/vitestでグローバル解決)
    const { distanceKm, timeMin, elevation, hr, weather } = getCommonMetrics(activity);

    // 自転車専用の計算（時速、パワー、ケイデンス）
    const speedKmh = activity.average_speed ? (activity.average_speed * 3.6).toFixed(1) : 0;
    const wattsText = activity.average_watts ? `平均パワー: ${activity.average_watts} W` : '';
    const cadenceText = activity.average_cadence ? `平均ケイデンス: ${activity.average_cadence} rpm` : '';
    const weatherLine = weather ? `${weather}` : '';

    const descriptionLines = [
        `距離: ${distanceKm} km`,
        `時間: ${timeMin} 分`,
        `平均速度: ${speedKmh} km/h`,
        `獲得標高: ${elevation} m`,
        `平均心拍数: ${hr}`,
        wattsText,
        cadenceText,
        weatherLine,
    ].filter(Boolean);

    descriptionLines.push('', `詳細: https://www.strava.com/activities/${activity.id}`);

    return descriptionLines.join('\n');
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        makeRideDescription,
    };
}
