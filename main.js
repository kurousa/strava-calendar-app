// ==========================================
// 初期設定：スクリプトプロパティからIDとシークレットを取得
// ==========================================
const scriptProps = PropertiesService.getScriptProperties();
const CLIENT_ID = scriptProps.getProperty('STRAVA_CLIENT_ID');
const CLIENT_SECRET = scriptProps.getProperty('STRAVA_CLIENT_SECRET');
const CALENDAR_ID = scriptProps.getProperty('CALENDAR_ID');

// ==========================================
// Strava連携のための設定（ここは変更不要です）
// ==========================================
function getStravaService() {
  return OAuth2.createService('Strava')
    .setAuthorizationBaseUrl('https://www.strava.com/oauth/authorize')
    .setTokenUrl('https://www.strava.com/oauth/token')
    .setClientId(CLIENT_ID)
    .setClientSecret(CLIENT_SECRET)
    .setCallbackFunction('authCallback')
    .setPropertyStore(PropertiesService.getUserProperties())
    // activity:read_all で非公開アクティビティも含めて読み取り権限を要求します
    .setScope('activity:read_all');
}

// 認証が完了した後に呼ばれる処理
function authCallback(request) {
  const service = getStravaService();
  const authorized = service.handleCallback(request);
  if (authorized) {
    return HtmlService.createHtmlOutput('認証が成功しました！このタブは閉じて、GASの画面に戻ってください。');
  } else {
    return HtmlService.createHtmlOutput('認証に失敗しました。');
  }
}

// ==========================================
// 実行用：ここから認証をスタートします
// ==========================================
function startAuth() {
  const service = getStravaService();

  if (service.hasAccess()) {
    Logger.log('すでにStravaとの連携（認証）は完了しています！');
  } else {
    const authorizationUrl = service.getAuthorizationUrl();
    Logger.log('以下のURLをコピーして、ブラウザの新しいタブで開いてください:');
    Logger.log(authorizationUrl);
  }
}

// 連携を解除したい時用の関数（普段は使いません）
function resetAuth() {
  getStravaService().reset();
  Logger.log('連携を解除しました。');
}

// ==========================================
// カレンダー連携：ここからがメインの処理です
// ==========================================

// 1. Stravaから直近のアクティビティを取得する
function fetchStravaActivities() {
  const service = getStravaService();
  if (!service.hasAccess()) {
    const errorMsg = 'Stravaと連携されていません。startAuthを実行してください。';
    Logger.log('エラー: ' + errorMsg);
    sendErrorEmail(errorMsg);
    return [];
  }

  // 昨日（1日前）の時間を計算（UNIXタイムスタンプ）
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const afterTime = Math.floor(yesterday.getTime() / 1000);

  // StravaのAPIにアクセス
  const url = `https://www.strava.com/api/v3/athlete/activities?after=${afterTime}`;
  try {
    const response = UrlFetchApp.fetch(url, {
      headers: {
        Authorization: 'Bearer ' + service.getAccessToken()
      }
    });

    const activities = JSON.parse(response.getContentText());
    Logger.log(`${activities.length}件のアクティビティが見つかりました。`);
    return activities;
  } catch (e) {
    const errorMsg = 'Strava APIの呼び出しに失敗しました: ' + e.toString();
    Logger.log('エラー: ' + errorMsg);
    sendErrorEmail(errorMsg);
    return [];
  }
}

// 2. 取得したアクティビティをGoogleカレンダーに登録する
function syncStravaToCalendar() {
  const activities = fetchStravaActivities();
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

  activities.forEach(activity => {
    // 時間の計算（Stravaは世界標準時なので、日本時間に合わせる必要があります）
    const startTime = new Date(activity.start_date);
    const endTime = new Date(startTime.getTime() + (activity.elapsed_time * 1000));

    // 既に登録済みのアクティビティかどうかを判定する
    if (isAlreadyRegisteredActivity(calendar, activity.id, startTime, endTime)) {
      return;
    }

    // カレンダーに登録するタイトル（例: [Run] 朝のジョギング - 5.2km）
    const type = activity.type; // 種類（Run, Rideなど）
    const style = getActivityStyle(type);
    const distanceKm = (activity.distance / 1000).toFixed(1); // 距離をkmに変換

    // 距離を表示するアクティビティかどうかの判定
    const distanceActivities = [
      'Run', 'Ride', 'Walk', 'Hike', 'Swim', 'AlpineSki', 'BackcountrySki', 'NordicSki', 'RollerSki',
      'Canoeing', 'Kayaking', 'Rowing', 'StandUpPaddling', 'Surfing', 'Sail', 'Windsurf', 'IceSkate',
      'InlineSkate', 'Skateboard', 'Snowshoe', 'Kitesurf', 'VirtualRide', 'VirtualRun', 'GravelRide',
      'MountainBikeRide', 'EMountainBikeRide', 'Velomobile', 'Handcycle', 'Wheelchair'
    ];
    const hasDistance = distanceActivities.some(t => type.includes(t)) && activity.distance > 0;

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

// ヘルパーメソッド

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

  const subject = '【Strava連携エラー】再認証が必要です';
  const body = 'Stravaとの連携でエラーが発生しました。\n\nエラー内容:\n' + message + '\n\nGASを開いてstartAuthを再実行してください。';

  MailApp.sendEmail(email, subject, body);
  props.setProperty('LAST_ERROR_NOTIFIED_AT', now.toString());
  Logger.log('エラーメールを送信しました: ' + email);
}

// ==========================================
// 既に登録済みのアクティビティかどうかを判定する
// ==========================================
function isAlreadyRegisteredActivity(calendar, activityId, startTime, endTime) {
  // 登録しようとしている時間帯の予定をカレンダーから取得
  const existingEvents = calendar.getEvents(startTime, endTime);

  // 取得した予定の中に、同じStravaのアクティビティIDが含まれているか確認
  const isDuplicate = existingEvents.some(event => {
    const desc = event.getDescription();
    return desc && desc.includes(`strava.com/activities/${activityId}`);
  });

  if (isDuplicate) {
    Logger.log(`スキップ: 既に登録済みのアクティビティです: ${activityId}`);
    return true;
  }
  return false;
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
