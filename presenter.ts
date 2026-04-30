/**
 * APIのレスポンスを生成するプレゼンター関数
 * 
 * @param status ステータス文字列 ('ok', 'error', 'success' など)
 * @param code HTTPステータスコード (任意)
 * @param message レスポンスメッセージやデータ (任意)
 * @param output_mimetype 出力のMIMEタイプ (任意)
 * @returns GoogleAppsScript.Content.TextOutput
 */
function createResponse(
    status: string,
    code?: number,
    message?: any,
    output_mimetype?: GoogleAppsScript.Content.MimeType
): GoogleAppsScript.Content.TextOutput {
    const payload: any = {};
    payload.status = status;
    if (code !== undefined) {
        payload.code = code;
    }
    if (message !== undefined) {
        // hub.challenge のような特殊なケースに対応（トップレベルにマージ）
        if (status === 'ok' && typeof message === 'object' && !Array.isArray(message)) {
            Object.assign(payload, message);
        } else {
            payload.message = message;
        }
    }

    let output = ContentService.createTextOutput(JSON.stringify(payload));
    
    if (output_mimetype) {
        output = output.setMimeType(output_mimetype);
    }
    
    return output;
}

/**
 * 文字列からHtmlOutputを生成する
 * 
 * @param content 表示するテキストまたはHTML
 * @returns GoogleAppsScript.HTML.HtmlOutput
 */
function createHtmlResponse(content: string): GoogleAppsScript.HTML.HtmlOutput {
    return HtmlService.createHtmlOutput(content);
}

/**
 * ファイルからHtmlOutputを生成する（ページ表示用）
 * 
 * @param filename HTMLファイル名
 * @param title ページのタイトル (任意)
 * @returns GoogleAppsScript.HTML.HtmlOutput
 */
function createHtmlPage(filename: string, title?: string): GoogleAppsScript.HTML.HtmlOutput {
    const output = HtmlService.createHtmlOutputFromFile(filename);
    if (title) {
        output.setTitle(title);
    }
    return output;
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createResponse,
        createHtmlResponse,
        createHtmlPage,
    };
}
