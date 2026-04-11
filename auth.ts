// ==========================================
// 認証周りの役割 (auth.ts)
// OAuth2ライブラリを使った、Stravaとのログイン（認証）に関する処理をまとめたファイルです。
// ==========================================

// OAuth2ライブラリはGAS標準型定義に含まれないため、グローバル宣言を追加
declare const OAuth2: any;



/**
 * Strava連携のためのOAuth2サービスを取得する
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getOAuthService(): any {
    const props = PropertiesService.getScriptProperties().getProperties();
    const CLIENT_ID = props['STRAVA_CLIENT_ID'];
    const CLIENT_SECRET = props['STRAVA_CLIENT_SECRET'];
    const STRAVA_SCOPE = props['STRAVA_SCOPE'];
    if (!CLIENT_ID || !CLIENT_SECRET) {
        throw new Error('STRAVA_CLIENT_ID または STRAVA_CLIENT_SECRET がスクリプトプロパティに設定されていません。');
    }
    return OAuth2.createService('Strava')
        .setAuthorizationBaseUrl('https://www.strava.com/oauth/authorize')
        .setTokenUrl('https://www.strava.com/oauth/token')
        .setClientId(CLIENT_ID)
        .setClientSecret(CLIENT_SECRET)
        .setCallbackFunction('authCallback')
        .setPropertyStore(PropertiesService.getUserProperties())
        .setScope(STRAVA_SCOPE || 'activity:read_all,profile:read_all');
}

/**
 * 認証が完了した後に呼ばれる処理
 */
function authCallback(request: object): GoogleAppsScript.HTML.HtmlOutput {
    const service = getOAuthService();
    const authorized = service.handleCallback(request);
    if (authorized) {
        return HtmlService.createHtmlOutput('認証が成功しました。このタブは閉じて、GASの画面に戻ってください。');
    } else {
        return HtmlService.createHtmlOutput('認証に失敗しました。');
    }
}

/**
 * 実行用：ここから認証をスタートします
 */
function startAuth(): void {
    const service = getOAuthService();

    if (service.hasAccess()) {
        Logger.log('すでにStravaとの連携は完了しています');
    } else {
        const authorizationUrl = service.getAuthorizationUrl();
        Logger.log('以下のURLをコピーして、ブラウザの新しいタブで開いてください:');
        Logger.log(authorizationUrl);
    }
}

/**
 * 連携を解除したい時用の関数（普段は使いません）
 */
function resetAuth(): void {
    getOAuthService().reset();
    Logger.log('連携を解除しました。');
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getOAuthService,
        authCallback,
        startAuth,
        resetAuth,
    };
}
