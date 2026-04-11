import { describe, it, expect, vi, beforeEach } from 'vitest';
import { importPastActivities, importPastActivitiesFromWeb } from '../manual_import';

describe('manual_import', () => {

    describe('importPastActivitiesFromWeb', () => {
        beforeEach(() => {
            vi.resetAllMocks();
            vi.stubGlobal('Logger', { log: vi.fn() });
            vi.stubGlobal('getStravaActivities', vi.fn());
            vi.stubGlobal('getTargetCalendar', vi.fn());
        });

        it('should correctly parse dates and pass them to importPastActivities', () => {
            global.getStravaActivities.mockReturnValue([]);

            const startStr = '2024-03-01';
            const endStr = '2024-03-31';

            const result = importPastActivitiesFromWeb(startStr, endStr);

            expect(result).toBe('該当する期間のアクティビティはありませんでした。');

            // Check that getStravaActivities was called with correctly parsed dates
            expect(global.getStravaActivities).toHaveBeenCalledTimes(1);
            const callArgs = global.getStravaActivities.mock.calls[0];

            expect(callArgs[0]).toBeInstanceOf(Date);
            // using getTime() to compare properly, accounting for local timezone issues where Date string output varies
            const expectedStart = new Date('2024-03-01T00:00:00');
            const expectedEnd = new Date('2024-03-31T23:59:59');

            expect(callArgs[0].getTime()).toBe(expectedStart.getTime());

            expect(callArgs[1]).toBeInstanceOf(Date);
            expect(callArgs[1].getTime()).toBe(expectedEnd.getTime());

            expect(callArgs[2]).toBe(200); // default perPage
        });
    });

    beforeEach(() => {
        vi.resetAllMocks();

        // Mock GAS globals
        vi.stubGlobal('Logger', {
            log: vi.fn()
        });

        // Mock dependencies from other files
        vi.stubGlobal('getStravaActivities', vi.fn());
        vi.stubGlobal('getTargetCalendar', vi.fn());
        vi.stubGlobal('processActivityToCalendar', vi.fn());
        vi.stubGlobal('backupToSpreadsheet', vi.fn());
    });

    it('should use default dates if not provided', () => {
        global.getStravaActivities.mockReturnValue([]);

        // Mock dates
        const mockNow = new Date('2024-03-15T12:00:00Z');
        vi.useFakeTimers();
        vi.setSystemTime(mockNow);

        importPastActivities();

        const expectedEndDate = mockNow;
        const expectedStartDate = new Date(mockNow);
        expectedStartDate.setMonth(mockNow.getMonth() - 1);

        expect(global.getStravaActivities).toHaveBeenCalledWith(expectedStartDate, expectedEndDate, 200);
        expect(global.Logger.log).toHaveBeenCalledWith(expect.stringContaining('直近1ヶ月'));

        vi.useRealTimers();
    });

    it('should return a message when no activities are found', () => {
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');
        global.getStravaActivities.mockReturnValue([]);

        const result = importPastActivities(startDate, endDate);

        expect(result).toBe('該当する期間のアクティビティはありませんでした。');
        expect(global.getStravaActivities).toHaveBeenCalledWith(startDate, endDate, 200);
    });

    it('should return an error message when calendar retrieval fails', () => {
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');
        global.getStravaActivities.mockReturnValue([{ id: 1 }]);
        global.getTargetCalendar.mockReturnValue(null);

        const result = importPastActivities(startDate, endDate);

        expect(result).toBe('カレンダーの取得に失敗しました。');
    });

    it('should process activities and return success/skip counts', () => {
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');
        const mockActivities = [
            { id: 101, name: 'Activity 1' },
            { id: 102, name: 'Activity 2' },
            { id: 103, name: 'Activity 3' }
        ];
        const mockCalendar = {
            getName: () => 'Test Calendar',
            getEvents: vi.fn(() => [
                { getDescription: () => 'strava.com/activities/102' }
            ])
        };

        global.getStravaActivities.mockReturnValue(mockActivities);
        global.getTargetCalendar.mockReturnValue(mockCalendar);

        // Mock the results for the two activities that are actually processed
        global.processActivityToCalendar
            .mockReturnValueOnce('success')
            .mockReturnValueOnce('success'); // The second call is now for activity 3, as activity 2 is skipped beforehand

        const result = importPastActivities(startDate, endDate);

        expect(result).toBe('✅ 完了! 新規登録: 2件 / スキップ: 1件');
        expect(global.processActivityToCalendar).toHaveBeenCalledTimes(2);
        expect(global.processActivityToCalendar).toHaveBeenNthCalledWith(1, mockActivities[0], mockCalendar, undefined, true);
        expect(global.processActivityToCalendar).toHaveBeenNthCalledWith(2, mockActivities[2], mockCalendar, undefined, true);
        
        // Verify backupToSpreadsheet call
        expect(global.backupToSpreadsheet).toHaveBeenCalledWith([mockActivities[0], mockActivities[2]]);
        
        expect(global.Logger.log).toHaveBeenCalledWith(expect.stringContaining('完了!'));
    });
});

describe('importPastActivitiesFromWeb', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.stubGlobal('getStravaActivities', vi.fn().mockReturnValue([]));
        vi.stubGlobal('getTargetCalendar', vi.fn().mockReturnValue(null));
        vi.stubGlobal('Logger', { log: vi.fn() });
    });

    it('should reject invalid date formats', () => {
        const result1 = importPastActivitiesFromWeb('2024/01/01', '2024-01-31');
        const result2 = importPastActivitiesFromWeb('2024-01-01', '2024/01/31');
        const result3 = importPastActivitiesFromWeb('abcdef', '123456');
        const result4 = importPastActivitiesFromWeb('', '2024-01-31');

        const expectedError = 'エラー: 日付の形式が正しくありません (YYYY-MM-DD)。';
        expect(result1).toBe(expectedError);
        expect(result2).toBe(expectedError);
        expect(result3).toBe(expectedError);
        expect(result4).toBe(expectedError);
        expect(global.Logger.log).toHaveBeenCalledWith(expectedError);
    });

    it('should reject invalid dates', () => {
        const result = importPastActivitiesFromWeb('2024-13-45', '2024-01-31');
        expect(result).toBe('エラー: 無効な日付が指定されました。');
        expect(global.Logger.log).toHaveBeenCalledWith('エラー: 無効な日付が指定されました。');
    });

    it('should reject invalid dates with rollover', () => {
        const result1 = importPastActivitiesFromWeb('2024-02-31', '2024-03-31');
        expect(result1).toBe('エラー: 無効な日付が指定されました。');

        const result2 = importPastActivitiesFromWeb('2024-11-31', '2024-12-01');
        expect(result2).toBe('エラー: 無効な日付が指定されました。');
    });

    it('should reject date ranges where start is after end', () => {
        const result = importPastActivitiesFromWeb('2024-01-31', '2024-01-01');
        expect(result).toBe('エラー: 開始日は終了日より前の日付を指定してください。');
        expect(global.Logger.log).toHaveBeenCalledWith('エラー: 開始日は終了日より前の日付を指定してください。');
    });

    it('should process valid dates', () => {
        const startStr = '2024-01-01';
        const endStr = '2024-01-31';

        global.getStravaActivities.mockReturnValue([]);

        const result = importPastActivitiesFromWeb(startStr, endStr);
        expect(result).toBe('該当する期間のアクティビティはありませんでした。');
        expect(global.getStravaActivities).toHaveBeenCalled();
    });
});
