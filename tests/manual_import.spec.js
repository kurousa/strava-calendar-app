import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as manualImport from '../src/manual_import';
import * as api from '../src/api';
import * as main from '../src/main';

describe('manual_import', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        global.Logger.log.mockClear();

        vi.spyOn(api, 'getStravaActivities').mockReturnValue([
            { id: 1, type: 'Run', start_date: '2024-01-01T00:00:00Z', elapsed_time: 3600 }
        ]);

        const mockCalendar = {
            getEvents: vi.fn(() => []),
            createEvent: vi.fn(),
            getName: vi.fn(() => 'Mock Calendar')
        };
        vi.spyOn(main, 'getTargetCalendar').mockReturnValue(mockCalendar);
        vi.spyOn(main, 'processActivityToCalendar').mockReturnValue('success');
    });

    describe('importPastActivitiesFromWeb', () => {
        it('should correctly parse dates and pass them to importPastActivities', () => {
            const startStr = '2024-01-01';
            const endStr = '2024-01-31';

            manualImport.importPastActivitiesFromWeb(startStr, endStr);

            expect(api.getStravaActivities).toHaveBeenCalledTimes(1);
            const callArgs = api.getStravaActivities.mock.calls[0];

            expect(callArgs[0]).toBeInstanceOf(Date);
            expect(callArgs[0].getFullYear()).toBe(2024);
            expect(callArgs[0].getMonth()).toBe(0); // 0-indexed, so 0 is Jan
            expect(callArgs[0].getDate()).toBe(1);

            expect(callArgs[1]).toBeInstanceOf(Date);
            expect(callArgs[1].getFullYear()).toBe(2024);
            expect(callArgs[1].getMonth()).toBe(0);
            expect(callArgs[1].getDate()).toBe(31);
            expect(callArgs[1].getHours()).toBe(23);
            expect(callArgs[1].getMinutes()).toBe(59);
            expect(callArgs[1].getSeconds()).toBe(59);
        });

        it('should reject invalid date formats', () => {
            const result1 = manualImport.importPastActivitiesFromWeb('2024/01/01', '2024-01-31');
            expect(result1).toContain('形式が正しくありません');

            const result2 = manualImport.importPastActivitiesFromWeb('2024-01-01', 'invalid');
            expect(result2).toContain('形式が正しくありません');
        });

        it('should reject invalid dates', () => {
            const result = manualImport.importPastActivitiesFromWeb('2024-13-45', '2024-01-31');
            expect(result).toContain('無効な日付');
        });

        it('should reject date ranges where start is after end', () => {
            const result = manualImport.importPastActivitiesFromWeb('2024-02-01', '2024-01-31');
            expect(result).toContain('開始日は終了日より前');
        });
    });

    describe('importPastActivities', () => {
        it('should use default dates if not provided', () => {
            const mockNow = new Date('2024-03-15T12:00:00Z');
            vi.useFakeTimers();
            vi.setSystemTime(mockNow);

            manualImport.importPastActivities();

            const expectedEndDate = mockNow;
            const expectedStartDate = new Date(mockNow);
            expectedStartDate.setMonth(mockNow.getMonth() - 1);

            expect(api.getStravaActivities).toHaveBeenCalledWith(expect.any(Date), expect.any(Date), 200);
            expect(global.Logger.log).toHaveBeenCalledWith(expect.stringContaining('直近1ヶ月'));

            vi.useRealTimers();
        });

        it('should return a message when no activities are found', () => {
            api.getStravaActivities.mockReturnValue([]);
            const startDate = new Date('2024-01-01T00:00:00Z');
            const endDate = new Date('2024-01-31T23:59:59Z');

            const result = manualImport.importPastActivities(startDate, endDate);

            expect(result).toBe('該当する期間のアクティビティはありませんでした。');
            expect(api.getStravaActivities).toHaveBeenCalledWith(startDate, endDate, 200);
        });

        it('should return an error message when calendar retrieval fails', () => {
            main.getTargetCalendar.mockReturnValue(null);
            const startDate = new Date('2024-01-01T00:00:00Z');
            const endDate = new Date('2024-01-31T23:59:59Z');

            const result = manualImport.importPastActivities(startDate, endDate);

            expect(result).toBe('カレンダーの取得に失敗しました。');
        });

        it('should process activities and return success/skip counts', () => {
            const startDate = new Date('2024-01-01T00:00:00Z');
            const endDate = new Date('2024-01-31T23:59:59Z');

            const mockActivities = [
                { id: 1, type: 'Run' },
                { id: 2, type: 'Ride' },
                { id: 3, type: 'Swim' }
            ];
            api.getStravaActivities.mockReturnValue(mockActivities);

            const mockCalendar = {
                getEvents: vi.fn(() => [
                    { getDescription: () => 'strava.com/activities/2' } // Activity 2 is duplicate
                ]),
                createEvent: vi.fn(),
                getName: vi.fn(() => 'Mock Calendar')
            };
            main.getTargetCalendar.mockReturnValue(mockCalendar);

            // Mock processActivityToCalendar behavior
            main.processActivityToCalendar.mockImplementation((activity) => {
                if (activity.id === 1) return 'success';
                if (activity.id === 3) return 'success';
                return 'skipped'; // Should not hit this because 2 is filtered earlier, but just in case
            });

            const result = manualImport.importPastActivities(startDate, endDate);

            expect(result).toBe('✅ 完了! 新規登録: 2件 / スキップ: 1件');
            expect(main.processActivityToCalendar).toHaveBeenCalledTimes(2); // Only for 1 and 3
        });
    });
});
