// ==========================================
// 機材メンテナンス・アラート処理 (gear.ts)
// ==========================================

interface GearConfig {
    thresholdKm: number;
    isPeriodic: boolean;
    lastAlertedKm: number;
}


/**
 * 登録されている機材のアラートをチェックする
 */
function checkGearAlerts(): void {
    const profile = getStravaAthleteProfile();
    if (!profile) return;

    const gears = [...profile.bikes, ...profile.shoes];
    const props = PropertiesService.getScriptProperties();
    // ⚡ Bolt Optimization: Fetch all properties once to avoid multiple API calls in the loop
    const allProps = props.getProperties();

    gears.forEach(gear => {
        const configStr = allProps[Config.GEAR_CONFIG_PREFIX + gear.id];
        if (!configStr) return;

        let config: GearConfig;
        try {
            config = JSON.parse(configStr);
        } catch (e) {
            // 🔒 Security: Do not log the raw error or config string to prevent PII/internal detail leakage
            Logger.log(`[Gear Alert Error] Failed to parse configuration for gear ID: ${gear.id}`);
            return;
        }

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
            // 🔒 Security: Only log gear ID and numeric data, avoid gear names in debug logs
            Logger.log(`[Gear Alert] Gear ID: ${gear.id} reached ${currentKm.toFixed(1)}km (Threshold: ${config.thresholdKm}km)`);
            if (typeof sendGearAlert === 'function') {
                sendGearAlert(gear.name, currentKm, config.thresholdKm, config.isPeriodic);
            }

            // アラート済み距離を更新
            config.lastAlertedKm = currentKm;
            props.setProperty(Config.GEAR_CONFIG_PREFIX + gear.id, JSON.stringify(config));
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
        // listGearsは管理者が意図的に呼び出すユーティリティのため、名前を含めて出力します
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
    const currentConfigStr = props.getProperty(Config.GEAR_CONFIG_PREFIX + gearId);

    let lastAlertedKm = 0;
    if (currentConfigStr) {
        try {
            const currentConfig: GearConfig = JSON.parse(currentConfigStr);
            lastAlertedKm = currentConfig.lastAlertedKm;
        } catch (e) {
            Logger.log(`[Gear Alert Error] Existing configuration for gear ID: ${gearId} was corrupted. resetting lastAlertedKm to 0.`);
            const errorMsg = `[Gear Alert Error] Existing configuration for gear ID: ${gearId} was corrupted.`;
            if (typeof sendErrorEmail === 'function') sendErrorEmail(errorMsg);
        }
    }

    const config: GearConfig = {
        thresholdKm: thresholdKm,
        isPeriodic: isPeriodic,
        lastAlertedKm: lastAlertedKm
    };

    props.setProperty(Config.GEAR_CONFIG_PREFIX + gearId, JSON.stringify(config));
    Logger.log(`機材ID: ${gearId} にしきい値 ${thresholdKm}km (${isPeriodic ? '定期' : '1回限り'}) を設定しました。`);
}

/**
 * 各機材の現在のステータス（累積距離とアラートしきい値）を取得する
 */
function getGearStatus(): GearStatus[] {
    const profile = getStravaAthleteProfile();
    if (!profile) return [];

    const gears = [...profile.bikes, ...profile.shoes];
    const props = PropertiesService.getScriptProperties();
    const allProps = props.getProperties();

    return gears.map(gear => {
        const configStr = allProps[Config.GEAR_CONFIG_PREFIX + gear.id];
        let thresholdKm = 0;
        let isPeriodic = false;

        if (configStr) {
            try {
                const config: GearConfig = JSON.parse(configStr);
                thresholdKm = config.thresholdKm;
                isPeriodic = config.isPeriodic;
            } catch (e) {
                Logger.log(`[Gear Status Error] Failed to parse config for gear ${gear.id}`);
                const errorMsg = `[Gear Status Error] Failed to parse config for gear ${gear.id}`;
                if (typeof sendErrorEmail === 'function') sendErrorEmail(errorMsg);
            }
        }

        return {
            id: gear.id,
            name: gear.name,
            type: profile.bikes.includes(gear) ? 'Bike' : 'Shoes',
            distanceKm: gear.distance / 1000,
            thresholdKm: thresholdKm,
            isPeriodic: isPeriodic
        };
    });
}

// Node.js環境（テスト時）のみエクスポートする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        checkGearAlerts,
        listGears,
        setGearThreshold,
        getGearStatus,
    };
}
