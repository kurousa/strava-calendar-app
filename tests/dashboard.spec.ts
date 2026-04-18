import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// @ts-ignore
import { getDashboardData } from '../dashboard';

describe('dashboard', () => {
    let mockProperties: { [key: string]: string } = {};

    beforeEach(() => {
        vi.clearAllMocks();
        mockProperties = {};

        vi.stubGlobal('Logger', { log: vi.fn() });
        vi.stubGlobal('PropertiesService', {
            getScriptProperties: vi.fn(() => ({
                getProperty: vi.fn((key) => mockProperties[key] || null),
            }))
        });

        vi.stubGlobal('SpreadsheetApp', {
            openById: vi.fn().mockReturnValue({
                getSheetByName: vi.fn().mockReturnValue({
                    getDataRange: vi.fn().mockReturnValue({
                        getValues: vi.fn().mockReturnValue([
                            ['ID', '日付', '種類', '名前', '距離 (km)', '時間 (分)', '獲得標高 (m)', '平均心拍数', '体重(kg)', 'URL'],
                            ['123', new Date().toISOString(), 'Run', 'Morning Run', 10, 60, 100, 150, 70, 'http://strava.com/123']
                        ])
                    })
                })
            })
        });

        vi.stubGlobal('getGearStatus', vi.fn().mockReturnValue([
            { id: 'g1', name: 'Bike', distanceKm: 100 }
        ]));
        
        // Mock Config
        (global as any).Config = {
            PROP_SPREADSHEET_ID: 'PROP_SPREADSHEET_ID',
            BACKUP_SHEET_NAME: 'BACKUP_SHEET_NAME'
        };
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('should return dashboard data when all inputs are valid', () => {
        mockProperties['PROP_SPREADSHEET_ID'] = 'fake-ss-id';

        const result = getDashboardData();

        expect(result).toBeDefined();
        if (result) {
            expect(result.lastActivity?.title).toBe('Morning Run');
            expect(result.fitness).toBeGreaterThan(0);
            expect(result.gears).toHaveLength(1);
            expect(result.gears[0].name).toBe('Bike');
        }
    });

    it('should return undefined and log error if spreadsheet ID is missing', () => {
        const result = getDashboardData();

        expect(result).toBeUndefined();
        expect((global as any).Logger.log).toHaveBeenCalledWith(expect.stringContaining('設定されていないため'));
    });

    it('should return undefined and log error if sheet is missing', () => {
        mockProperties['PROP_SPREADSHEET_ID'] = 'fake-ss-id';
        (global as any).SpreadsheetApp.openById().getSheetByName.mockReturnValue(null);

        const result = getDashboardData();

        expect(result).toBeUndefined();
        expect((global as any).Logger.log).toHaveBeenCalledWith(expect.stringContaining('設定されていないため'));
    });
});
