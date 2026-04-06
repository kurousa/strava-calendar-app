import { describe, it, expect, vi, beforeEach } from 'vitest';
import { importPastActivities, importPastActivitiesFromWeb } from '../manual_import';

describe('manual_import', () => {
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
