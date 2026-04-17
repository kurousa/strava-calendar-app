/**
 * 心拍数と時間から TSS (近似値) を計算する
 */
function calculateTSS(durationSec: number, avgHR: number, maxHR: number, restHR: number): number {
    if (!avgHR || !maxHR) return 0;
    
    // 強度係数 (Intensity Factor) の簡易計算
    const hrReserve = maxHR - restHR;
    const intensity = (avgHR - restHR) / hrReserve;
    
    // TSS = (sec * HR * IF) / (MaxHR * 3600) * 100
    // 1時間の全力運動を 100 と定義
    const tss = (durationSec * intensity * intensity) / 3600 * 100;
    return Math.round(tss);
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateTSS,
    };
}