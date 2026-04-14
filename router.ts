// ==========================================
// ルーティング処理 (router.ts)
// Webアプリへのアクセス(doGet)や、Webhook(doPost)の受け口を担当します
// ==========================================

/**
 * WebアプリのURLにアクセスがあった時に呼ばれる (画面の表示)
 */
function doGet(e: GoogleAppsScript.Events.DoGet): GoogleAppsScript.HTML.HtmlOutput {
    // index.html を読み込んで画面を表示する
    return HtmlService.createHtmlOutputFromFile('index')
        .setTitle('Strava カレンダーインポート');
}

/**
 * Strava等からのWebhookを受信した時に呼ばれる (将来的な拡張用)
 */
function doPost(e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput {
    // 例: リクエストボディの解析
    // const postData = JSON.parse(e.postData.contents);

    // ... 将来、リアルタイム同期を実装する際はこちらに処理を書きます ...

    return ContentService.createTextOutput("OK");
}

/**
 * Web画面 (index.html) のボタンから呼び出される関数
 * 指定した期間の過去データを取り込む
 */
function importPastActivitiesFromWeb(startStr: string, endStr: string): string {
    // Validate input format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!startStr || !endStr || !dateRegex.test(startStr) || !dateRegex.test(endStr)) {
        const msg = 'エラー: 日付の形式が正しくありません (YYYY-MM-DD)。';
        Logger.log(msg);
        return msg;
    }

    // Helper to validate date components to prevent rollover (e.g., 2024-02-31 -> 2024-03-02)
    function isValidDateComponents(dateStr: string, dateObj: Date): boolean {
        if (isNaN(dateObj.getTime())) return false;
        const [y, m, d] = dateStr.split('-');
        return dateObj.getFullYear() === parseInt(y, 10) &&
            dateObj.getMonth() + 1 === parseInt(m, 10) &&
            dateObj.getDate() === parseInt(d, 10);
    }

    // 画面からの文字列(YYYY-MM-DD)をDateオブジェクトに変換
    const startDate = new Date(`${startStr}T00:00:00`);
    const endDate = new Date(`${endStr}T23:59:59`);

    // Check if dates are valid
    if (!isValidDateComponents(startStr, startDate) || !isValidDateComponents(endStr, endDate)) {
        const msg = 'エラー: 無効な日付が指定されました。';
        Logger.log(msg);
        return msg;
    }

    if (startDate > endDate) {
        const msg = 'エラー: 開始日は終了日より前の日付を指定してください。';
        Logger.log(msg);
        return msg;
    }

    // manual_import.ts にある処理を呼び出す
    if (typeof importPastActivities === 'function') {
        return importPastActivities(startDate, endDate);
    }
    return "エラー: インポート関数が見つかりません";
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        doGet,
        doPost,
        importPastActivitiesFromWeb,
    };
}
