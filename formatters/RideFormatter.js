// ==========================================
// 自転車 (Ride / VirtualRide) 専用のフォーマット処理
// ==========================================
function makeRideDescription(activity) {
  const distanceKm = (activity.distance / 1000).toFixed(1);
  const timeMin = Math.floor(activity.moving_time / 60);
  const elevation = activity.total_elevation_gain || 0;
  const hr = activity.has_heartrate ? `${activity.average_heartrate} bpm` : '測定なし';

  // 自転車専用の計算（時速、パワー、ケイデンス）
  const speedKmh = activity.average_speed ? (activity.average_speed * 3.6).toFixed(1) : 0;
  const wattsText = activity.average_watts ? `平均パワー: ${activity.average_watts} W\n` : '';
  const cadenceText = activity.average_cadence ? `平均ケイデンス: ${activity.average_cadence} rpm\n` : '';

  return `
距離: ${distanceKm} km
時間: ${timeMin} 分
平均速度: ${speedKmh} km/h
獲得標高: ${elevation} m
平均心拍数: ${hr}
${wattsText}${cadenceText}詳細: https://www.strava.com/activities/${activity.id}
  `.trim();
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    makeRideDescription,
  };
}