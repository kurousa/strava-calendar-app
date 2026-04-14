/**
 * マップ画像を保存するフォルダを取得または作成する
 */
function getOrCreateMapFolder(): GoogleAppsScript.Drive.Folder {
    const FOLDER_NAME = 'Strava_Route_Maps';
    const folders = DriveApp.getFoldersByName(FOLDER_NAME);
    if (folders.hasNext()) {
        return folders.next();
    }
    return DriveApp.createFolder(FOLDER_NAME);
}

/**
 * Stravaのポリラインからスタティックマップを生成し、Googleドライブに保存する
 */
function saveMapToDrive(activity: StravaActivity): GoogleAppsScript.Drive.File | null {
    if (!activity.map || !activity.map.summary_polyline) {
        return null;
    }

    try {
        const polyline = activity.map.summary_polyline;
        // Stravaのポリラインをデコードしてパスとして追加
        const map = Maps.newStaticMap()
            .setSize(600, 600)
            .setLanguage('ja')
            .addPath(polyline);

        const folder = getOrCreateMapFolder();
        const fileName = `strava_map_${activity.id}.png`;

        // すでにファイルが存在するかチェック（重複保存防止）
        const existingFiles = folder.getFilesByName(fileName);
        if (existingFiles.hasNext()) {
            return existingFiles.next();
        }

        const blob = map.getBlob();
        const file = folder.createFile(blob);
        file.setName(fileName);
        // カレンダーから参照できるように閲覧権限を設定
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

        return file;
    } catch (e) {
        Logger.log('マップの保存に失敗しました: ' + (e as Error).toString());
        return null;
    }
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getOrCreateMapFolder,
        saveMapToDrive
    };
}
