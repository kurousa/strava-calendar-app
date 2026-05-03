import { describe, it, expect, vi, beforeEach } from 'vitest';
import { main } from '../main';

describe('main function', () => {
    let mockCalendar: any;

    beforeEach(() => {
        vi.resetAllMocks();
        vi.resetModules();

        mockCalendar = {
            getName: vi.fn().mockReturnValue('Test Calendar'),
            getEvents: vi.fn().mockReturnValue([]),
            createEvent: vi.fn().mockReturnValue({
                setColor: vi.fn(),
                getDescription: vi.fn()
            })
        };

        // GAS globals are already mocked in vitest.setup.ts, 
        // but we need to ensure they return our mockCalendar
        global.CalendarApp.getDefaultCalendar.mockReturnValue(mockCalendar);
        global.CalendarApp.getCalendarById.mockReturnValue(mockCalendar);
        
        // Mock other dependencies
        vi.stubGlobal('getStravaActivities', vi.fn());
        vi.stubGlobal('backupToSpreadsheet', vi.fn());
        vi.stubGlobal('Logger', { log: vi.fn() });
        vi.stubGlobal('Utilities', { sleep: vi.fn() });
    });

    it('should fetch activities from yesterday to now and process them', async () => {
        const { main } = await import('../main.ts');
        const mockNow = new Date('2024-03-15T12:00:00Z');
        vi.useFakeTimers();
        vi.setSystemTime(mockNow);

        const mockActivities = [
            { 
                id: 101, 
                name: 'Activity 1', 
                type: 'Run', 
                start_date: '2024-03-15T10:00:00Z', 
                elapsed_time: 3600, 
                distance: 5000 
            },
            { 
                id: 102, 
                name: 'Activity 2', 
                type: 'Ride', 
                start_date: '2024-03-15T11:00:00Z', 
                elapsed_time: 7200, 
                distance: 20000 
            }
        ];
        (global as any).getStravaActivities.mockReturnValue(mockActivities);

        main();

        const yesterday = new Date(mockNow);
        yesterday.setDate(yesterday.getDate() - 1);

        expect(global.getStravaActivities).toHaveBeenCalledWith(yesterday, mockNow);
        
        // Check if createEvent was called for both activities
        expect(mockCalendar.createEvent).toHaveBeenCalledTimes(2);
        expect(mockCalendar.createEvent).toHaveBeenCalledWith(
            expect.stringContaining('Activity 1'),
            expect.any(Date),
            expect.any(Date),
            expect.any(Object)
        );
        
        expect(global.backupToSpreadsheet).toHaveBeenCalledWith(mockActivities);

        vi.useRealTimers();
    });

    it('should skip already registered activities using batch loaded events', async () => {
        const { main } = await import('../main.ts');
        const mockActivities = [
            { 
                id: 101, 
                name: 'Activity 1', 
                type: 'Run', 
                start_date: '2024-03-14T10:00:00Z', 
                elapsed_time: 3600, 
                distance: 5000 
            },
            { 
                id: 102, 
                name: 'Activity 2', 
                type: 'Ride', 
                start_date: '2024-03-14T11:00:00Z', 
                elapsed_time: 7200, 
                distance: 20000 
            }
        ];
        (global as any).getStravaActivities.mockReturnValue(mockActivities);
        
        // Mock existing events in calendar
        mockCalendar.getEvents.mockReturnValue([
            { getTag: vi.fn().mockReturnValue(null), getDescription: () => 'Link: https://www.strava.com/activities/101' }
        ]);

        main();

        // Activity 101 is skipped because it's in existingActivityIds
        // Only 102 should be processed
        expect(mockCalendar.createEvent).toHaveBeenCalledTimes(1);
        expect(mockCalendar.createEvent).toHaveBeenCalledWith(
            expect.stringContaining('Activity 2'),
            expect.any(Date),
            expect.any(Date),
            expect.any(Object)
        );
        expect(global.backupToSpreadsheet).toHaveBeenCalledWith([mockActivities[1]]);
    });

    it('should return early if no activities are found', async () => {
        const { main } = await import('../main.ts');
        (global as any).getStravaActivities.mockReturnValue([]);

        main();

        expect(global.CalendarApp.getDefaultCalendar).not.toHaveBeenCalled();
        expect(global.CalendarApp.getCalendarById).not.toHaveBeenCalled();
        expect(global.Logger.log).toHaveBeenCalledWith('登録するアクティビティがありませんでした。');
    });
});

