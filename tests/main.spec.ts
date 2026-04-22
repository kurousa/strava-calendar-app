import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendErrorEmail } from '../main';

describe('main', () => {
    const mockUserProps = {
        getProperty: vi.fn(),
        setProperty: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
        global.PropertiesService.getUserProperties.mockReturnValue(mockUserProps);
        global.Session.getEffectiveUser.mockReturnValue({
            getEmail: vi.fn(() => 'test@example.com')
        });
    });

    it('should send error email when not notified recently', () => {
        mockUserProps.getProperty.mockReturnValue(null);

        sendErrorEmail('Something failed');

        expect(global.MailApp.sendEmail).toHaveBeenCalledWith(
            'test@example.com',
            expect.stringContaining('連携でエラーが発生しました'),
            expect.stringContaining('Something failed')
        );
        expect(mockUserProps.setProperty).toHaveBeenCalledWith('LAST_ERROR_NOTIFIED_AT', expect.any(String));
        expect(global.Logger.log).toHaveBeenCalledWith(expect.stringContaining('エラーメールを送信しました'));
    });

    it('should NOT send error email when notified within 24 hours', () => {
        const justNow = new Date().getTime().toString();
        mockUserProps.getProperty.mockReturnValue(justNow);

        sendErrorEmail('Another error');

        expect(global.MailApp.sendEmail).not.toHaveBeenCalled();
    });

    it('should send email when last notification was more than 24 hours ago', () => {
        const alongTimeAgo = (new Date().getTime() - 25 * 60 * 60 * 1000).toString();
        mockUserProps.getProperty.mockReturnValue(alongTimeAgo);

        sendErrorEmail('Delayed error');

        expect(global.MailApp.sendEmail).toHaveBeenCalled();
        expect(mockUserProps.setProperty).toHaveBeenCalled();
    });

    it('should skip email when user email is not available', () => {
        global.Session.getEffectiveUser.mockReturnValue({
            getEmail: vi.fn(() => null)
        });

        sendErrorEmail('Error without email');

        expect(global.MailApp.sendEmail).not.toHaveBeenCalled();
        expect(global.Logger.log).toHaveBeenCalledWith(expect.stringContaining('スキップしました'));
    });

});

describe('getTargetCalendar', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.resetModules();
    });

    it('should return specific calendar when CALENDAR_ID is set and valid', async () => {
        global.PropertiesService.getScriptProperties.mockReturnValueOnce({
            getProperty: vi.fn().mockReturnValue('custom_calendar_id')
        });
        const mockCalendar = { id: 'custom_calendar_id' };
        global.CalendarApp.getCalendarById.mockReturnValueOnce(mockCalendar);

        const { getTargetCalendar } = await import('../main.ts');
        const result = getTargetCalendar();

        expect(global.CalendarApp.getCalendarById).toHaveBeenCalledWith('custom_calendar_id');
        expect(result).toBe(mockCalendar);
    });

    it('should log error and return null when CALENDAR_ID is invalid', async () => {
        global.PropertiesService.getScriptProperties.mockReturnValueOnce({
            getProperty: vi.fn().mockReturnValue('invalid_id')
        });
        global.CalendarApp.getCalendarById.mockReturnValueOnce(null);

        const { getTargetCalendar } = await import('../main.ts');
        const result = getTargetCalendar();

        expect(global.CalendarApp.getCalendarById).toHaveBeenCalledWith('invalid_id');
        expect(global.Logger.log).toHaveBeenCalledWith('エラー: 指定されたカレンダーが見つかりません。');
        expect(result).toBeNull();
    });

    it('should return default calendar when CALENDAR_ID is not set', async () => {
        global.PropertiesService.getScriptProperties.mockReturnValueOnce({
            getProperty: vi.fn(() => null)
        });
        const mockDefaultCalendar = { id: 'default_id' };
        global.CalendarApp.getDefaultCalendar.mockReturnValueOnce(mockDefaultCalendar);

        const { getTargetCalendar } = await import('../main.ts');
        const result = getTargetCalendar();

        expect(global.CalendarApp.getDefaultCalendar).toHaveBeenCalled();
        expect(global.CalendarApp.getCalendarById).not.toHaveBeenCalled();
        expect(result).toBe(mockDefaultCalendar);
    });
});
describe('processActivityToCalendar', () => {
    let mockCalendar: any;
    let mockEvent: any;

    beforeEach(() => {
        vi.resetAllMocks();
        vi.resetModules();

        mockEvent = {
            getId: vi.fn().mockReturnValue('event_id@google.com'),
            getDescription: vi.fn(),
            setColor: vi.fn(),
        };

        mockCalendar = {
            getId: vi.fn().mockReturnValue('calendar_id'),
            getEvents: vi.fn().mockReturnValue([]),
            createEvent: vi.fn().mockReturnValue(mockEvent)
        };

        global.Utilities.sleep = vi.fn();
        global.Logger.log = vi.fn();
    });

    it('should skip creation if activity is already registered and skipDuplicateCheck is false', async () => {
        mockEvent.getDescription.mockReturnValue('Some description with strava.com/activities/12345 inside');
        mockCalendar.getEvents.mockReturnValue([mockEvent]);

        const { processActivityToCalendar } = await import('../main.ts');
        const activity = {
            id: 12345,
            start_date: '2023-01-01T10:00:00Z',
            elapsed_time: 3600
        };

        const result = processActivityToCalendar(activity, mockCalendar);

        expect(mockCalendar.getEvents).toHaveBeenCalled();
        expect(mockCalendar.createEvent).not.toHaveBeenCalled();
        expect(result).toBe('skipped');
        expect(global.Logger.log).toHaveBeenCalledWith(expect.stringContaining('スキップ: 既に登録済みのアクティビティです'));
    });

    it('should create event with distance in title if type is in distanceActivities and distance > 0', async () => {
        const { processActivityToCalendar, DISTANCE_ACTIVITIES, CALENDAR_API_DELAY_MS } = await import('../main.ts');

        const activity = {
            id: 12345,
            start_date: '2023-01-01T10:00:00Z',
            elapsed_time: 3600,
            type: 'Run', // In DISTANCE_ACTIVITIES
            name: 'Morning Run',
            distance: 5200 // 5.2 km
        };

        const result = processActivityToCalendar(activity, mockCalendar, DISTANCE_ACTIVITIES, false);

        expect(mockCalendar.getEvents).toHaveBeenCalled();
        expect(mockCalendar.createEvent).toHaveBeenCalledWith(
            '[🏃 Run] Morning Run - 5.2km',
            expect.any(Date),
            expect.any(Date),
            expect.any(Object)
        );
        expect(global.Utilities.sleep).toHaveBeenCalledWith(CALENDAR_API_DELAY_MS);
        expect(result).toBe('success');
    });

    it('should call Calendar.Events.patch when mapUrl is present and file is found', async () => {
        const { processActivityToCalendar, DISTANCE_ACTIVITIES } = await import('../main.ts');

        const activity = {
            id: 12345,
            start_date: '2023-01-01T10:00:00Z',
            elapsed_time: 3600,
            type: 'Run',
            name: 'Morning Run',
            distance: 5200,
            mapUrl: 'https://maps.google.com/map'
        };

        const mockFile = {
            getUrl: vi.fn().mockReturnValue('https://maps.google.com/map'),
            getName: vi.fn().mockReturnValue('strava_map_12345.png'),
            getMimeType: vi.fn().mockReturnValue('image/png')
        };

        const mockFiles = {
            hasNext: vi.fn().mockReturnValue(true),
            next: vi.fn().mockReturnValue(mockFile)
        };

        const mockFolder = {
            getFilesByName: vi.fn().mockReturnValue(mockFiles)
        };

        vi.stubGlobal('saveMapToDrive', vi.fn().mockReturnValue({}));
        vi.stubGlobal('getOrCreateMapFolder', vi.fn().mockReturnValue(mockFolder));

        const result = processActivityToCalendar(activity, mockCalendar, DISTANCE_ACTIVITIES, true);

        expect(global.Calendar.Events.patch).toHaveBeenCalledWith(
            {
                attachments: [{
                    fileUrl: 'https://maps.google.com/map',
                    title: 'strava_map_12345.png',
                    mimeType: 'image/png'
                }]
            },
            'calendar_id',
            'event_id',
            { supportsAttachments: true }
        );
        expect(result).toBe('success');
    });

    it('should create event without distance in title if distance is 0', async () => {
        const { processActivityToCalendar, DISTANCE_ACTIVITIES } = await import('../main.ts');

        const activity = {
            id: 12345,
            start_date: '2023-01-01T10:00:00Z',
            elapsed_time: 3600,
            type: 'Run',
            name: 'Treadmill Run',
            distance: 0
        };

        const result = processActivityToCalendar(activity, mockCalendar, DISTANCE_ACTIVITIES, false);

        expect(mockCalendar.createEvent).toHaveBeenCalledWith(
            '[🏃 Run] Treadmill Run',
            expect.any(Date),
            expect.any(Date),
            expect.any(Object)
        );
        expect(result).toBe('success');
    });

    it('should create event without distance in title if type is not in distanceActivities', async () => {
        const { processActivityToCalendar, DISTANCE_ACTIVITIES } = await import('../main.ts');

        const activity = {
            id: 12345,
            start_date: '2023-01-01T10:00:00Z',
            elapsed_time: 3600,
            type: 'Yoga', // Not in DISTANCE_ACTIVITIES
            name: 'Morning Yoga',
            distance: 5000 // Even if distance is provided
        };

        const result = processActivityToCalendar(activity, mockCalendar, DISTANCE_ACTIVITIES, false);

        expect(mockCalendar.createEvent).toHaveBeenCalledWith(
            '[🧘 Yoga] Morning Yoga',
            expect.any(Date),
            expect.any(Date),
            expect.any(Object)
        );
        expect(result).toBe('success');
    });

    it('should bypass duplicate check if skipDuplicateCheck is true', async () => {
        const { processActivityToCalendar, DISTANCE_ACTIVITIES } = await import('../main.ts');

        const activity = {
            id: 12345,
            start_date: '2023-01-01T10:00:00Z',
            elapsed_time: 3600,
            type: 'Run',
            name: 'Morning Run',
            distance: 5200
        };

        const result = processActivityToCalendar(activity, mockCalendar, DISTANCE_ACTIVITIES, true);

        expect(mockCalendar.getEvents).not.toHaveBeenCalled();
        expect(mockCalendar.createEvent).toHaveBeenCalled();
        expect(result).toBe('success');
    });

    it('should use Advanced Calendar Service for getExistingActivityIds if available', async () => {
        const { getExistingActivityIds } = await import('../main.ts');

        // Setup mock for Advanced Service
        // Setup mock for Advanced Service
        (global as any).Calendar.Events.list.mockReturnValueOnce({
            items: [
                { extendedProperties: { private: { stravaActivityId: '201' } } },
                { description: 'Link: https://www.strava.com/activities/202' }, // fallback for older event
                { description: 'Regular meeting' } // ignored
            ]
        });

        const ids = getExistingActivityIds(mockCalendar, new Date('2024-01-01'), new Date('2024-01-31'));

        expect((global as any).Calendar.Events.list).toHaveBeenCalled();
        expect(ids.has('201')).toBe(true);
        expect(ids.has('202')).toBe(true);
        expect(ids.size).toBe(2);

        // Fallback CalendarApp shouldn't be called
        expect(mockCalendar.getEvents).not.toHaveBeenCalled();
    });
});

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
            { getDescription: () => 'Link: https://www.strava.com/activities/101', getTag: () => null }
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

