// ==========================================
// 通知処理の役割 (notifier.ts)
// 外部サービス (Discord等) へ同期結果を送信します
// ==========================================

let DISCORD_WEBHOOK_URL_CACHE: string | null = null;

/**
 * 同期結果を外部サービスへ通知する
 */
function sendSyncNotification(successCount: number, skipCount: number, isManual: boolean = false): void {
    if (DISCORD_WEBHOOK_URL_CACHE === null) {
        DISCORD_WEBHOOK_URL_CACHE = PropertiesService.getScriptProperties().getProperty(PROP_DISCORD_WEBHOOK_URL) || '';
    }

    if (!DISCORD_WEBHOOK_URL_CACHE) {
        Logger.log(`${PROP_DISCORD_WEBHOOK_URL} が設定されていないため、通知をスキップします。`);
        return;
    }

    // 処理件数が0件の場合は通知しない（不要であればコメントアウトしてください）
    if (successCount === 0 && skipCount === 0) {
        return;
    }

    const modeText = isManual ? "手動インポート" : "定期同期";
    const message = `✅ **Strava カレンダー${modeText}完了**\n新規登録: ${successCount}件 / スキップ: ${skipCount}件`;

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
 * 機材のメンテナンス・買い替えアラートを通知する
 */
function sendGearAlert(gearName: string, currentDistanceKm: number, thresholdKm: number, isPeriodic: boolean): void {
    if (DISCORD_WEBHOOK_URL_CACHE === null) {
        DISCORD_WEBHOOK_URL_CACHE = PropertiesService.getScriptProperties().getProperty(PROP_DISCORD_WEBHOOK_URL) || '';
    }

    if (!DISCORD_WEBHOOK_URL_CACHE) {
        Logger.log(`${PROP_DISCORD_WEBHOOK_URL} が設定されていないため、機材アラートをスキップします。`);
        return;
    }

    const title = isPeriodic ? "⚙️ **機材メンテナンス時期のお知らせ**" : "👟 **機材買い替え時期のお知らせ**";
    const message = `${title}\n**${gearName}** の走行距離が **${currentDistanceKm.toFixed(1)}km** に達しました。\n（設定しきい値: ${thresholdKm}km）`;

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
        if (response.getResponseCode() !== 200 && response.getResponseCode() !== 204) {
            Logger.log(`[Gear Alert Notification Error] ${response.getContentText()}`);
        } else {
            Logger.log('機材アラートをDiscordに通知しました。');
        }
    } catch (e) {
        Logger.log(`[Gear Alert Notification Exception] 通知の送信に失敗しました: ${e}`);
    }
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        sendSyncNotification,
        sendGearAlert,
        get DISCORD_WEBHOOK_URL_CACHE() { return DISCORD_WEBHOOK_URL_CACHE; },
        set DISCORD_WEBHOOK_URL_CACHE(val) { DISCORD_WEBHOOK_URL_CACHE = val; },
        resetCache: () => { DISCORD_WEBHOOK_URL_CACHE = null; }
    };
}
