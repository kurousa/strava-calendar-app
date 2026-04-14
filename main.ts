// ==========================================
// メインの処理とカレンダー操作 (main.ts)
// プログラムの入り口（タイマーから実行される関数）と、
// カレンダーへの書き込みといった「このアプリのメインのお仕事」だけを残します。
// ==========================================

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
            const match = desc.match(Config.STRAVA_ACTIVITY_ID_REGEX);
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

    // 機材アラートのチェック
    if (typeof checkGearAlerts === 'function') {
        checkGearAlerts();
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
    const lastNotified = props.getProperty(Config.PROP_LAST_ERROR_NOTIFIED_AT);
    const now = new Date().getTime();
    if (lastNotified && now - parseInt(lastNotified) < 24 * 60 * 60 * 1000) {
        return;
    }

    const subject = '【Stravaアクティビティ連携】Stravaとの連携でエラーが発生しました。';
    const body = 'Stravaとの連携でエラーが発生しました。\n\nエラー内容:\n' + message;

    MailApp.sendEmail(email, subject, body);
    props.setProperty(Config.PROP_LAST_ERROR_NOTIFIED_AT, now.toString());
    Logger.log('エラーメールを送信しました: ' + email);
}

// ==========================================
// アクティビティをカレンダーに登録する共通処理
// ==========================================
function processActivityToCalendar(
    activity: StravaActivity,
    calendar: GoogleAppsScript.Calendar.Calendar,
    distanceActivities: Set<string> = Config.DISTANCE_ACTIVITIES,
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

    // 【追加】AIコメントの生成
    if (typeof generateAiComment === 'function') {
        activity.aiComment = generateAiComment(activity);
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

    // 【追加】ルートマップの生成と保存
    if (activity.map && activity.map.summary_polyline) {
        if (typeof saveMapToDrive === 'function') {
            const mapFile = saveMapToDrive(activity);
            if (mapFile) {
                activity.mapUrl = mapFile.getUrl();
            }
        }
    }

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

    // 【追加】マップ画像をカレンダーに添付する
    if (activity.mapUrl && typeof saveMapToDrive === 'function') {
        const fileName = `strava_map_${activity.id}.png`;
        const folder = getOrCreateMapFolder();
        const files = folder.getFilesByName(fileName);

        if (files.hasNext()) {
            const file = files.next();
            // Google Calendar API (v3) を使って添付ファイルを追加
            // 標準のIDは "xxxx@google.com" 形式なので、ID部分のみ抽出
            const eventId = event.getId().split('@')[0];
            try {
                // global の Calendar オブジェクト (Advanced Service) を使用
                if (typeof Calendar !== 'undefined') {
                    Calendar.Events.patch({
                        attachments: [{
                            fileUrl: file.getUrl(),
                            title: file.getName(),
                            mimeType: file.getMimeType()
                        }]
                    }, calendar.getId(), eventId, {
                        supportsAttachments: true
                    });
                    Logger.log(`添付ファイルを追加しました: ${fileName}`);
                }
            } catch (e) {
                Logger.log(`添付ファイルの追加に失敗しました: ${e}`);
            }
        }
    }

    // イベントに色を設定する
    if (style.color) {
        event.setColor(style.color);
    }

    // カレンダーAPIの連続作成制限を回避しつつ、GASの実行時間制限(6分)に配慮
    // 重複スキップ時は待機せず、カレンダーへの新規書き込みが行われた直後のみ短時間待機する
    Utilities.sleep(Config.CALENDAR_API_DELAY_MS);

    Logger.log(`カレンダーに登録しました: ID ${activity.id}`);
    return 'success';
}

// ==========================================
// カレンダー取得ユーティリティ
// ==========================================
function getTargetCalendar(): GoogleAppsScript.Calendar.Calendar | null {
    const calendarId = PropertiesService.getScriptProperties().getProperty(Config.PROP_CALENDAR_ID);
    if (calendarId) {
        const calendar = CalendarApp.getCalendarById(calendarId);
        if (!calendar) {
            Logger.log('エラー: 指定されたカレンダーが見つかりません。');
        }
        return calendar;
    }
    return CalendarApp.getDefaultCalendar();
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        main,
        sendErrorEmail,
        getTargetCalendar,
        processActivityToCalendar,
        getExistingActivityIds,
        DISTANCE_ACTIVITIES,
        CALENDAR_API_DELAY_MS,
        STRAVA_ACTIVITY_ID_REGEX,
    };
}
