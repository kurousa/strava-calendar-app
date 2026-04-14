// ==========================================
// 機材メンテナンス・アラート処理 (gear.ts)
// ==========================================

interface GearConfig {
    thresholdKm: number;
    isPeriodic: boolean;
    lastAlertedKm: number;
}

const GEAR_CONFIG_PREFIX = 'GEAR_CONFIG_';

/**
 * 登録されている機材のアラートをチェックする
 */
function checkGearAlerts(): void {
    const profile = getStravaAthleteProfile();
    if (!profile) return;

    const gears = [...profile.bikes, ...profile.shoes];
    const props = PropertiesService.getScriptProperties();

    gears.forEach(gear => {
        const configStr = props.getProperty(GEAR_CONFIG_PREFIX + gear.id);
        if (!configStr) return;

        const config: GearConfig = JSON.parse(configStr);
        const currentKm = gear.distance / 1000;

        let shouldAlert = false;
        if (config.isPeriodic) {
            // 定期的な場合：現在の距離が（前回アラート時 + しきい値）を超えていたら通知
            if (currentKm >= config.lastAlertedKm + config.thresholdKm) {
                shouldAlert = true;
            }
        } else {
            // 1回限りの場合：現在の距離がしきい値を超えており、かつ前回アラート時がしきい値未満なら通知
            if (currentKm >= config.thresholdKm && config.lastAlertedKm < config.thresholdKm) {
                shouldAlert = true;
            }
        }

        if (shouldAlert) {
            Logger.log(`[Gear Alert] ${gear.name} (${currentKm.toFixed(1)}km / Threshold: ${config.thresholdKm}km)`);
            if (typeof sendGearAlert === 'function') {
                sendGearAlert(gear.name, currentKm, config.thresholdKm, config.isPeriodic);
            }

            // アラート済み距離を更新
            config.lastAlertedKm = currentKm;
            props.setProperty(GEAR_CONFIG_PREFIX + gear.id, JSON.stringify(config));
        }
    });
}

/**
 * 利用可能な機材の一覧をログ出力する（設定用）
 */
function listGears(): void {
    const profile = getStravaAthleteProfile();
    if (!profile) {
        Logger.log('プロフィールを取得できませんでした。');
        return;
    }

    Logger.log('--- 登録されている機材一覧 ---');
    [...profile.bikes, ...profile.shoes].forEach(gear => {
        const type = profile.bikes.includes(gear) ? 'Bike' : 'Shoes';
        Logger.log(`[${type}] 名前: ${gear.name}, ID: ${gear.id}, 距離: ${(gear.distance / 1000).toFixed(1)}km`);
    });
}

/**
 * 特定の機材にアラートしきい値を設定する
 * @param gearId 機材ID
 * @param thresholdKm しきい値（km）
 * @param isPeriodic 定期的（例: 3000kmごと）かどうか
 */
function setGearThreshold(gearId: string, thresholdKm: number, isPeriodic: boolean = false): void {
    const props = PropertiesService.getScriptProperties();
    const currentConfigStr = props.getProperty(GEAR_CONFIG_PREFIX + gearId);

    let lastAlertedKm = 0;
    if (currentConfigStr) {
        const currentConfig: GearConfig = JSON.parse(currentConfigStr);
        lastAlertedKm = currentConfig.lastAlertedKm;
    }

    const config: GearConfig = {
        thresholdKm: thresholdKm,
        isPeriodic: isPeriodic,
        lastAlertedKm: lastAlertedKm
    };

    props.setProperty(GEAR_CONFIG_PREFIX + gearId, JSON.stringify(config));
    Logger.log(`機材ID: ${gearId} にしきい値 ${thresholdKm}km (${isPeriodic ? '定期' : '1回限り'}) を設定しました。`);
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        checkGearAlerts,
        listGears,
        setGearThreshold,
    };
}
