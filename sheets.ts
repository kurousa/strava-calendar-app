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
        
        const existingIds = new Set<string>();
        const lastRow = sheet.getLastRow();
        if (lastRow > 1) {
            sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat().forEach(id => {
                if (id) existingIds.add(String(id));
            });
        }

        // バックアップ対象のアクティビティを抽出
        const targetActivities = activities.filter(activity => !existingIds.has(String(activity.id)));

        if (targetActivities.length === 0) {
            Logger.log(`全てのアクティビティは既に登録済みです。`);
            return;
        }

        // 天気情報を一括取得してアクティビティオブジェクトに設定
        if (typeof fetchWeatherDataBatch === 'function') {
            fetchWeatherDataBatch(targetActivities);
        }

        const rows = targetActivities.map(activity => {
            const distanceKm = activity.distance ? (activity.distance / 1000).toFixed(2) : '0';
            const timeMin = activity.moving_time ? Math.floor(activity.moving_time / 60) : 0;
            const date = getActivityStartDate(activity);
            
            // AIコメントの取得
            const aiComment = activity.aiComment || generateAiComment(activity);
            // バッチ処理で取得済みの天気を使用
            const weather = activity.weatherText || '';
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
        })
        .filter((row): row is any[] => row !== undefined);

        if (rows.length === 0) return;

        sheet.getRange(lastRow + 1, 1, rows.length, rows[0].length).setValues(rows);
        Logger.log(`スプレッドシートに ${rows.length} 件バックアップしました。`);

    } catch (e) {
        const errorMsg = '[Backup Error] スプレッドシートへの書き込みに失敗しました: ' + String(e);
        Logger.log(errorMsg);
        if (typeof sendErrorEmail === 'function') sendErrorEmail(errorMsg);
    }
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        backupToSpreadsheet
    };
}