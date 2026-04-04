// ==========================================
// 認証周りの役割 (auth.js)
// OAuth2ライブラリを使った、Stravaとのログイン（認証）に関する処理をまとめたファイルです。
// ==========================================

const scriptProps = PropertiesService.getScriptProperties();
const CLIENT_ID = scriptProps.getProperty('STRAVA_CLIENT_ID');
const CLIENT_SECRET = scriptProps.getProperty('STRAVA_CLIENT_SECRET');

/**
 * Strava連携のためのOAuth2サービスを取得する
 */
function getOAuthService() {
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

/**
 * 認証が完了した後に呼ばれる処理
 */
function authCallback(request) {
  const service = getOAuthService();
  const authorized = service.handleCallback(request);
  if (authorized) {
    return HtmlService.createHtmlOutput('認証が成功しました！このタブは閉じて、GASの画面に戻ってください。');
  } else {
    return HtmlService.createHtmlOutput('認証に失敗しました。');
  }
}

/**
 * 実行用：ここから認証をスタートします
 */
function startAuth() {
  const service = getOAuthService();

  if (service.hasAccess()) {
    Logger.log('すでにStravaとの連携（認証）は完了しています！');
  } else {
    const authorizationUrl = service.getAuthorizationUrl();
    Logger.log('以下のURLをコピーして、ブラウザの新しいタブで開いてください:');
    Logger.log(authorizationUrl);
  }
}

/**
 * 連携を解除したい時用の関数（普段は使いません）
 */
function resetAuth() {
  getOAuthService().reset();
  Logger.log('連携を解除しました。');
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

  const subject = '【Strava連携エラー】再認証が必要です';
  const body = 'Stravaとの連携でエラーが発生しました。\n\nエラー内容:\n' + message + '\n\nGASを開いてstartAuthを再実行してください。';

  MailApp.sendEmail(email, subject, body);
  props.setProperty('LAST_ERROR_NOTIFIED_AT', now.toString());
  Logger.log('エラーメールを送信しました: ' + email);
}
