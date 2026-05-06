// ==========================================
// スプレッドシートへのバックアップ処理 (sheets.ts)
// ==========================================

/**
 * 成功したアクティビティを一括でスプレッドシートに追記する
 */
function backupToSpreadsheet(activities: StravaActivity[]): void {
    if (activities.length === 0) return;

    const spreadsheetId = PropertiesService.getScriptProperties().getProperty(Config.PROP_SPREADSHEET_ID);
    if (!spreadsheetId) {
        Logger.log(`${Config.PROP_SPREADSHEET_ID} が設定されていないため、バックアップをスキップします。`);
        return;
    }

    try {
        const sheet = getOrCreateBackupSheet(spreadsheetId);
        const existingIds = getExistingSheetActivityIds(sheet);
        const lastRow = sheet.getLastRow();

        const activitiesToProcess = filterNewActivities(activities, existingIds);
        if (activitiesToProcess.length === 0) {
            return;
        }

        if (typeof fetchWeatherDataBatch === 'function') {
            fetchWeatherDataBatch(activitiesToProcess);
        }

        const rows = createActivityRows(activitiesToProcess);
        if (rows.length === 0) return;

        sheet.getRange(lastRow + 1, 1, rows.length, rows[0].length).setValues(rows);
        Logger.log(`スプレッドシートに ${rows.length} 件バックアップしました。`);

    } catch (e) {
        const errorMsg = '[Backup Error] スプレッドシートへの書き込みに失敗しました: ' + String(e);
        Logger.log(errorMsg);
        if (typeof sendErrorEmail === 'function') sendErrorEmail(errorMsg);
    }
}

/**
 * バックアップ用シートを取得または新規作成する
 */
function getOrCreateBackupSheet(spreadsheetId: string): GoogleAppsScript.Spreadsheet.Sheet {
    const ss = SpreadsheetApp.openById(spreadsheetId);
    let sheet = ss.getSheetByName(Config.BACKUP_SHEET_NAME);

    // シートが存在しない場合は新規作成し、ヘッダーを設定
    if (!sheet) {
        sheet = ss.insertSheet(Config.BACKUP_SHEET_NAME);
        const headers = [
            'ID', '日付', '種類', '名前', '距離 (km)', '時間 (分)', '獲得標高 (m)',
            '平均心拍数', '最大心拍数', '平均ワット', 'ケイデンス', 'カロリー',
            '天気', 'AIコメント', 'URL'
        ];
        sheet.appendRow(headers);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    }

    return sheet;
}

/**
 * 既存のIDを除外して新しく処理するアクティビティのリストを返す
 */
function filterNewActivities(activities: StravaActivity[], existingIds: Set<string>): StravaActivity[] {
    const activitiesToProcess: StravaActivity[] = [];
    for (const a of activities) {
        const idStr = String(a.id);
        if (existingIds.has(idStr)) {
            Logger.log(`スキップ: 既に登録済みのアクティビティです: ${idStr}`);
        } else {
            existingIds.add(idStr); // 重複を避けるためセットにも追加
            activitiesToProcess.push(a);
        }
    }
    return activitiesToProcess;
}

/**
 * アクティビティデータをスプレッドシートの行データ配列に変換する
 */
function createActivityRows(activities: StravaActivity[]): any[][] {
    return activities.map(activity => {
        const distanceKm = activity.distance ? (activity.distance / 1000).toFixed(2) : '0';
        const timeMin = activity.moving_time ? Math.floor(activity.moving_time / 60) : 0;
        const date = activity.start_date_local
            ? new Date(activity.start_date_local.replace(/Z$/i, ''))
            : new Date(activity.start_date);

        // 天気とAIコメントの取得
        const weather = activity.weatherText || '';
        const aiComment = typeof generateAiComment === 'function' ? generateAiComment(activity) : '';
        const url = `https://www.strava.com/activities/${activity.id}`;

        return [
            activity.id,
            date,
            activity.type,
            activity.name,
            Number(distanceKm),
            timeMin,
            activity.total_elevation_gain || 0,
            activity.average_heartrate || '',
            activity.max_heartrate || '',
            activity.average_watts || '',
            activity.average_cadence || '',
            activity.calories || '',
            weather || '',
            aiComment || '',
            url
        ];
    });
}

/**
 * シートから既存のアクティビティIDのセットを取得する
 */
function getExistingSheetActivityIds(sheet: GoogleAppsScript.Spreadsheet.Sheet): Set<string> {
    const existingIds = new Set<string>();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return existingIds;

    sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat().forEach(id => {
        if (id) existingIds.add(String(id));
    });

    return existingIds;
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        backupToSpreadsheet,
        getExistingSheetActivityIds,
        getOrCreateBackupSheet,
        filterNewActivities,
        createActivityRows
    };
}
