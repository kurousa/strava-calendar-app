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
    Logger.log('エラー: Stravaと連携されていません。startAuthを実行してください。');
    return [];
  }

  // 昨日（1日前）の時間を計算（UNIXタイムスタンプ）
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const afterTime = Math.floor(yesterday.getTime() / 1000);

  // StravaのAPIにアクセス
  const url = `https://www.strava.com/api/v3/athlete/activities?after=${afterTime}`;
  const response = UrlFetchApp.fetch(url, {
    headers: {
      Authorization: 'Bearer ' + service.getAccessToken()
    }
  });

  const activities = JSON.parse(response.getContentText());
  Logger.log(`${activities.length}件のアクティビティが見つかりました。`);
  return activities;
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

    // カレンダーに登録するタイトル（例: [Run] 朝のジョギング - 5.2km）
    const type = activity.type; // 種類（Run, Rideなど）
    const distanceKm = (activity.distance / 1000).toFixed(1); // 距離をkmに変換
    const title = `[${type}] ${activity.name} - ${distanceKm}km`;

    // カレンダーに登録する詳細メモ（リンクなどを入れておくと便利です）
    const description = `
距離: ${distanceKm} km
時間: ${Math.floor(activity.moving_time / 60)} 分
詳細: https://www.strava.com/activities/${activity.id}
    `;

    Logger.log("[DEBUG]以下の情報がカレンダーに登録されます");
    Logger.log("[DEBUG]title -> " + title);
    Logger.log("[DEBUG]startTime -> " + startTime);
    Logger.log("[DEBUG]endTime -> " + endTime);
    Logger.log("[DEBUG]description -> " + description);

    // カレンダーに予定として作成
    calendar.createEvent(title, startTime, endTime, {
      description: description
    });
    
    Logger.log(`カレンダーに登録しました: ${title}`);
  });
}