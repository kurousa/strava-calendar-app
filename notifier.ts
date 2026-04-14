// ==========================================
// 通知処理の役割 (notifier.ts)
// 外部サービス (Discord等) へ同期結果を送信します
// ==========================================

let DISCORD_WEBHOOK_URL_CACHE: string | null = null;

/**
 * Discordにメッセージを送信する
 */
function sendDiscordMessage(message: string): void {
    if (DISCORD_WEBHOOK_URL_CACHE === null) {
        DISCORD_WEBHOOK_URL_CACHE = PropertiesService.getScriptProperties().getProperty('DISCORD_WEBHOOK_URL') || '';
    }

    if (!DISCORD_WEBHOOK_URL_CACHE) {
        Logger.log('DISCORD_WEBHOOK_URL が設定されていないため、通知をスキップします。');
        return;
    }

    const payload = {
        content: message
    };

    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
    };

    try {
        const response = UrlFetchApp.fetch(DISCORD_WEBHOOK_URL_CACHE, options);
        // DiscordのWebhookは成功時に204(No Content)を返すことが多いです
        if (response.getResponseCode() !== 200 && response.getResponseCode() !== 204) {
            Logger.log(`[Notification Error] ${response.getContentText()}`);
        } else {
            Logger.log('Discordへの通知が完了しました。');
        }
    } catch (e) {
        Logger.log(`[Notification Exception] 通知の送信に失敗しました: ${e}`);
    }
}

/**
 * 同期結果を外部サービスへ通知する
 */
function sendSyncNotification(successCount: number, skipCount: number, isManual: boolean = false): void {
    // 処理件数が0件の場合は通知しない
    if (successCount === 0 && skipCount === 0) {
        return;
    }

    const modeText = isManual ? "手動インポート" : "定期同期";
    const message = `✅ **Strava カレンダー${modeText}完了**\n新規登録: ${successCount}件 / スキップ: ${skipCount}件`;

    sendDiscordMessage(message);
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        sendDiscordMessage,
        sendSyncNotification,
        get DISCORD_WEBHOOK_URL_CACHE() { return DISCORD_WEBHOOK_URL_CACHE; },
        set DISCORD_WEBHOOK_URL_CACHE(val) { DISCORD_WEBHOOK_URL_CACHE = val; },
        resetCache: () => { DISCORD_WEBHOOK_URL_CACHE = null; }
    };
}
