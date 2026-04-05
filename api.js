// ==========================================
// API通信・データ取得の役割 (api.js)
// Stravaのサーバーとお話をして、データを取ってくる役割だけを持ったファイルです。
// ==========================================

const API_BASE = "https://www.strava.com/api/v3";
/**
 * Stravaから直近のアクティビティを取得する
 */
function getStravaActivities(afterDate, beforeDate, per_page = 200) {
  const service = getOAuthService();
  if (!service.hasAccess()) {
    const errorMsg = 'Stravaと連携されていません。startAuthを実行してください。';
    Logger.log('エラー: ' + errorMsg);
    sendErrorEmail(errorMsg);
    return [];
  }

  // 1. ベースとなるURL
  let url = `${API_BASE}/athlete/activities`;

  // 2. パラメータの取得
  const params = getSearchParam(afterDate, beforeDate, per_page);

  // 3. オブジェクトをクエリ文字列 (?key=value&...) に変換してURLに結合
  const queryString = Object.keys(params)
    .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(params[key]))
    .join('&');

  if (queryString) {
    url += '?' + queryString;
  }

  console.log(url); // 組み立てられたURLを確認

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

/**
 * アクティビティ取得のための検索パラメータを組み立てる
 */
function getSearchParam(afterDate, beforeDate, per_page) {
  const params = {
    per_page: per_page
  };

  // 開始時間のデフォルト設定 (指定がなければ1日前)
  if (afterDate) {
    params.after = convertToTime(afterDate);
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    params.after = convertToTime(yesterday);
  }

  // 終了時間のデフォルト設定 (指定がなければ今)
  if (beforeDate) {
    params.before = convertToTime(beforeDate);
  } else {
    const today = new Date();
    params.before = convertToTime(today);
  }

  return params;
}

function convertToTime(date) {
  return Math.floor(date.getTime() / 1000);
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getStravaActivities,
    getSearchParam,
    convertToTime,
  };
}