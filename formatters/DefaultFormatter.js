// ==========================================
// 汎用 (その他) のフォーマット処理
// ==========================================
function makeDefaultDescription(activity) {
    let descriptionLines = [];

    // 距離 (0より大きければ追加)
    if (activity.distance && activity.distance > 0) {
        const distanceKm = (activity.distance / 1000).toFixed(1);
        descriptionLines.push(`距離: ${distanceKm} km`);
    }

    // 時間 (0より大きければ追加)
    if (activity.moving_time && activity.moving_time > 0) {
        const timeMin = Math.floor(activity.moving_time / 60);
        descriptionLines.push(`時間: ${timeMin} 分`);
    }

    // 獲得標高 (0より大きければ追加)
    if (activity.total_elevation_gain && activity.total_elevation_gain > 0) {
        descriptionLines.push(`獲得標高: ${activity.total_elevation_gain} m`);
    }

    // 平均心拍数 (心拍データがあれば追加)
    if (activity.has_heartrate && activity.average_heartrate) {
        descriptionLines.push(`平均心拍数: ${activity.average_heartrate} bpm`);
    }

    // 空行を挟んで詳細リンクを追加
    descriptionLines.push('');
    descriptionLines.push(`詳細: https://www.strava.com/activities/${activity.id}`);

    // 配列の中身を改行で繋げて文字列にする
    return descriptionLines.join('\n').trim();
}