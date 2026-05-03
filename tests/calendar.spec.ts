import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
    getTargetCalendar, 
    getExistingActivityIds, 
    processActivityToCalendar, 
    generateEventTitle_,
    enrichActivityData_
} from '../calendar';
import { Config } from '../const';

describe('calendar', () => {
    let mockCalendar: any;
    let mockEvent: any;

    beforeEach(() => {
        vi.resetAllMocks();
        
        mockEvent = {
            getId: vi.fn().mockReturnValue('event_id@google.com'),
            getDescription: vi.fn(),
            setDescription: vi.fn().mockReturnThis(),
            setColor: vi.fn().mockReturnThis(),
            setTag: vi.fn().mockReturnThis(),
            getTag: vi.fn(),
        };

        mockCalendar = {
            getId: vi.fn().mockReturnValue('calendar_id'),
            getName: vi.fn().mockReturnValue('Test Calendar'),
            getEvents: vi.fn().mockReturnValue([]),
            createEvent: vi.fn().mockReturnValue(mockEvent)
        };

        // GAS globals
        vi.mocked(global.CalendarApp.getCalendarById).mockReturnValue(mockCalendar);
        vi.mocked(global.CalendarApp.getDefaultCalendar).mockReturnValue(mockCalendar);
        vi.mocked(global.PropertiesService.getScriptProperties().getProperty).mockReturnValue(null);
        global.Logger.log = vi.fn();
        global.Utilities.sleep = vi.fn();
    });

    describe('getTargetCalendar', () => {
        it('should return specific calendar when CALENDAR_ID is set and valid', () => {
            vi.mocked(global.PropertiesService.getScriptProperties().getProperty).mockReturnValue('custom_calendar_id');
            vi.mocked(global.CalendarApp.getCalendarById).mockReturnValue(mockCalendar);

            const result = getTargetCalendar();

            expect(global.CalendarApp.getCalendarById).toHaveBeenCalledWith('custom_calendar_id');
            expect(result).toBe(mockCalendar);
        });

        it('should log error and return null when CALENDAR_ID is invalid', () => {
            vi.mocked(global.PropertiesService.getScriptProperties().getProperty).mockReturnValue('invalid_id');
            vi.mocked(global.CalendarApp.getCalendarById).mockReturnValue(null);

            const result = getTargetCalendar();

            expect(global.CalendarApp.getCalendarById).toHaveBeenCalledWith('invalid_id');
            expect(global.Logger.log).toHaveBeenCalledWith(expect.stringContaining('見つかりません'));
            expect(result).toBeNull();
        });

        it('should return default calendar when CALENDAR_ID is not set', () => {
            vi.mocked(global.PropertiesService.getScriptProperties().getProperty).mockReturnValue(null);

            const result = getTargetCalendar();

            expect(global.CalendarApp.getDefaultCalendar).toHaveBeenCalled();
            expect(result).toBe(mockCalendar);
        });
    });

    describe('getExistingActivityIds', () => {
        const startDate = new Date('2023-01-01T00:00:00Z');
        const endDate = new Date('2023-01-02T00:00:00Z');

        it('should use Advanced Calendar Service when available', () => {
            const mockResponse = {
                items: [
                    { extendedProperties: { private: { [Config.STRAVA_TAG_KEY]: '123' } } },
                    { description: `${Config.STRAVA_SEARCH_QUERY}/456` }
                ],
                nextPageToken: null
            };
            vi.mocked((global as any).Calendar.Events.list).mockReturnValue(mockResponse);

            const result = getExistingActivityIds(mockCalendar, startDate, endDate);

            expect(result).toContain('123');
            expect(result).toContain('456');
            expect(global.Calendar.Events.list).toHaveBeenCalled();
        });

        it('should fallback to CalendarApp when Advanced Service fails', () => {
            vi.mocked((global as any).Calendar.Events.list).mockImplementation(() => { throw new Error('API Error'); });
            
            const mockEvents = [
                { getTag: vi.fn().mockReturnValue('789'), getDescription: vi.fn() },
                { getTag: vi.fn().mockReturnValue(null), getDescription: vi.fn().mockReturnValue(`${Config.STRAVA_SEARCH_QUERY}/012`) }
            ];
            mockCalendar.getEvents.mockReturnValue(mockEvents);

            const result = getExistingActivityIds(mockCalendar, startDate, endDate);

            expect(result).toContain('789');
            expect(result).toContain('012');
            expect(mockCalendar.getEvents).toHaveBeenCalled();
        });
    });

    describe('processActivityToCalendar', () => {
        const activity = {
            id: 12345,
            type: 'Run',
            name: 'Test Run',
            start_date: '2023-01-01T10:00:00Z',
            elapsed_time: 3600,
            distance: 5000
        };

        it('should skip if duplicate exists', () => {
            mockEvent.getDescription.mockReturnValue(`${Config.STRAVA_SEARCH_QUERY}/12345`);
            mockCalendar.getEvents.mockReturnValue([mockEvent]);

            const result = processActivityToCalendar(activity as any, mockCalendar);

            expect(result).toBe('skipped');
            expect(mockCalendar.createEvent).not.toHaveBeenCalled();
        });

        it('should create event and tag it', () => {
            const result = processActivityToCalendar(activity as any, mockCalendar);

            expect(result).toBe('success');
            expect(mockCalendar.createEvent).toHaveBeenCalled();
            expect(mockEvent.setTag).toHaveBeenCalledWith(Config.STRAVA_TAG_KEY, '12345');
        });

        it('should bypass duplicate check when skipDuplicateCheck is true', () => {
            const result = processActivityToCalendar(activity as any, mockCalendar, undefined, true);

            expect(result).toBe('success');
            expect(mockCalendar.getEvents).not.toHaveBeenCalled();
        });
    });

    describe('generateEventTitle_', () => {
        const distanceActivities = new Set(['Run', 'Ride']);

        it('should include distance for applicable types', () => {
            const activity = { type: 'Run', name: 'Lunch Run', distance: 10500 };
            const title = generateEventTitle_(activity as any, distanceActivities);
            expect(title).toBe('[🏃 Run] Lunch Run - 10.5km');
        });

        it('should not include distance for other types', () => {
            const activity = { type: 'Yoga', name: 'Morning Yoga', distance: 0 };
            const title = generateEventTitle_(activity as any, distanceActivities);
            expect(title).toBe('[🧘 Yoga] Morning Yoga');
        });
    });

    describe('enrichActivityData_', () => {
        it('should fetch weather if coordinates exist', () => {
            const activity: any = { start_latlng: [35.6, 139.7] };
            enrichActivityData_(activity, new Date());
            expect(vi.mocked(global.fetchWeatherData)).toHaveBeenCalled();
            expect(activity.weatherText).toBeDefined();
        });

        it('should generate AI comment', () => {
            const activity: any = {};
            vi.mocked(global.generateAiComment).mockReturnValue('ナイスラン！');
            enrichActivityData_(activity, new Date());
            expect(vi.mocked(global.generateAiComment)).toHaveBeenCalled();
            expect(activity.aiComment).toBe('ナイスラン！');
        });
    });
});
