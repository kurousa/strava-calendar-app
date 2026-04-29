/**
 * Webhookイベントの内容を解析して処理を振り分ける
 */
function handleStravaWebhook(event: StravaWebhookEvent): void {
    Logger.log(`[Webhook] Handling activity ${event.object_id}`);

    if (event.object_type !== 'activity') {
        return;
    }

    // update, delete は現状未対応（必要に応じて実装）
    if (event.aspect_type !== 'create') {
        return;
    }

    // 新規作成時のみカレンダーに登録
    let activity: StravaActivity | null = null;
    if (typeof getStravaActivity === 'function') {
        activity = getStravaActivity(event.object_id);
    }
    if (!activity) {
        return;
    }

    let calendar: GoogleAppsScript.Calendar.Calendar | null = null;
    if (typeof getTargetCalendar === 'function') {
        calendar = getTargetCalendar();
    }
    if (!calendar) {
        return;
    }

    if (typeof processActivityToCalendar === 'function') {
        const result = processActivityToCalendar(activity, calendar);
        // 登録に成功した場合のみ通知を飛ばす
        if (result !== 'success') {
            return;
        }

        if (typeof sendSyncNotification === 'function') {
            sendSyncNotification(1, 0, false);
        }
    }
}

/**
 * 手動実行用：WebhookをStravaに登録する
 * スクリプトプロパティ 'WEB_APP_URL' に公開したURLを設定しておく必要があります。
 */
function registerStravaWebhook(): void {
    const scriptProps = PropertiesService.getScriptProperties();
    const webAppUrl = scriptProps.getProperty(Config.PROP_WEB_APP_URL);
    const verifyToken = scriptProps.getProperty(Config.PROP_STRAVA_VERIFY_TOKEN);

    if (!verifyToken) {
        Logger.log(`エラー: ${Config.PROP_STRAVA_VERIFY_TOKEN} が設定されていません。`);
        return;
    }

    if (!webAppUrl) {
        Logger.log(`エラー: ${Config.PROP_WEB_APP_URL} が設定されていません。WebアプリとしてデプロイしたURLを設定してください。`);
        return;
    }

    const result = typeof createStravaWebhookSubscription === 'function' ? createStravaWebhookSubscription(webAppUrl, verifyToken) : null;
    if (result) {
        Logger.log(`Webhookを登録しました。Subscription ID: ${result.id}`);
    } else {
        Logger.log('Webhookの登録に失敗しました。Loggerを確認してください。');
    }
}

/**
 * 手動実行用：登録されているWebhookを確認・削除する
 */
function manageStravaWebhooks(): void {
    const subscriptions = typeof viewStravaWebhookSubscriptions === 'function' ? viewStravaWebhookSubscriptions() : [];
    if (subscriptions.length === 0) {
        Logger.log('登録されているWebhookはありません。');
        return;
    }

    subscriptions.forEach((sub: StravaWebhookSubscription) => {
        Logger.log(`ID: ${sub.id}, Callback: ${sub.callback_url}, Created: ${sub.created_at}`);
    });
}

function unregisterStravaWebhook(): void {
    const subscriptions = typeof viewStravaWebhookSubscriptions === 'function' ? viewStravaWebhookSubscriptions() : [];
    if (subscriptions.length === 0) {
        Logger.log('削除するWebhookが見つかりません。');
        return;
    }

    subscriptions.forEach((sub: StravaWebhookSubscription) => {
        const success = typeof deleteStravaWebhookSubscription === 'function' ? deleteStravaWebhookSubscription(sub.id) : false;
        if (success) {
            Logger.log(`Webhook (ID: ${sub.id}) を削除しました。`);
        }
    });
}
// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        handleStravaWebhook,
        registerStravaWebhook,
        manageStravaWebhooks,
        unregisterStravaWebhook,
    };
}
