/**
 * ダッシュボード用のデータを集計して返す
 */
function getDashboardData(): DashboardSummary | undefined {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty(Config.PROP_SPREADSHEET_ID);
    if (!spreadsheetId) {
        Logger.log(`${Config.PROP_SPREADSHEET_ID} が設定されていないため、ダッシュボードのデータを取得できません。`);
        return;
    }

    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName(Config.BACKUP_SHEET_NAME);
    if (!sheet) {
        Logger.log(`${Config.BACKUP_SHEET_NAME} が設定されていないため、ダッシュボードのデータを取得できません。`);
        return;
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    
    const props = PropertiesService.getScriptProperties();
    const maxHR = Number(props.getProperty(Config.PROP_USER_MAX_HR) || 190);
    const restHR = Number(props.getProperty(Config.PROP_USER_REST_HR) || 50);

    // 1. 日次TSSの集計
    const dailyTss: { [date: string]: number } = {};
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const dateObj = new Date(row[1]);
        if (isNaN(dateObj.getTime())) continue;

        const dateStr = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        const durationSec = Number(row[5]) * 60;
        const avgHR = Number(row[7]);
        
        let tss = 0;
        if (avgHR) {
            tss = calculateTSS(durationSec, avgHR, maxHR, restHR);
        }
        
        // 期間内のデータを収集
        if (dateObj >= oneYearAgo) {
            dailyTss[dateStr] = (dailyTss[dateStr] || 0) + tss;
        }
    }

    // 2. 蓄積型（累積）データの生成
    // 期間内の日付を並べて、前日の値を加算していく
    const historyDates = [];
    for (let i = 0; i <= 30; i++) {
        const d = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
        historyDates.push(Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd'));
    }

    let runningTotal = 0;
    // 30日前までの蓄積を計算（より正確な累積値のため）
    // dailyTssには365日分入っているが、historyの起点はthirtyDaysAgo
    // historyの最初の値に、それ以前の蓄積を入れる必要があるかどうか？
    // 現状の実装は thirtyDaysAgo から 0 からスタートしているのでそれに合わせる
    const history = historyDates.map(date => {
        const dayTss = dailyTss[date] || 0;
        runningTotal += dayTss;
        return {
            date,
            value: Math.round(runningTotal * 10) / 10
        };
    });

    // 3. ヒートマップ用データの生成（過去1年分）
    const heatmapDates = [];
    for (let i = 0; i < 365; i++) {
        const d = new Date(oneYearAgo.getTime() + i * 24 * 60 * 60 * 1000);
        heatmapDates.push(Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd'));
    }
    const heatmapData = heatmapDates.map(date => ({
        date,
        value: dailyTss[date] || 0
    }));

    // 最後のアクティビティ
    const lastRow = data[data.length - 1];
    const lastActivity: Activity = {
        id: String(lastRow[0]),
        date: Utilities.formatDate(new Date(lastRow[1]), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
        title: String(lastRow[3] || 'Untitled Activity'),
        type: String(lastRow[2] || 'Ride'),
        distance: Number(lastRow[4]) || 0,
        duration: Number(lastRow[5]) || 0,
        elevation: Number(lastRow[6]) || 0,
        avgHr: Number(lastRow[7]) || undefined,
        maxHr: Number(lastRow[8]) || undefined,
        avgWatts: Number(lastRow[9]) || undefined,
        avgCadence: Number(lastRow[10]) || undefined,
        calories: Number(lastRow[11]) || undefined,
        weather: String(lastRow[12] || ''),
        aiComment: String(lastRow[13] || ''),
        mapUrl: String(lastRow[14] || '')
    };
    
    const summary: DashboardSummary = {
        lastActivity: lastActivity,
        fitness: Math.round(runningTotal * 10) / 10,
        gears: getGearStatus(),
        history: history,
        heatmapData: heatmapData
    };
    
    return summary;
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getDashboardData,
    };
}
