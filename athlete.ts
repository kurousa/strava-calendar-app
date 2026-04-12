/**
 * アスリートの体重を取得する
 * @returns {number | null} 体重（kg）または null
 */
function getAthleteWeight(): number | null {
    const profile = getStravaAthleteProfile();
    const weight = profile?.weight ?? null;
    return weight;
}

// (動作確認用) getAthleteProfileを呼び出して、アスリートの情報を取得する
function __syncAthleteData(): void {
    const profile = getStravaAthleteProfile();
    if (!profile) return;

    // 体重を取得
    const weight = profile.weight;
    
    // FTPを取得
    const ftp = profile.ftp;

    // メインのバイク名を取得
    const mainBike = profile.bikes.find(b => b.primary)?.name || '未設定';

    Logger.log(`アスリート: ${profile.firstname} ${profile.lastname}`);
    Logger.log(`体重: ${weight}kg, FTP: ${ftp}W, メインバイク: ${mainBike}`);

}


// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getAthleteWeight,
        __syncAthleteData,
    };
}
