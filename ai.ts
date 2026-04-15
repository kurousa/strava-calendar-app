// ==========================================
// AIによるコメント生成処理 (ai.ts)
// Google Gemini API を利用して、アクティビティへの労いコメントを生成します。
// ==========================================

let cachedAiApiKey: string | null = null;

/**
 * アクティビティデータに基づいてAIコメントを生成する
 * @param activity Stravaアクティビティデータ
 * @returns AIによるコメント
 */
function generateAiComment(activity: StravaActivity): string {
    if (cachedAiApiKey === null) {
        cachedAiApiKey = PropertiesService.getScriptProperties().getProperty(Config.PROP_GEMINI_API_KEY) || '';
    }
    const apiKey = cachedAiApiKey;

    if (!apiKey) {
        Logger.log(`${Config.PROP_GEMINI_API_KEY} が設定されていないため、AIコメント生成をスキップします。`);
        return '';
    }

    // 共通メトリクスを取得 (DefaultFormatter.ts で定義)
    const { distanceKm, timeMin, elevation, hr, weather } = getCommonMetrics(activity);

    const prompt = `
あなたはプロのスポーツコーチです。私のアクティビティデータに基づいて、短く温かい労いのコメントを1つ、日本語で生成してください。

アクティビティ情報:
- 種類: ${activity.type}
- 距離: ${distanceKm} km
- 時間: ${timeMin} 分
- 獲得標高: ${elevation} m
- 平均心拍数: ${hr}
- 天気: ${weather || '不明'}

要件:
- 1〜2文程度の短いコメントにしてください。
- 親しみやすく、モチベーションが上がるような内容にしてください。
- データ（坂道が多かった、心拍が安定していた、天候への対応など）に基づいた具体的な一言を添えてください。
- 余計な挨拶や解説は省き、コメント本体のみを出力してください。
`.trim();

    const url = `${Config.GEMINI_API_BASE}?key=${apiKey}`;

    const payload = {
        contents: [{
            parts: [{ text: prompt }]
        }]
    };

    try {
        const response = UrlFetchApp.fetch(url, {
            method: 'post',
            contentType: 'application/json',
            payload: JSON.stringify(payload),
            muteHttpExceptions: true
        });

        if (response.getResponseCode() !== 200) {
            // セキュリティのため、詳細なエラーレスポンスはログに出力せず、ステータスコードのみ記録します
            Logger.log(`[AI API Error] Status Code: ${response.getResponseCode()}`);
            return '';
        }

        const result = JSON.parse(response.getContentText());
        const comment = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

        return comment;
    } catch (e) {
        Logger.log(`[AI API Exception] AIコメントの生成中にエラーが発生しました。`);
        return '';
    }
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateAiComment,
        resetAiCache: () => { cachedAiApiKey = null; }
    };
}
