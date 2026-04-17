import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// @ts-ignore
import { checkGearAlerts, listGears, setGearThreshold, getGearStatus } from '../gear';

describe('gear', () => {
    let mockProperties: { [key: string]: string } = {};

    beforeEach(() => {
        vi.clearAllMocks();
        mockProperties = {};

        vi.stubGlobal('Logger', { log: vi.fn() });
        vi.stubGlobal('PropertiesService', {
            getScriptProperties: vi.fn(() => ({
                getProperty: vi.fn((key) => mockProperties[key] || null),
                setProperty: vi.fn((key, value) => {
                    mockProperties[key] = value;
                }),
                getProperties: vi.fn(() => ({ ...mockProperties }))
            }))
        });
        vi.stubGlobal('getStravaAthleteProfile', vi.fn());
        vi.stubGlobal('sendGearAlert', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('setGearThreshold', () => {
        it('should store gear configuration in script properties', () => {
            setGearThreshold('g1', 500, false);
            expect(mockProperties['GEAR_CONFIG_g1']).toBeDefined();
            const config = JSON.parse(mockProperties['GEAR_CONFIG_g1']);
            expect(config.thresholdKm).toBe(500);
            expect(config.isPeriodic).toBe(false);
            expect(config.lastAlertedKm).toBe(0);
        });

        it('should preserve lastAlertedKm when updating threshold', () => {
            mockProperties['GEAR_CONFIG_g1'] = JSON.stringify({
                thresholdKm: 500,
                isPeriodic: false,
                lastAlertedKm: 510
            });

            setGearThreshold('g1', 600, true);
            const config = JSON.parse(mockProperties['GEAR_CONFIG_g1']);
            expect(config.thresholdKm).toBe(600);
            expect(config.isPeriodic).toBe(true);
            expect(config.lastAlertedKm).toBe(510);
        });

        it('should handle corrupted JSON gracefully in setGearThreshold', () => {
            mockProperties['GEAR_CONFIG_g1'] = 'corrupted { json';

            setGearThreshold('g1', 600, false);

            expect((global as any).Logger.log).toHaveBeenCalledWith(expect.stringContaining('corrupted'));
            const config = JSON.parse(mockProperties['GEAR_CONFIG_g1']);
            expect(config.lastAlertedKm).toBe(0); // Should reset to 0
        });
    });

    describe('checkGearAlerts', () => {
        it('should send alert for one-time threshold when exceeded', () => {
            const mockProfile = {
                bikes: [],
                shoes: [{ id: 's1', name: 'Shoes A', distance: 510000 }] // 510km
            };
            vi.stubGlobal('getStravaAthleteProfile', vi.fn(() => mockProfile));

            mockProperties['GEAR_CONFIG_s1'] = JSON.stringify({
                thresholdKm: 500,
                isPeriodic: false,
                lastAlertedKm: 0
            });

            checkGearAlerts();

            expect((global as any).sendGearAlert).toHaveBeenCalledWith('Shoes A', 510, 500, false);
            const updatedConfig = JSON.parse(mockProperties['GEAR_CONFIG_s1']);
            expect(updatedConfig.lastAlertedKm).toBe(510);
            // Verify PII is not leaked to logs
            expect((global as any).Logger.log).toHaveBeenCalledWith(expect.stringContaining('[Gear Alert] Gear ID: s1'));
            expect((global as any).Logger.log).not.toHaveBeenCalledWith(expect.stringContaining('Shoes A'));
        });

        it('should not send alert for one-time threshold if already alerted', () => {
            const mockProfile = {
                bikes: [],
                shoes: [{ id: 's1', name: 'Shoes A', distance: 520000 }] // 520km
            };
            vi.stubGlobal('getStravaAthleteProfile', vi.fn(() => mockProfile));

            mockProperties['GEAR_CONFIG_s1'] = JSON.stringify({
                thresholdKm: 500,
                isPeriodic: false,
                lastAlertedKm: 510
            });

            checkGearAlerts();

            expect((global as any).sendGearAlert).not.toHaveBeenCalled();
        });

        it('should send alert for periodic threshold when interval exceeded', () => {
            const mockProfile = {
                bikes: [{ id: 'b1', name: 'Bike B', distance: 3100000 }], // 3100km
                shoes: []
            };
            vi.stubGlobal('getStravaAthleteProfile', vi.fn(() => mockProfile));

            mockProperties['GEAR_CONFIG_b1'] = JSON.stringify({
                thresholdKm: 3000,
                isPeriodic: true,
                lastAlertedKm: 0
            });

            checkGearAlerts();

            expect((global as any).sendGearAlert).toHaveBeenCalledWith('Bike B', 3100, 3000, true);
        });

        it('should handle corrupted JSON gracefully in checkGearAlerts', () => {
            const mockProfile = {
                bikes: [{ id: 'b1', name: 'Bike B', distance: 3100000 }],
                shoes: []
            };
            vi.stubGlobal('getStravaAthleteProfile', vi.fn(() => mockProfile));

            mockProperties['GEAR_CONFIG_b1'] = 'invalid json';

            checkGearAlerts();

            expect((global as any).sendGearAlert).not.toHaveBeenCalled();
            expect((global as any).Logger.log).toHaveBeenCalledWith(expect.stringContaining('Failed to parse configuration for gear ID: b1'));
        });
    });

    describe('listGears', () => {
        it('should log all bikes and shoes', () => {
            const mockProfile = {
                bikes: [{ id: 'b1', name: 'My Bike', distance: 1000000 }],
                shoes: [{ id: 's1', name: 'My Shoes', distance: 500000 }]
            };
            vi.stubGlobal('getStravaAthleteProfile', vi.fn(() => mockProfile));

            listGears();

            expect((global as any).Logger.log).toHaveBeenCalledWith('--- 登録されている機材一覧 ---');
            expect((global as any).Logger.log).toHaveBeenCalledWith('[Bike] 名前: My Bike, ID: b1, 距離: 1000.0km');
            expect((global as any).Logger.log).toHaveBeenCalledWith('[Shoes] 名前: My Shoes, ID: s1, 距離: 500.0km');
        });
    });

    describe('getGearStatus', () => {
        it('should return combined status for all gears', () => {
            const mockProfile = {
                bikes: [{ id: 'b1', name: 'My Bike', distance: 1000000 }],
                shoes: [{ id: 's1', name: 'My Shoes', distance: 500000 }]
            };
            vi.stubGlobal('getStravaAthleteProfile', vi.fn(() => mockProfile));

            mockProperties['GEAR_CONFIG_b1'] = JSON.stringify({
                thresholdKm: 3000,
                isPeriodic: true,
                lastAlertedKm: 0
            });
            // s1 has no config

            const status = getGearStatus();

            expect(status).toHaveLength(2);
            expect(status).toContainEqual({
                id: 'b1',
                name: 'My Bike',
                type: 'Bike',
                distanceKm: 1000,
                thresholdKm: 3000,
                isPeriodic: true
            });
            expect(status).toContainEqual({
                id: 's1',
                name: 'My Shoes',
                type: 'Shoes',
                distanceKm: 500,
                thresholdKm: 0,
                isPeriodic: false
            });
        });

        it('should handle corrupted JSON in config', () => {
            const mockProfile = {
                bikes: [{ id: 'b1', name: 'My Bike', distance: 1000000 }],
                shoes: []
            };
            vi.stubGlobal('getStravaAthleteProfile', vi.fn(() => mockProfile));

            mockProperties['GEAR_CONFIG_b1'] = 'invalid';

            const status = getGearStatus();

            expect(status[0].thresholdKm).toBe(0);
            expect((global as any).Logger.log).toHaveBeenCalledWith(expect.stringContaining('Failed to parse config for gear b1'));
        });
    });
});
