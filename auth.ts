// ==========================================
// 認証周りの役割 (auth.ts)
// OAuth2ライブラリを使った、Stravaとのログイン（認証）に関する処理をまとめたファイルです。
// ==========================================

// OAuth2ライブラリはGAS標準型定義に含まれないため、グローバル宣言を追加
declare const OAuth2: any;

let cachedStravaClientId: string | null = null;
let cachedStravaClientSecret: string | null = null;
let cachedStravaScope: string | null = null;
let cachedGoogleClientId: string | null = null;
let cachedAllowedEmails: string | null = null;

/**
 * Strava連携のためのOAuth2サービスを取得する
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getOAuthService(): any {
    if (cachedStravaClientId === null) {
        const scriptProps = PropertiesService.getScriptProperties();
        cachedStravaClientId = scriptProps.getProperty(Config.PROP_STRAVA_CLIENT_ID) || '';
        cachedStravaClientSecret = scriptProps.getProperty(Config.PROP_STRAVA_CLIENT_SECRET) || '';
        cachedStravaScope = scriptProps.getProperty(Config.PROP_STRAVA_SCOPE) || '';
    }
    const CLIENT_ID = cachedStravaClientId;
    const CLIENT_SECRET = cachedStravaClientSecret;
    const STRAVA_SCOPE = cachedStravaScope;

    if (!CLIENT_ID || !CLIENT_SECRET) {
        throw new Error(`${Config.PROP_STRAVA_CLIENT_ID} または ${Config.PROP_STRAVA_CLIENT_SECRET} がスクリプトプロパティに設定されていません。`);
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

/**
 * Google ID Tokenを検証し、許可されたユーザーか確認する
 */
function verifyGoogleToken(idToken: string): boolean {

    if (!idToken) return false;
    
    // JWT形式 (Header.Payload.Signature) かどうかを簡単な正規表現で検証
    // Base64Urlエンコードされた文字列の3つの部分がドットで連結されていることを確認
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
    if (!jwtRegex.test(idToken)) {
        Logger.log('エラー: IDトークンの形式が正しくありません。');
        return false;
    }

    try {
        // Googleの公式検証エンドポイントを叩く
        const response = UrlFetchApp.fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
        const tokenInfo = JSON.parse(response.getContentText());
        
        // 1. クライアントIDが自分のReactアプリのものか確認
        if (cachedGoogleClientId === null || cachedAllowedEmails === null) {
             const props = PropertiesService.getScriptProperties();
             cachedGoogleClientId = props.getProperty(Config.PROP_GOOGLE_CLIENT_ID) || "";
             cachedAllowedEmails = props.getProperty(Config.PROP_ALLOWED_EMAILS) || "";
        }
        
        const expectedClientId = cachedGoogleClientId;
        if (!expectedClientId || tokenInfo.aud !== expectedClientId) {
            Logger.log('エラー: クライアントIDが未設定、またはIDトークンの aud が一致しません。');
            return false;
        }
        
        // 2. 許可されたメールアドレスか確認
        const email = tokenInfo.email;
        if (!email) return false;
        
        const allowedEmails = cachedAllowedEmails;
        const allowedList = allowedEmails.split(',').map(s => s.trim());
        
        if (!allowedList.includes(email)) {
             Logger.log('エラー: 許可されていないユーザーによるアクセスです。');
             return false;
        }
        
        return true;
    } catch (e) {
        // トークンの有効期限切れや不正な形式の場合はエラーになる
        Logger.log(`エラー: IDトークンの検証に失敗しました: ${e}`);
        return false;
    }
}

/**
 * キャッシュされた設定値をリセットする（主にテスト用）
 */
function resetConfigCache(): void {
    cachedStravaClientId = null;
    cachedStravaClientSecret = null;
    cachedStravaScope = null;
    cachedGoogleClientId = null;
    cachedAllowedEmails = null;
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getOAuthService,
        authCallback,
        startAuth,
        resetAuth,
        verifyGoogleToken,
        resetConfigCache,
    };
}
