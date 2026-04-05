// ==========================================
// 指定した期間の過去データを取り込む (画面からの実行用)
// ==========================================
function importPastActivities(startDate, endDate) {
    // Web画面以外（エディタ等）から直接実行された場合のデフォルト（テスト用）
    if (!startDate || !endDate) {
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1); // 1ヶ月前
        endDate = new Date();
        Logger.log('※引数が指定されていないため、直近1ヶ月の期間で実行します。');
    }

    Logger.log(`[Import] ${startDate.toLocaleDateString()} から ${endDate.toLocaleDateString()} のデータを取り込みます...`);

    // api.js の関数を呼び出し
    const activities = getStravaActivities(startDate, endDate);

    if (activities.length === 0) {
        const msg = '該当する期間のアクティビティはありませんでした。';
        return msg;
    }

    const calendar = getTargetCalendar();
    if (!calendar) return 'カレンダーの取得に失敗しました。';

    let successCount = 0;
    let skipCount = 0;

    activities.forEach(activity => {
        const result = processActivityToCalendar(activity, calendar);
        if (result === 'skipped') skipCount++;
        if (result === 'success') successCount++;
    });

    const resultMsg = `✅ 完了! 新規登録: ${successCount}件 / スキップ: ${skipCount}件`;
    Logger.log(resultMsg);
    return resultMsg;
}
