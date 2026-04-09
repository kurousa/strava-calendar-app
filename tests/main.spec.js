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
    let mockEventColorSetter;

    beforeEach(() => {
        vi.clearAllMocks();

        global.Utilities = { sleep: vi.fn() };
        global.getActivityStyle = vi.fn().mockReturnValue({ color: 'BLUE' });
        global.makeDescription = vi.fn().mockReturnValue('mock description');

        mockEventColorSetter = vi.fn();
        mockCalendar = {
            getEvents: vi.fn().mockReturnValue([]),
            createEvent: vi.fn().mockReturnValue({ setColor: mockEventColorSetter }),
            getName: vi.fn().mockReturnValue('Mock Calendar')
        };
    });

    it('should skip activity if duplicate exists and skipDuplicateCheck is false', async () => {
        const { processActivityToCalendar } = await import('../main.js');
        const activity = {
            id: 12345,
            start_date: '2023-01-01T10:00:00Z',
            elapsed_time: 3600
        };

        // Mock getEvents to return an event with a description that matches this activity ID
        mockCalendar.getEvents.mockReturnValue([{
            getDescription: () => 'some description... https://www.strava.com/activities/12345'
        }]);

        const result = processActivityToCalendar(activity, mockCalendar, new Set(), false);

        expect(result).toBe('skipped');
        expect(mockCalendar.createEvent).not.toHaveBeenCalled();
    });

    it('should create activity if skipDuplicateCheck is true even if getEvents would return it', async () => {
        const { processActivityToCalendar } = await import('../main.js');
        const activity = {
            id: 12345,
            start_date: '2023-01-01T10:00:00Z',
            elapsed_time: 3600,
            type: 'Run',
            distance: 5000,
            name: 'Morning Run'
        };

        const result = processActivityToCalendar(activity, mockCalendar, new Set(), true);

        expect(result).toBe('success');
        expect(mockCalendar.getEvents).not.toHaveBeenCalled();
        expect(mockCalendar.createEvent).toHaveBeenCalled();
    });

    it('should create event with distance in title for distance-based activities', async () => {
        const { processActivityToCalendar } = await import('../main.js');
        const activity = {
            id: 12345,
            start_date: '2023-01-01T10:00:00Z',
            elapsed_time: 3600,
            type: 'Run',
            distance: 5200,
            name: 'Morning Jog'
        };

        const result = processActivityToCalendar(activity, mockCalendar, new Set(['Run']), false);

        expect(result).toBe('success');
        expect(mockCalendar.createEvent).toHaveBeenCalledWith(
            '[Run] Morning Jog - 5.2km',
            expect.any(Date),
            expect.any(Date),
            { description: 'mock description' }
        );
        expect(mockEventColorSetter).toHaveBeenCalledWith('BLUE');
        expect(global.Utilities.sleep).toHaveBeenCalledWith(200);
    });

    it('should create event without distance in title if distance is 0', async () => {
        const { processActivityToCalendar } = await import('../main.js');
        const activity = {
            id: 12345,
            start_date: '2023-01-01T10:00:00Z',
            elapsed_time: 3600,
            type: 'Run',
            distance: 0,
            name: 'Treadmill'
        };

        const result = processActivityToCalendar(activity, mockCalendar, new Set(['Run']), false);

        expect(result).toBe('success');
        expect(mockCalendar.createEvent).toHaveBeenCalledWith(
            '[Run] Treadmill',
            expect.any(Date),
            expect.any(Date),
            { description: 'mock description' }
        );
    });

    it('should create event without distance in title for non-distance activities', async () => {
        const { processActivityToCalendar } = await import('../main.js');
        const activity = {
            id: 12345,
            start_date: '2023-01-01T10:00:00Z',
            elapsed_time: 3600,
            type: 'Yoga',
            distance: 100, // Should ignore distance for Yoga
            name: 'Morning Stretch'
        };

        const result = processActivityToCalendar(activity, mockCalendar, new Set(['Run', 'Ride']), false);

        expect(result).toBe('success');
        expect(mockCalendar.createEvent).toHaveBeenCalledWith(
            '[Yoga] Morning Stretch',
            expect.any(Date),
            expect.any(Date),
            { description: 'mock description' }
        );
    });
});
