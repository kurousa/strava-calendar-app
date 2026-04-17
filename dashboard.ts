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

    // 直近30日のTSS集計や機材ステータスを計算
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    let totalFitness = 0;
    const historyMap: { [date: string]: number } = {};
    const props = PropertiesService.getScriptProperties();
    const maxHR = Number(props.getProperty(Config.PROP_USER_MAX_HR) || 190);
    const restHR = Number(props.getProperty(Config.PROP_USER_REST_HR) || 50);

    // ヘッダーを除いてループ (インデックス1から)
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const dateObj = new Date(row[1]);
        const dateStr = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        
        const durationSec = Number(row[5]) * 60;
        const avgHR = Number(row[7]);
        
        let tss = 0;
        if (avgHR) {
            tss = calculateTSS(durationSec, avgHR, maxHR, restHR);
        }

        if (dateObj >= thirtyDaysAgo) {
            totalFitness += tss;
            historyMap[dateStr] = (historyMap[dateStr] || 0) + tss;
        }
    }

    // historyを配列に変換してソート
    const history = Object.keys(historyMap).sort().map(date => ({
        date,
        value: Math.round(historyMap[date] * 10) / 10
    }));

    // 最後のアクティビティをオブジェクトに変換
    const lastRow = data[data.length - 1];
    const lastActivity: Activity = {
        id: String(lastRow[0]),
        date: Utilities.formatDate(new Date(lastRow[1]), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
        title: String(lastRow[3]),
        type: String(lastRow[2]),
        distance: Number(lastRow[4]),
        duration: Number(lastRow[5]),
        elevation: Number(lastRow[6]),
        avgHr: Number(lastRow[7]) || undefined,
        maxHr: Number(lastRow[8]) || undefined,
        avgWatts: Number(lastRow[9]) || undefined,
        avgCadence: Number(lastRow[10]) || undefined,
        calories: Number(lastRow[11]) || undefined,
        mapUrl: String(lastRow[12]) || undefined,
        weather: String(lastRow[13]) || undefined,
        aiComment: String(lastRow[14]) || undefined,
    };
    
    const summary: DashboardSummary = {
        lastActivity: lastActivity,
        fitness: Math.round(totalFitness * 10) / 10,
        gears: getGearStatus(),
        history: history
    };
    
    return summary;
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getDashboardData,
    };
}
