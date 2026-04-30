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
    const payload: any = { status };
    if (code !== undefined) {
        payload.code = code;
    }
    if (message !== undefined) {
        payload.message = message;
    }

    let output = ContentService.createTextOutput(JSON.stringify(payload));
    
    if (output_mimetype) {
        output = output.setMimeType(output_mimetype);
    }
    
    return output;
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createResponse,
    };
}
