// ==========================================
// メインの処理とカレンダー操作 (main.js)
// プログラムの入り口（タイマーから実行される関数）と、
// カレンダーへの書き込みといった「このアプリのメインのお仕事」だけを残します。
// ==========================================

const CALENDAR_ID = PropertiesService.getScriptProperties().getProperty('CALENDAR_ID');
// 距離を表示するアクティビティのリスト
const DISTANCE_ACTIVITIES = [
  'Run', 'Ride', 'Walk', 'Hike', 'Swim', 'AlpineSki', 'BackcountrySki', 'NordicSki', 'RollerSki',
  'Canoeing', 'Kayaking', 'Rowing', 'StandUpPaddling', 'Surfing', 'Sail', 'Windsurf', 'IceSkate',
  'InlineSkate', 'Skateboard', 'Snowshoe', 'Kitesurf', 'VirtualRide', 'VirtualRun', 'GravelRide',
  'MountainBikeRide', 'EMountainBikeRide', 'Velomobile', 'Handcycle', 'Wheelchair'
];

/**
 * 取得したアクティビティをGoogleカレンダーに登録する
 */
function main() {
  // 実行時刻の1日前から現在時刻までのアクティビティを取得
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const activities = getStravaActivities(yesterday, new Date());
  if (activities.length === 0) {
    Logger.log('登録するアクティビティがありませんでした。');
    return;
  }
  Logger.log("[DEBUG]取得できたアクティビティのsample" + JSON.stringify(activities[0]));

  // カレンダーの取得（IDが指定されていればそれを使用、なければデフォルトを使用）
  const calendar = getTargetCalendar();
  if (!calendar) {
    Logger.log('カレンダーの取得に失敗しました。');
    return;
  }
  Logger.log(`[DEBUG]登録先calendar: ${calendar.getName()}`);

  activities.forEach(activity => {
    processActivityToCalendar(activity, calendar);
  });
}

/**
 * エラーをメールで通知する
 * @param {string} message - エラーメッセージ
 */
function sendErrorEmail(message) {
  const email = Session.getEffectiveUser().getEmail();
  if (!email) {
    Logger.log('通知先メールアドレスを取得できなかったため、メール送信をスキップしました。');
    return;
  }

  const props = PropertiesService.getUserProperties();
  const lastNotified = props.getProperty('LAST_ERROR_NOTIFIED_AT');
  const now = new Date().getTime();
  if (lastNotified && now - parseInt(lastNotified) < 24 * 60 * 60 * 1000) {
    return;
  }

  const subject = '【Stravaアクティビティ連携】Stravaとの連携でエラーが発生しました。';
  const body = 'Stravaとの連携でエラーが発生しました。\n\nエラー内容:\n' + message;

  MailApp.sendEmail(email, subject, body);
  props.setProperty('LAST_ERROR_NOTIFIED_AT', now.toString());
  Logger.log('エラーメールを送信しました: ' + email);
}

// ==========================================
// アクティビティをカレンダーに登録する共通処理
// ==========================================
function processActivityToCalendar(activity, calendar, distanceActivities = DISTANCE_ACTIVITIES) {
  // 時間の計算（Stravaは世界標準時なので、日本時間に合わせる必要があります）
  const startTime = new Date(activity.start_date);
  const endTime = new Date(startTime.getTime() + (activity.elapsed_time * 1000));

  // 既に登録済みのアクティビティかどうかを判定する (in-lined)
  // ⚡ Bolt: manual_import で事前フィルタリングされるようになりましたが、
  // 日次バッチ (main) のために念のためここでもチェックを残します。
  const existingEvents = calendar.getEvents(startTime, endTime);
  const isDuplicate = existingEvents.some(event => {
    const desc = event.getDescription();
    return desc && desc.includes(`strava.com/activities/${activity.id}`);
  });

  if (isDuplicate) {
    Logger.log(`スキップ: 既に登録済みのアクティビティです: ${activity.id}`);
    return 'skipped';
  }

  // ーーー ここから下は「新規」の時しか実行されない ーーー

  // カレンダーに登録するタイトル（例: [Run] 朝のジョギング - 5.2km）
  const type = activity.type; // 種類（Run, Rideなど）
  const style = getActivityStyle(type);
  const distanceKm = (activity.distance / 1000).toFixed(1); // 距離をkmに変換

  // 距離を表示するアクティビティかどうかの判定
  const hasDistance = distanceActivities.includes(type) && activity.distance > 0;

  const title = hasDistance ? `[${type}] ${activity.name} - ${distanceKm}km` : `[${type}] ${activity.name}`;

  // カレンダーに登録する詳細メモ
  const description = makeDescription(activity);

  Logger.log("[DEBUG]以下の情報がカレンダーに登録されます");
  Logger.log("[DEBUG]title -> " + title);
  Logger.log("[DEBUG]startTime -> " + startTime);
  Logger.log("[DEBUG]endTime -> " + endTime);
  Logger.log("[DEBUG]description -> " + description);

  // カレンダーに予定として作成
  const event = calendar.createEvent(title, startTime, endTime, {
    description: description
  });
  // イベントに色を設定する
  if (style.color) {
    event.setColor(style.color);
  }

  // カレンダーAPIの連続作成制限を回避しつつ、GASの実行時間制限(6分)に配慮
  // 重複スキップ時は待機せず、カレンダーへの新規書き込みが行われた直後のみ短時間(200ms)待機する
  Utilities.sleep(200);

  Logger.log(`カレンダーに登録しました: ${title}`);
  return 'success';
}

// ==========================================
// カレンダー取得ユーティリティ
// ==========================================
function getTargetCalendar() {
  if (CALENDAR_ID) {
    const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
    if (!calendar) {
      Logger.log('エラー: 指定されたカレンダーが見つかりません。');
    }
    return calendar;
  }
  return CalendarApp.getDefaultCalendar();
}

// ==========================================
// 【Webアプリ用】インポート画面（HTML）を表示する
// ==========================================
function doGet() {
  // 'index' という名前のHTMLファイルを読み込んで表示する
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Strava カレンダーインポート');
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    sendErrorEmail,
  };
}