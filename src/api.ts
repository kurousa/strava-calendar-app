import { getOAuthService } from './auth';
import { sendErrorEmail } from './main';

const API_BASE = "https://www.strava.com/api/v3";
// Strava APIのレート制限（連続アクセス制限）対策の待機時間 (ms)
const STRAVA_API_DELAY_MS = 200;

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  start_date: string;
  elapsed_time: number;
  distance: number;
  moving_time: number;
  total_elevation_gain: number;
  has_heartrate: boolean;
  average_heartrate: number;
  average_speed: number;
  average_watts?: number;
  average_cadence?: number;
  [key: string]: any;
}

/**
 * Stravaから指定期間のアクティビティを全件取得する（ページネーション対応）
 */
export function getStravaActivities(afterDate?: Date, beforeDate?: Date, perPage: number = 200): StravaActivity[] {
  const service = getOAuthService();
  if (!service.hasAccess()) {
    const errorMsg = 'Stravaと連携されていません。startAuthを実行してください。';
    Logger.log('エラー: ' + errorMsg);
    sendErrorEmail(errorMsg);
    return [];
  }

  let allActivities: StravaActivity[] = [];
  let page = 1;

  // 1. ベースとなる検索パラメータを取得
  const baseParams = getSearchParam(afterDate, beforeDate, perPage);

  // 2. データがなくなるまで繰り返し取得する
  while (true) {
    // 現在のページ番号をパラメータに追加
    const currentParams: Record<string, string | number> = { ...baseParams, page: page };

    // オブジェクトをクエリ文字列 (?key=value&...) に変換してURLに結合
    const queryString = Object.keys(currentParams)
      .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(currentParams[key] as string | number))
      .join('&');

    const url = `${API_BASE}/athlete/activities?${queryString}`;
    console.log(`[API Request] URL: ${url}`);

    try {
      const response = UrlFetchApp.fetch(url, {
        headers: {
          Authorization: 'Bearer ' + service.getAccessToken()
        },
        muteHttpExceptions: true
      });

      if (response.getResponseCode() !== 200) {
        Logger.log(`[API Error] ${response.getContentText()}`);
        break; // エラー時はループを抜ける
      }

      const activities: StravaActivity[] = JSON.parse(response.getContentText());

      // 取得できたデータが0件ならループを抜ける
      if (activities.length === 0) {
        break;
      }

      // 取得したデータを全体の配列に追加
      allActivities = allActivities.concat(activities);
      Logger.log(`ページ ${page} から ${activities.length} 件取得しました...`);

      // 取得件数が要求したperPage未満なら、次のページは無いと判断してループを抜ける
      if (activities.length < perPage) {
        break;
      }

      page++;

      // Strava APIのレート制限（連続アクセス制限）対策
      Utilities.sleep(STRAVA_API_DELAY_MS);

    } catch (e: any) {
      const errorMsg = 'Strava APIの呼び出しに失敗しました: ' + e.toString();
      Logger.log('エラー: ' + errorMsg);
      sendErrorEmail(errorMsg);
      break;
    }
  }

  Logger.log(`合計 ${allActivities.length}件のアクティビティが見つかりました。`);
  return allActivities;
}

/**
 * アクティビティ取得のための検索パラメータを組み立てる
 */
export function getSearchParam(afterDate?: Date, beforeDate?: Date, perPage?: number): Record<string, string | number> {
  const params: Record<string, string | number> = {
  };

  if (perPage) {
      params.per_page = perPage;
  }

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

export function convertToTime(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}
