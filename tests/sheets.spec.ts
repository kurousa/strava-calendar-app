import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('sheets.ts', () => {
    let mockSpreadsheet: any;
    let mockSheet: any;
    let mockRange: any;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();

        mockRange = {
            setFontWeight: vi.fn().mockReturnThis(),
            getValues: vi.fn().mockReturnValue([]),
            setValues: vi.fn(),
            flat: vi.fn().mockReturnValue([]),
        };

        mockSheet = {
            insertSheet: vi.fn().mockReturnThis(),
            appendRow: vi.fn(),
            setFrozenRows: vi.fn(),
            getRange: vi.fn().mockReturnValue(mockRange),
            getLastRow: vi.fn().mockReturnValue(0),
        };

        mockSpreadsheet = {
            getSheetByName: vi.fn(),
            insertSheet: vi.fn().mockReturnValue(mockSheet),
        };

        global.SpreadsheetApp.openById = vi.fn().mockReturnValue(mockSpreadsheet);
        global.PropertiesService.getScriptProperties = vi.fn().mockReturnValue({
            getProperty: vi.fn((key: string) => {
                if (key === 'SPREADSHEET_ID') return 'fake_spreadsheet_id';
                return null;
            })
        });
        global.Logger.log = vi.fn();
    });

    it('should skip backup if SPREADSHEET_ID is not set', async () => {
        global.PropertiesService.getScriptProperties = vi.fn().mockReturnValue({
            getProperty: vi.fn().mockReturnValue(null)
        });

        const { backupToSpreadsheet } = await import('../sheets');
        backupToSpreadsheet([{ id: 123 } as any]);

        expect(global.Logger.log).toHaveBeenCalledWith(expect.stringContaining('SPREADSHEET_ID が設定されていない'));
        expect(global.SpreadsheetApp.openById).not.toHaveBeenCalled();
    });

    it('should skip backup if no activities are provided', async () => {
        const { backupToSpreadsheet } = await import('../sheets');
        backupToSpreadsheet([]);

        expect(global.SpreadsheetApp.openById).not.toHaveBeenCalled();
    });

    it('should create a new sheet and headers if the sheet does not exist', async () => {
        mockSpreadsheet.getSheetByName.mockReturnValue(null);
        mockSpreadsheet.insertSheet.mockReturnValue(mockSheet);

        const { backupToSpreadsheet } = await import('../sheets');
        const activities = [
            {
                id: 12345,
                start_date_local: '2023-01-01T10:00:00Z',
                type: 'Run',
                name: 'Morning Run',
                distance: 5000,
                moving_time: 1800,
                total_elevation_gain: 50,
                average_heartrate: 150,
                max_heartrate: 180,
                average_watts: 200,
                average_cadence: 80,
                calories: 500,
                start_latlng: [35.0, 139.0]
            }
        ];

        // モックを差し込んで副作用を抑える
        vi.stubGlobal('fetchWeatherData', vi.fn().mockReturnValue('Sunny'));
        vi.stubGlobal('generateAiComment', vi.fn().mockReturnValue('Nice!'));

        backupToSpreadsheet(activities as any);

        expect(mockSpreadsheet.getSheetByName).toHaveBeenCalledWith('Activities');
        expect(mockSpreadsheet.insertSheet).toHaveBeenCalledWith('Activities');
        expect(mockSheet.appendRow).toHaveBeenCalledWith(expect.arrayContaining([
            'ID', '日付', '種類', '名前', '距離 (km)', '時間 (分)', '獲得標高 (m)', 
            '平均心拍数', '最大心拍数', '平均ワット', 'ケイデンス', 'カロリー', 
            '天気', 'AIコメント', 'URL'
        ]));
        expect(mockSheet.setFrozenRows).toHaveBeenCalledWith(1);
    });

    it('should append activities to existing sheet and skip duplicates', async () => {
        mockSpreadsheet.getSheetByName.mockReturnValue(mockSheet);
        mockSheet.getLastRow.mockReturnValue(2); // Headers + 1 record
        mockRange.getValues.mockReturnValue([['12345']]); // Existing ID

        const { backupToSpreadsheet } = await import('../sheets');
        const activities = [
            { id: 12345, name: 'Duplicate' },
            { 
                id: 67890, 
                name: 'New Activity',
                start_date_local: '2023-01-02T10:00:00Z',
                type: 'Ride',
                distance: 10000,
                moving_time: 3600,
                total_elevation_gain: 100,
                average_heartrate: 140,
                max_heartrate: 160,
                average_watts: 180,
                average_cadence: 90,
                calories: 800,
                start_latlng: [35.0, 139.0]
            }
        ];

        vi.stubGlobal('fetchWeatherData', vi.fn().mockReturnValue('Cloudy'));
        vi.stubGlobal('generateAiComment', vi.fn().mockReturnValue('Good effort!'));

        backupToSpreadsheet(activities as any);

        expect(global.Logger.log).toHaveBeenCalledWith(expect.stringContaining('スキップ: 既に登録済み'));
        expect(mockSheet.getRange).toHaveBeenNthCalledWith(1, 2, 1, 1, 1);
        expect(mockSheet.getRange).toHaveBeenNthCalledWith(2, 3, 1, 1, 15); // column count is 15
        expect(mockRange.setValues).toHaveBeenCalledWith([
            [
                67890,
                expect.any(Date),
                'Ride',
                'New Activity',
                10,
                60,
                100,
                140,
                160,
                180,
                90,
                800,
                'Cloudy',
                'Good effort!',
                'https://www.strava.com/activities/67890'
            ]
        ]);
        expect(global.Logger.log).toHaveBeenCalledWith(expect.stringContaining('1 件バックアップしました'));
    });

    it('should handle errors and log them', async () => {
        global.SpreadsheetApp.openById = vi.fn().mockImplementation(() => {
            throw new Error('Spreadsheet not found');
        });

        const { backupToSpreadsheet } = await import('../sheets');
        backupToSpreadsheet([{ id: 123 } as any]);

        expect(global.Logger.log).toHaveBeenCalledWith(expect.stringContaining('[Backup Error]'));
    });
});
