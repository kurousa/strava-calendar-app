import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { importPastActivities } from '../manual_import';

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
        vi.stubGlobal('getExistingActivityIds', vi.fn().mockReturnValue(new Set(['102'])));
        vi.stubGlobal('processActivityToCalendar', vi.fn().mockReturnValue('success'));
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

