// ==========================================
// ルーティング処理 (router.ts)
// Webアプリへのアクセス(doGet)や、Webhook(doPost)の受け口を担当します
// ==========================================

/**
 * GETリクエストハンドラー
 * - Strava Webhook のバリデーションリクエスト (GET) に対応する
 * - 通常のアクセス（インポート画面）を表示する
 */
function doGet(e: any): GoogleAppsScript.HTML.HtmlOutput | GoogleAppsScript.Content.TextOutput {
    // Strava Webhook のバリデーションリクエスト (GET) の場合
    if (e && e.parameter && e.parameter['hub.mode'] === 'subscribe') {
        const verifyToken = PropertiesService.getScriptProperties().getProperty(Config.PROP_STRAVA_VERIFY_TOKEN);
        if (!verifyToken) {
            Logger.log(`エラー: ${Config.PROP_STRAVA_VERIFY_TOKEN} が設定されていません。`);
            return HtmlService.createHtmlOutput('Internal Server Error: Missing Verify Token');
        }

        if (e.parameter['hub.verify_token'] === verifyToken) {
            const challenge = e.parameter['hub.challenge'];
            return ContentService.createTextOutput(JSON.stringify({ "hub.challenge": challenge }))
                .setMimeType(ContentService.MimeType.JSON);
        } else {
            Logger.log('エラー: Webhook検証トークンが一致しません。');
            return HtmlService.createHtmlOutput('Forbidden: Invalid Verify Token');
        }
    }

    // ヘッドレスAPI: Next.js等のフロントエンドからのデータ取得用
    if (e && e.parameter && e.parameter.action === 'getStats') {
        const token = e.parameter.token;
        const apiKey = PropertiesService.getScriptProperties().getProperty(Config.PROP_API_KEY);
        
        let isAuthorized = false;

        // 1. APIキーによる認証 (既存)
        if (apiKey && e.parameter.key === apiKey) {
            isAuthorized = true;
        }

        // 2. Google ID Token による認証
        if (!isAuthorized && token) {
            const email = verifyIdToken(token);
            if (email) {
                const allowedEmails = PropertiesService.getScriptProperties().getProperty(Config.PROP_ALLOWED_EMAILS) || "";
                const allowedList = allowedEmails.split(',').map(s => s.trim());
                if (allowedList.includes(email)) {
                    isAuthorized = true;
                } else {
                    Logger.log(`エラー: 許可されていないユーザーです (${email})`);
                }
            }
        }

        if (!isAuthorized) {
            Logger.log('エラー: 認証に失敗しました。');
            return ContentService.createTextOutput(JSON.stringify({ 
                status: 'error', 
                code: 401,
                message: 'Unauthorized: Invalid Token or API Key' 
            }))
                .setMimeType(ContentService.MimeType.JSON);
        }

        try {
            // スプレッドシートからデータを取得する関数の呼び出し
            const stats = getDashboardData() ?? { lastActivity: [], fitness: 0, gears: [] };
            
            return ContentService.createTextOutput(JSON.stringify({ 
                status: 'success', 
                code: 200,
                data: stats 
            }))
                .setMimeType(ContentService.MimeType.JSON);
        } catch (err) {
            return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: (err as Error).toString() }))
                .setMimeType(ContentService.MimeType.JSON);
        }
    }

    // 通常のアクセス（インポート画面）を表示する
    return HtmlService.createHtmlOutputFromFile('index')
        .setTitle('Strava カレンダーインポート');
}

/**
 * POSTリクエストハンドラー
 * - Strava Webhook からの通知 (POST) を受け取る
 */
function doPost(e: any): GoogleAppsScript.Content.TextOutput {
    try {
        const event: StravaWebhookEvent = JSON.parse(e.postData.contents);
        Logger.log(`[Webhook] Received event: ${event.aspect_type} for ${event.object_type} (ID: ${event.object_id})`);

        // 非同期的に処理を行う（GASの制限上、実際にはこの中で完結させる）
        // Stravaは2秒以内のレスポンスを求めているため、重い処理は工夫が必要な場合もあるが、
        // 単発のアクティビティ取得とカレンダー登録であれば通常2秒以内に収まる。
        (global as any).handleStravaWebhook(event);

        return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
            .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
        Logger.log(`[Webhook Error] ${(err as Error).toString()}`);
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: (err as Error).toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * Google ID Tokenを検証し、メールアドレスを返す
 */
function verifyIdToken(token: string): string | null {
    try {
        const response = UrlFetchApp.fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
        const data = JSON.parse(response.getContentText());
        
        // クライアントIDの検証
        const expectedClientId = PropertiesService.getScriptProperties().getProperty(Config.PROP_GOOGLE_CLIENT_ID);
        if (expectedClientId && data.aud !== expectedClientId) {
            Logger.log('エラー: IDトークンの aud が一致しません。');
            return null;
        }

        return data.email || null;
    } catch (e) {
        Logger.log(`エラー: IDトークンの検証に失敗しました: ${e}`);
        return null;
    }
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        doGet,
        doPost,
    };
}
