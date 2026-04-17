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

    // 直近30日のTSS集計や機材ステータスを計算
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    let fitness = 0;
    const props = PropertiesService.getScriptProperties();
    const maxHR = Number(props.getProperty(Config.PROP_USER_MAX_HR) || 190);
    const restHR = Number(props.getProperty(Config.PROP_USER_REST_HR) || 50);

    // ヘッダーを除いてループ (インデックス1から)
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const date = new Date(row[1]); // 2列目: 日付
        
        if (date >= thirtyDaysAgo) {
            const durationSec = Number(row[5]) * 60; // 6列目: 時間 (分)
            const avgHR = Number(row[7]);           // 8列目: 平均心拍数
            
            if (avgHR) {
                fitness += calculateTSS(durationSec, avgHR, maxHR, restHR);
            }
        }
    }
    
    const summary: DashboardSummary = {
        lastActivity: data[data.length - 1],
        fitness: fitness,
        gears: getGearStatus()
    };
    
    return summary;
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getDashboardData,
    };
}
