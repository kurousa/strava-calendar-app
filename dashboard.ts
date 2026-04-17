/**
 * ダッシュボード用のデータを集計して返す
 */
function getDashboardData() {
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
    const summary = {
        lastActivity: data[data.length - 1],
        fitness: 100, // 4. TSS/疲労度の計算結果
        gears: getGearStatus() // 3. 機材の寿命
    };
    
    return summary;
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getDashboardData,
    };
}
