// ==========================================
// スプレッドシートへのバックアップ処理 (sheets.ts)
// ==========================================

const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
const SHEET_NAME = 'Activities'; // バックアップ先のシート名

/**
 * 成功したアクティビティを一括でスプレッドシートに追記する
 */
function backupToSpreadsheet(activities: StravaActivity[]): void {
    if (!SPREADSHEET_ID) {
        Logger.log('SPREADSHEET_ID が設定されていないため、バックアップをスキップします。');
        return;
    }
    if (activities.length === 0) return;

    try {
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        let sheet = ss.getSheetByName(SHEET_NAME);
        
        // シートが存在しない場合は新規作成し、ヘッダーを設定
        if (!sheet) {
            sheet = ss.insertSheet(SHEET_NAME);
            const headers = ['ID', '日付', '種類', '名前', '距離 (km)', '時間 (分)', '獲得標高 (m)', '平均心拍数', '体重(kg)', 'URL'];
            sheet.appendRow(headers);
            // ヘッダー行を固定し、太字にする装飾
            sheet.setFrozenRows(1);
            sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
        }
        
        // シートに既存のレコードがある場合は、既存のレコードを取得（重複登録を防止するため）
        const existingIds = new Set<string>();
        const lastRow = sheet.getLastRow();
        if (lastRow > 1) {
            sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat().forEach(id => {
                if (id) existingIds.add(String(id));
            });
        }

        // アクティビティをスプレッドシートの「行 (配列)」の形式に変換
        const rows = activities.map(activity => {
            if (existingIds.has(String(activity.id))) {
                Logger.log(`スキップ: 既に登録済みのアクティビティです: ${activity.id}`);
                return;
            }
            const distanceKm = activity.distance ? (activity.distance / 1000).toFixed(2) : '0';
            const timeMin = activity.moving_time ? Math.floor(activity.moving_time / 60) : 0;
            // Stravaの開始時間をスプレッドシートで扱いやすい形式に
            // start_date_local はローカル時刻だが、Strava APIが末尾に 'Z'（UTC）を
            // 付与するため、除去してGASのスクリプトタイムゾーンで正しく解釈させる
            const localDateStr = (activity.start_date_local || activity.start_date).replace(/Z$/i, '');
            const date = new Date(localDateStr);
            const weight = getAthleteWeight();
            const url = `https://www.strava.com/activities/${activity.id}`;

            return [
                activity.id,
                date,
                activity.type,
                activity.name,
                Number(distanceKm), // 数値として入力
                timeMin,
                activity.total_elevation_gain || 0,
                activity.average_heartrate || '',
                weight,
                url
            ];
        })
        // undefined（スキップされたもの）を除外
        .filter((row): row is any[] => row !== undefined);
        // 新規登録するアクティビティがない場合は終了
        if (rows.length === 0) return;

        // 最終行の次の行から、一括でデータを流し込む（非常に高速）
        sheet.getRange(lastRow + 1, 1, rows.length, rows[0] ? rows[0].length : 0).setValues(rows);
        
        Logger.log(`スプレッドシートに ${rows.length} 件バックアップしました。`);

    } catch (e) {
        Logger.log(`[Backup Error] スプレッドシートへの書き込みに失敗しました: ${e}`);
    }
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        backupToSpreadsheet
    };
}