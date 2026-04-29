/**
 * ダッシュボード用のデータを集計して返す
 */
function getDashboardData(): DashboardSummary | undefined {
    const data = fetchActivitiesData();
    if (!data || data.length <= 1) return;

    const props = PropertiesService.getScriptProperties();
    const maxHR = Number(props.getProperty(Config.PROP_USER_MAX_HR) || 190);
    const restHR = Number(props.getProperty(Config.PROP_USER_REST_HR) || 50);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const dailyTss = calculateDailyTss(data, oneYearAgo, maxHR, restHR);
    const { history, heatmapData, currentFitness } = generateHistoryAndHeatmap(dailyTss, thirtyDaysAgo);

    const lastRow = data[data.length - 1];
    const lastActivity = parseLastActivity(lastRow);

    return {
        lastActivity,
        fitness: currentFitness,
        gears: getGearStatus(),
        history,
        heatmapData
    };
}

/**
 * スプレッドシートからアクティビティデータを取得する
 */
function fetchActivitiesData(): any[][] | undefined {
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

    return sheet.getDataRange().getValues();
}

/**
 * 日次TSSを集計する
 */
function calculateDailyTss(data: any[][], oneYearAgo: Date, maxHR: number, restHR: number): Record<string, number> {
    const dailyTss: Record<string, number> = {};
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
    return dailyTss;
}

/**
 * ヒストリーとヒートマップ用データを生成する
 */
function generateHistoryAndHeatmap(dailyTss: Record<string, number>, thirtyDaysAgo: Date): { history: { date: string; value: number }[]; heatmapData: { date: string; value: number }[]; currentFitness: number } {
    const historyDates = [];
    for (let i = 0; i <= 30; i++) {
        const d = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
        historyDates.push(Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd'));
    }

    // 1年周期の中での「30日前時点」の蓄積TSSを計算し、初期値とする
    let runningTotal = 0;
    const thirtyDaysAgoStr = Utilities.formatDate(thirtyDaysAgo, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    
    Object.keys(dailyTss).forEach(date => {
        if (date < thirtyDaysAgoStr) {
            runningTotal += dailyTss[date];
        }
    });

    const history = historyDates.map(date => {
        const dayTss = dailyTss[date] || 0;
        runningTotal += dayTss;
        return {
            date,
            value: Math.round(runningTotal * 10) / 10
        };
    });

    const heatmapData = historyDates.map(date => ({
        date,
        value: dailyTss[date] || 0
    }));

    return {
        history,
        heatmapData,
        currentFitness: Math.round(runningTotal * 10) / 10
    };
}

/**
 * 最後のアクティビティをパースする
 */
function parseLastActivity(lastRow: any[]): Activity {
    return {
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
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getDashboardData,
    };
}
