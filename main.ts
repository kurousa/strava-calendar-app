// ==========================================
// メインの処理とカレンダー操作 (main.ts)
// プログラムの入り口（タイマーから実行される関数）と、
// カレンダーへの書き込みといった「このアプリのメインのお仕事」だけを残します。
// ==========================================

const CALENDAR_ID = PropertiesService.getScriptProperties().getProperty('CALENDAR_ID');
// カレンダーAPIの連続作成制限を回避するための待機時間 (ms)
const CALENDAR_API_DELAY_MS = 200;

// Regex to extract Strava activity IDs from calendar event descriptions
const STRAVA_ACTIVITY_ID_REGEX = /strava\.com\/activities\/(\d+)/i;

// 距離を表示するアクティビティのリスト
const DISTANCE_ACTIVITIES = new Set([
    'Run', 'Ride', 'Walk', 'Hike', 'Swim', 'AlpineSki', 'BackcountrySki', 'NordicSki', 'RollerSki',
    'Canoeing', 'Kayaking', 'Rowing', 'StandUpPaddling', 'Surfing', 'Sail', 'Windsurf', 'IceSkate',
    'InlineSkate', 'Skateboard', 'Snowshoe', 'Kitesurf', 'VirtualRide', 'VirtualRun', 'GravelRide',
    'MountainBikeRide', 'EMountainBikeRide', 'Velomobile', 'Handcycle', 'Wheelchair'
]);

/**
 * Retrieves a set of Strava activity IDs that are already present in the given calendar
 * within the specified date range.
 */
function getExistingActivityIds(calendar: GoogleAppsScript.Calendar.Calendar, startDate: Date, endDate: Date): Set<string> {
    const existingEvents = calendar.getEvents(startDate, endDate);
    const existingActivityIds = new Set<string>();
    existingEvents.forEach(event => {
        const desc = event.getDescription();
        if (desc) {
            const match = desc.match(STRAVA_ACTIVITY_ID_REGEX);
            if (match && match[1]) {
                existingActivityIds.add(match[1]);
            }
        }
    });
    return existingActivityIds;
}

/**
 * 取得したアクティビティをGoogleカレンダーに登録する
 */
function main(): void {
    // 実行時刻の1日前から現在時刻までのアクティビティを取得
    const now = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const activities = getStravaActivities(yesterday, now);
    if (activities.length === 0) {
        Logger.log('登録するアクティビティがありませんでした。');
        return;
    }
    Logger.log("[DEBUG]取得できたアクティビティの数: " + activities.length + ", 最初のアクティビティID: " + activities[0].id); // 🔒 Security: Only log activity ID to prevent PII exposure

    // カレンダーの取得（IDが指定されていればそれを使用、なければデフォルトを使用）
    const calendar = getTargetCalendar();
    if (!calendar) {
        Logger.log('カレンダーの取得に失敗しました。');
        return;
    }
    Logger.log(`[DEBUG]登録先calendar: ${calendar.getName()}`);

    // ⚡ Bolt Optimization: Batch load existing events to avoid N+1 queries
    const existingActivityIds = getExistingActivityIds(calendar, yesterday, now);

    let successCount = 0;
    let skipCount = 0;
    const successfulActivities: StravaActivity[] = [];

    activities.forEach(activity => {
        const activityIdStr = String(activity.id);
        if (existingActivityIds.has(activityIdStr)) {
            Logger.log(`スキップ: 既に登録済みのアクティビティです: ${activity.id}`);
            skipCount++;
            return;
        }

        // ⚡ Bolt: Pass skipDuplicateCheck=true because we already filtered duplicates above
        const result = processActivityToCalendar(activity, calendar, undefined, true);
        if (result === 'success') {
            successCount++;
            successfulActivities.push(activity);
        } else if (result === 'skipped') {
            skipCount++;
        }
    });

    if (typeof backupToSpreadsheet === 'function') {
        backupToSpreadsheet(successfulActivities);
    }

    // 同期結果を通知する
    if (typeof sendSyncNotification === 'function') {
        sendSyncNotification(successCount, skipCount, false);
    }
}

/**
 * エラーをメールで通知する
 * @param message - エラーメッセージ
 */
function sendErrorEmail(message: string): void {
    const email = Session.getEffectiveUser().getEmail();
    if (!email) {
        Logger.log('通知先メールアドレスを取得できなかったため、メール送信をスキップしました。');
        return;
    }

    const props = PropertiesService.getUserProperties();
    const lastNotified = props.getProperty('LAST_ERROR_NOTIFIED_AT');
    const now = new Date().getTime();
    if (lastNotified && now - parseInt(lastNotified) < 24 * 60 * 60 * 1000) {
        return;
    }

    const subject = '【Stravaアクティビティ連携】Stravaとの連携でエラーが発生しました。';
    const body = 'Stravaとの連携でエラーが発生しました。\n\nエラー内容:\n' + message;

    MailApp.sendEmail(email, subject, body);
    props.setProperty('LAST_ERROR_NOTIFIED_AT', now.toString());
    Logger.log('エラーメールを送信しました: ' + email);
}

// ==========================================
// アクティビティをカレンダーに登録する共通処理
// ==========================================
function processActivityToCalendar(
    activity: StravaActivity,
    calendar: GoogleAppsScript.Calendar.Calendar,
    distanceActivities: Set<string> = DISTANCE_ACTIVITIES,
    skipDuplicateCheck: boolean = false
): string | undefined {
    // 時間の計算（Stravaは世界標準時なので、日本時間に合わせる必要があります）
    const startTime = new Date(activity.start_date);
    const endTime = new Date(startTime.getTime() + (activity.elapsed_time * 1000));

    // 既に登録済みのアクティビティかどうかを判定する (in-lined)
    // ⚡ Bolt: skipDuplicateCheck フラグで事前チェックをバイパスできるように変更
    if (!skipDuplicateCheck) {
        const existingEvents = calendar.getEvents(startTime, endTime);
        const isDuplicate = existingEvents.some(event => {
            const desc = event.getDescription();
            return desc && desc.includes(`strava.com/activities/${activity.id}`);
        });

        if (isDuplicate) {
            Logger.log(`スキップ: 既に登録済みのアクティビティです: ${activity.id}`);
            return 'skipped';
        }
    }

    // ーーー ここから下は「新規」の時しか実行されない ーーー

    // 【追加】天気情報の取得 (座標データがある場合のみ)
    if (activity.start_latlng && activity.start_latlng.length === 2) {
        if (typeof fetchWeatherData === 'function') {
            // API制限回避のため少し待機してからリクエスト
            Utilities.sleep(100);
            activity.weatherText = fetchWeatherData(activity.start_latlng[0], activity.start_latlng[1], startTime);
        }
    }

    // カレンダーに登録するタイトル（例: [Run] 朝のジョギング - 5.2km）
    const type = activity.type; // 種類（Run, Rideなど）
    const style = getActivityStyle(type);
    const distanceKm = (activity.distance / 1000).toFixed(1); // 距離をkmに変換
    const emoji = style.emoji;

    // 距離を表示するアクティビティかどうかの判定
    const hasDistance = distanceActivities.has(type) && activity.distance > 0;

    const title = hasDistance ?
        `[${emoji} ${type}] ${activity.name} - ${distanceKm}km` :
        `[${emoji} ${type}] ${activity.name}`;

    // カレンダーに登録する詳細メモ
    const description = makeDescription(activity);

    Logger.log("[DEBUG]以下の情報がカレンダーに登録されます");
    Logger.log("[DEBUG]startTime -> " + startTime);
    Logger.log("[DEBUG]endTime -> " + endTime);
    Logger.log("[DEBUG]title -> " + title);

    // カレンダーに予定として作成
    const event = calendar.createEvent(title, startTime, endTime, {
        description: description
    });
    // イベントに色を設定する
    if (style.color) {
        event.setColor(style.color);
    }

    // カレンダーAPIの連続作成制限を回避しつつ、GASの実行時間制限(6分)に配慮
    // 重複スキップ時は待機せず、カレンダーへの新規書き込みが行われた直後のみ短時間待機する
    Utilities.sleep(CALENDAR_API_DELAY_MS);

    Logger.log(`カレンダーに登録しました: ID ${activity.id}`);
    return 'success';
}

// ==========================================
// カレンダー取得ユーティリティ
// ==========================================
function getTargetCalendar(): GoogleAppsScript.Calendar.Calendar | null {
    if (CALENDAR_ID) {
        const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
        if (!calendar) {
            Logger.log('エラー: 指定されたカレンダーが見つかりません。');
        }
        return calendar;
    }
    return CalendarApp.getDefaultCalendar();
}

// ==========================================
// 【Webアプリ用】インポート画面（HTML）を表示、またはWebhookのバリデーションに対応する
// ==========================================
function doGet(e: any): GoogleAppsScript.HTML.HtmlOutput | GoogleAppsScript.Content.TextOutput {
    // Strava Webhook のバリデーションリクエスト (GET) の場合
    if (e && e.parameter && e.parameter['hub.mode'] === 'subscribe') {
        const verifyToken = PropertiesService.getScriptProperties().getProperty('STRAVA_WEBHOOK_VERIFY_TOKEN');
        if (!verifyToken) {
            Logger.log('エラー: STRAVA_WEBHOOK_VERIFY_TOKEN が設定されていません。');
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

    // 通常のアクセス（インポート画面）を表示する
    return HtmlService.createHtmlOutputFromFile('index')
        .setTitle('Strava カレンダーインポート');
}

/**
 * Strava Webhook からの通知 (POST) を受け取る
 */
function doPost(e: any): GoogleAppsScript.Content.TextOutput {
    try {
        const event: StravaWebhookEvent = JSON.parse(e.postData.contents);
        Logger.log(`[Webhook] Received event: ${event.aspect_type} for ${event.object_type} (ID: ${event.object_id})`);

        // 非同期的に処理を行う（GASの制限上、実際にはこの中で完結させる）
        // Stravaは2秒以内のレスポンスを求めているため、重い処理は工夫が必要な場合もあるが、
        // 単発のアクティビティ取得とカレンダー登録であれば通常2秒以内に収まる。
        handleStravaWebhook(event);

        return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
            .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
        Logger.log(`[Webhook Error] ${(err as Error).toString()}`);
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: (err as Error).toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * Webhookイベントの内容を解析して処理を振り分ける
 */
function handleStravaWebhook(event: StravaWebhookEvent): void {
    Logger.log(`[Webhook] Handling activity ${event.object_id}`);
    if (event.object_type === 'activity') {
        if (event.aspect_type === 'create') {
            // 新規作成時のみカレンダーに登録
            const activity = (global as any).getStravaActivity(event.object_id);
            if (activity) {
                const calendar = (global as any).getTargetCalendar();
                if (calendar) {
                    const result = (global as any).processActivityToCalendar(activity, calendar);
                    // 登録に成功した場合のみ通知を飛ばす
                    if (result === 'success' && typeof (global as any).sendSyncNotification === 'function') {
                        (global as any).sendSyncNotification(1, 0, false);
                    }
                }
            }
        }
        // update, delete は現状未対応（必要に応じて実装）
    }
}

/**
 * 手動実行用：WebhookをStravaに登録する
 * スクリプトプロパティ 'WEB_APP_URL' に公開したURLを設定しておく必要があります。
 */
function registerStravaWebhook(): void {
    const scriptProps = PropertiesService.getScriptProperties();
    const webAppUrl = scriptProps.getProperty('WEB_APP_URL');
    const verifyToken = scriptProps.getProperty('STRAVA_WEBHOOK_VERIFY_TOKEN');

    if (!verifyToken) {
        Logger.log('エラー: STRAVA_WEBHOOK_VERIFY_TOKEN が設定されていません。');
        return;
    }

    if (!webAppUrl) {
        Logger.log('エラー: WEB_APP_URL が設定されていません。WebアプリとしてデプロイしたURLを設定してください。');
        return;
    }

    const result = (global as any).createStravaWebhookSubscription(webAppUrl, verifyToken);
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
    const subscriptions = (global as any).viewStravaWebhookSubscriptions();
    if (subscriptions.length === 0) {
        Logger.log('登録されているWebhookはありません。');
        return;
    }

    subscriptions.forEach((sub: StravaWebhookSubscription) => {
        Logger.log(`ID: ${sub.id}, Callback: ${sub.callback_url}, Created: ${sub.created_at}`);
    });
}

function unregisterStravaWebhook(): void {
    const subscriptions = (global as any).viewStravaWebhookSubscriptions();
    if (subscriptions.length === 0) {
        Logger.log('削除するWebhookが見つかりません。');
        return;
    }

    subscriptions.forEach((sub: StravaWebhookSubscription) => {
        const success = (global as any).deleteStravaWebhookSubscription(sub.id);
        if (success) {
            Logger.log(`Webhook (ID: ${sub.id}) を削除しました。`);
        }
    });
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        main,
        sendErrorEmail,
        doGet,
        getTargetCalendar,
        processActivityToCalendar,
        getExistingActivityIds,
        doPost,
        handleStravaWebhook,
        registerStravaWebhook,
        manageStravaWebhooks,
        unregisterStravaWebhook,
        DISTANCE_ACTIVITIES,
        CALENDAR_API_DELAY_MS,
            STRAVA_ACTIVITY_ID_REGEX,
    };
}
