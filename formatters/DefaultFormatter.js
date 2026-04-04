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

// ==========================================
// アクティビティごとの絵文字と色を定義する関数
// ==========================================
function getActivityStyle(type) {
  const styles = {
    'Walk': { emoji: '🚶', color: CalendarApp.EventColor.GREEN },
    'Run': { emoji: '🏃', color: CalendarApp.EventColor.BLUE },
    'VirtualRun': { emoji: '🏃', color: CalendarApp.EventColor.BLUE },
    'Ride': { emoji: '🚴', color: CalendarApp.EventColor.RED },
    'VirtualRide': { emoji: '🚴', color: CalendarApp.EventColor.RED },
    'Swim': { emoji: '🏊', color: CalendarApp.EventColor.CYAN },
    'Hike': { emoji: '🥾', color: CalendarApp.EventColor.PALE_GREEN },
    'Workout': { emoji: '🏋️', color: CalendarApp.EventColor.ORANGE },
    'WeightTraining': { emoji: '🏋️', color: CalendarApp.EventColor.ORANGE }
  };
  return styles[type] || { emoji: '🏅', color: CalendarApp.EventColor.GRAY };
}

// ==========================================
// アクティビティごとのフォーマット処理を呼び分ける関数
// ==========================================
function makeDescription(activity) {
  console.log(`[DEBUG] activity type: ${activity.type}`);

  if (activity.type === 'Ride' || activity.type === 'VirtualRide') {
    return makeRideDescription(activity);
  } else if (activity.type === 'Run' || activity.type === 'Walk') {
    return makeRunDescription(activity);
  } else {
    // 追加した汎用フォーマッタを呼び出す
    return makeDefaultDescription(activity);
  }
}
