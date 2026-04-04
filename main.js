// ==========================================
// メインの処理とカレンダー操作 (main.js)
// プログラムの入り口（タイマーから実行される関数）と、
// カレンダーへの書き込みといった「このアプリのメインのお仕事」だけを残します。
// ==========================================

const CALENDAR_ID = PropertiesService.getScriptProperties().getProperty('CALENDAR_ID');

/**
 * 取得したアクティビティをGoogleカレンダーに登録する
 */
function main() {
  const activities = getStravaActivities();
  if (activities.length === 0) {
    Logger.log('登録するアクティビティがありませんでした。');
    return;
  }
  Logger.log("[DEBUG]取得できたアクティビティのsample" + JSON.stringify(activities[0]));

  // カレンダーの取得（IDが指定されていればそれを使用、なければデフォルトを使用）
  let calendar;
  if (CALENDAR_ID) {
    calendar = CalendarApp.getCalendarById(CALENDAR_ID);
    if (!calendar) {
      Logger.log('エラー: 指定されたカレンダーが見つかりません。カレンダーIDを確認してください。');
      return;
    }
  } else {
    calendar = CalendarApp.getDefaultCalendar();
    Logger.log('※カレンダーIDが設定されていないため、デフォルトのカレンダーに登録します。');
  }
  Logger.log(`[DEBUG]登録先calendar: ${calendar.getName()}`);

  // 距離を表示するアクティビティのリスト
  const distanceActivities = [
    'Run', 'Ride', 'Walk', 'Hike', 'Swim', 'AlpineSki', 'BackcountrySki', 'NordicSki', 'RollerSki',
    'Canoeing', 'Kayaking', 'Rowing', 'StandUpPaddling', 'Surfing', 'Sail', 'Windsurf', 'IceSkate',
    'InlineSkate', 'Skateboard', 'Snowshoe', 'Kitesurf', 'VirtualRide', 'VirtualRun', 'GravelRide',
    'MountainBikeRide', 'EMountainBikeRide', 'Velomobile', 'Handcycle', 'Wheelchair'
  ];

  activities.forEach(activity => {
    // 時間の計算（Stravaは世界標準時なので、日本時間に合わせる必要があります）
    const startTime = new Date(activity.start_date);
    const endTime = new Date(startTime.getTime() + (activity.elapsed_time * 1000));

    // 既に登録済みのアクティビティかどうかを判定する (in-lined)
    const existingEvents = calendar.getEvents(startTime, endTime);
    const isDuplicate = existingEvents.some(event => {
      const desc = event.getDescription();
      return desc && desc.includes(`strava.com/activities/${activity.id}`);
    });

    if (isDuplicate) {
      Logger.log(`スキップ: 既に登録済みのアクティビティです: ${activity.id}`);
      return;
    }

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
    event.setColor(style.color);

    Logger.log(`カレンダーに登録しました: ${title}`);
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
