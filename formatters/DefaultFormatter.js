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

/**
 * Object.freeze をネストされたオブジェクトにも適用するヘルパー関数
 */
function deepFreeze(object) {
  const propNames = Object.getOwnPropertyNames(object);
  for (const name of propNames) {
    const value = object[name];
    // CalendarApp.EventColor などのGAS固有のプロキシオブジェクトを
    // 再帰的に freeze するとパフォーマンスが極端に悪化するため、
    // プレーンなオブジェクト（または配列）のみを対象とする
    if (value && typeof value === 'object' && (value.constructor === Object || value.constructor === Array)) {
      deepFreeze(value);
    }
  }
  return Object.freeze(object);
}

// アクティビティごとの絵文字と色の定義
// CalendarApp.EventColor への参照は、Node.js環境での ReferenceError 回避のため
// 関数呼び出し時に解決されるように遅延評価するか、またはモックが存在することを確認する必要があります。
// ここでは、定義自体を関数内にカプセル化して、初回呼び出し時に初期化するパターンを採用します。
let ACTIVITY_STYLES_CACHE = null;
let DEFAULT_ACTIVITY_STYLE_CACHE = null;

function initStyles() {
  if (ACTIVITY_STYLES_CACHE) return;

  ACTIVITY_STYLES_CACHE = deepFreeze({
    'Walk': { emoji: '🚶', color: CalendarApp.EventColor.GREEN },
    'Run': { emoji: '🏃', color: CalendarApp.EventColor.BLUE },
    'VirtualRun': { emoji: '🏃', color: CalendarApp.EventColor.BLUE },
    'Ride': { emoji: '🚴', color: CalendarApp.EventColor.RED },
    'VirtualRide': { emoji: '🚴', color: CalendarApp.EventColor.RED },
    'Swim': { emoji: '🏊', color: CalendarApp.EventColor.CYAN },
    'Hike': { emoji: '🥾', color: CalendarApp.EventColor.PALE_GREEN },
    'Workout': { emoji: '🏋️', color: CalendarApp.EventColor.ORANGE },
    'WeightTraining': { emoji: '🏋️', color: CalendarApp.EventColor.ORANGE }
  });

  DEFAULT_ACTIVITY_STYLE_CACHE = Object.freeze({ emoji: '🏅', color: CalendarApp.EventColor.GRAY });
}

// ==========================================
// アクティビティごとの絵文字と色を定義する関数
// ==========================================
function getActivityStyle(type) {
  initStyles();
  return ACTIVITY_STYLES_CACHE[type] || DEFAULT_ACTIVITY_STYLE_CACHE;
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

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    makeDefaultDescription,
    getActivityStyle,
    makeDescription
  };
}
