// ==========================================
// メイン処理
// ==========================================

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
    Logger.log("登録するアクティビティがありませんでした。");
    return;
  }
  Logger.log(
    "[DEBUG]取得できたアクティビティの数: " +
      activities.length +
      ", 最初のアクティビティID: " +
      activities[0].id,
  ); // 🔒 Security: Only log activity ID to prevent PII exposure

  // カレンダーの取得（IDが指定されていればそれを使用、なければデフォルトを使用）
  const calendar = getTargetCalendar();
  if (!calendar) {
    Logger.log("カレンダーの取得に失敗しました。");
    return;
  }
  Logger.log(`[DEBUG]登録先calendar: ${calendar.getName()}`);

  // ⚡ Bolt Optimization: Batch load existing events to avoid N+1 queries
  const existingActivityIds = getExistingActivityIds(calendar, yesterday, now);

  let successCount = 0;
  let skipCount = 0;
  const successfulActivities: StravaActivity[] = [];

  activities.forEach((activity) => {
    const activityIdStr = String(activity.id);
    if (existingActivityIds.has(activityIdStr)) {
      Logger.log(`スキップ: 既に登録済みのアクティビティです: ${activity.id}`);
      skipCount++;
      return;
    }

    // Strava 一覧API は calories を返さないため、詳細APIで補完する
    // これによりカレンダーの説明文とスプレッドシートバックアップの両方にカロリーが反映される
    const detail = getStravaActivity(activity.id);
    if (detail && detail.calories != null) {
      activity.calories = detail.calories;
    }

    // ⚡ Bolt: Pass skipDuplicateCheck=true because we already filtered duplicates above
    const result = processActivityToCalendar(
      activity,
      calendar,
      undefined,
      true,
    );
    if (result === "success") {
      successCount++;
      successfulActivities.push(activity);
    } else if (result === "skipped") {
      skipCount++;
    }
  });

  if (typeof backupToSpreadsheet === "function") {
    // カロリーは上のループで既に補完済みなのでそのまま渡す
    backupToSpreadsheet(successfulActivities);
  }

  // 同期結果を通知する
  if (typeof sendSyncNotification === "function") {
    sendSyncNotification(successCount, skipCount, false);
  }

  // 機材アラートのチェック
  if (typeof checkGearAlerts === "function") {
    checkGearAlerts();
  }
}


// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    main,
    DISTANCE_ACTIVITIES: new Set(Config.DISTANCE_ACTIVITIES),
    CALENDAR_API_DELAY_MS: Config.CALENDAR_API_DELAY_MS,
    STRAVA_ACTIVITY_ID_REGEX: Config.STRAVA_ACTIVITY_ID_REGEX,
  };
}
