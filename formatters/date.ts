
// ==========================================
// 日付操作関連のフォーマッター (date.ts)
// ==========================================

/**
 * アクティビティの開始日時文字列からDateオブジェクトを生成します。
 * ローカル時刻（start_date_local）が存在する場合はそれを優先し、
 * 'Z' が付与されている場合は削除してローカルタイムとして扱います。
 *
 * @param activity StravaActivityオブジェクト
 * @returns 変換されたDateオブジェクト
 */
function getActivityStartDate(activity: StravaActivity): Date {
    return activity.start_date_local
        ? new Date(activity.start_date_local.replace(/Z$/i, ''))
        : new Date(activity.start_date);
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getActivityStartDate };
}
