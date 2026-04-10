import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendErrorEmail, doGet } from '../main';

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

describe('doGet', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.resetModules();
    });

    it('should create HTML output from index file and set title', () => {
        const mockSetTitle = vi.fn().mockReturnThis();
        global.HtmlService.createHtmlOutputFromFile.mockReturnValue({
            setTitle: mockSetTitle
        });

        const result = doGet();

        expect(global.HtmlService.createHtmlOutputFromFile).toHaveBeenCalledWith('index');
        expect(mockSetTitle).toHaveBeenCalledWith('Strava カレンダーインポート');
        expect(result).toBeDefined();
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

        const { getTargetCalendar } = await import('../main.js');
        const result = getTargetCalendar();

        expect(global.CalendarApp.getCalendarById).toHaveBeenCalledWith('custom_calendar_id');
        expect(result).toBe(mockCalendar);
    });

    it('should log error and return null when CALENDAR_ID is invalid', async () => {
        global.PropertiesService.getScriptProperties.mockReturnValueOnce({
            getProperty: vi.fn().mockReturnValue('invalid_id')
        });
        global.CalendarApp.getCalendarById.mockReturnValueOnce(null);

        const { getTargetCalendar } = await import('../main.js');
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

        const { getTargetCalendar } = await import('../main.js');
        const result = getTargetCalendar();

        expect(global.CalendarApp.getDefaultCalendar).toHaveBeenCalled();
        expect(global.CalendarApp.getCalendarById).not.toHaveBeenCalled();
        expect(result).toBe(mockDefaultCalendar);
    });
});
describe('processActivityToCalendar', () => {
    let mockCalendar;
    let mockEvent;

    beforeEach(() => {
        vi.resetAllMocks();
        vi.resetModules();

        mockEvent = {
            getDescription: vi.fn(),
            setColor: vi.fn(),
        };

        mockCalendar = {
            getEvents: vi.fn().mockReturnValue([]),
            createEvent: vi.fn().mockReturnValue(mockEvent)
        };

        global.Utilities.sleep = vi.fn();
        global.Logger.log = vi.fn();
    });

    it('should skip creation if activity is already registered and skipDuplicateCheck is false', async () => {
        mockEvent.getDescription.mockReturnValue('Some description with strava.com/activities/12345 inside');
        mockCalendar.getEvents.mockReturnValue([mockEvent]);

        const { processActivityToCalendar } = await import('../main.js');
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
        const { processActivityToCalendar, DISTANCE_ACTIVITIES, CALENDAR_API_DELAY_MS } = await import('../main.js');

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

    it('should create event without distance in title if distance is 0', async () => {
        const { processActivityToCalendar, DISTANCE_ACTIVITIES } = await import('../main.js');

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
        const { processActivityToCalendar, DISTANCE_ACTIVITIES } = await import('../main.js');

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
        const { processActivityToCalendar, DISTANCE_ACTIVITIES } = await import('../main.js');

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
});
