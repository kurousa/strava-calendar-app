// ==========================================
// ラン・ウォーク (Run / Walk) 専用のフォーマット処理
// ==========================================
function makeRunDescription(activity) {
    const distanceKm = (activity.distance / 1000).toFixed(1);
    const timeMin = Math.floor(activity.moving_time / 60);
    const elevation = activity.total_elevation_gain || 0;
    const hr = activity.has_heartrate ? `${activity.average_heartrate} bpm` : '測定なし';

    // ラン専用の計算（ペース）
    let paceText = '測定なし';
    if (activity.average_speed > 0) {
        const secondsPerKm = 1000 / activity.average_speed;
        const paceMin = Math.floor(secondsPerKm / 60);
        const paceSec = Math.floor(secondsPerKm % 60).toString().padStart(2, '0');
        paceText = `${paceMin}'${paceSec}" /km`;
    }

    return `
距離: ${distanceKm} km
時間: ${timeMin} 分
ペース: ${paceText}
獲得標高: ${elevation} m
平均心拍数: ${hr}

詳細: https://www.strava.com/activities/${activity.id}
  `.trim();
}