// ==========================================
// API通信・データ取得の役割 (api.js)
// Stravaのサーバーとお話をして、データを取ってくる役割だけを持ったファイルです。
// ==========================================

/**
 * 1. Stravaから直近のアクティビティを取得する
 */
function getStravaActivities() {
  const service = getOAuthService();
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
