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
describe('main function', () => {
    let main;

    beforeEach(async () => {
        vi.resetModules();
        vi.clearAllMocks();

        // Reset properties service
        global.PropertiesService.getScriptProperties.mockReturnValue({
            getProperty: vi.fn(() => 'default_id')
        });

        const module = await import('../main.js');
        main = module.main;

        // Mock getTargetCalendar internally by mocking the GAS service it uses
        global.CalendarApp.getCalendarById.mockReturnValue({
            getName: vi.fn(() => 'Test Calendar')
        });
    });

    it('should log and return if no activities are found', () => {
        global.getStravaActivities.mockReturnValueOnce([]);

        main();

        expect(global.getStravaActivities).toHaveBeenCalled();
        expect(global.Logger.log).toHaveBeenCalledWith('登録するアクティビティがありませんでした。');
        expect(global.CalendarApp.getCalendarById).not.toHaveBeenCalled();
    });

    it('should log and return if target calendar is not found', () => {
        global.getStravaActivities.mockReturnValueOnce([{ id: 123 }]);
        global.CalendarApp.getCalendarById.mockReturnValueOnce(null);

        main();

        expect(global.Logger.log).toHaveBeenCalledWith('カレンダーの取得に失敗しました。');
    });

    it('should process activities if found and calendar exists', () => {
        const activities = [{ id: 1, start_date: '2023-01-01T10:00:00Z', elapsed_time: 3600 }];
        global.getStravaActivities.mockReturnValueOnce(activities);

        const mockCalendar = {
            getName: vi.fn(() => 'Test Calendar'),
            getEvents: vi.fn(() => []), // No existing events
            createEvent: vi.fn(() => ({ setColor: vi.fn() }))
        };
        global.CalendarApp.getCalendarById.mockReturnValueOnce(mockCalendar);

        main();

        // Ensure processActivityToCalendar is called (implied by execution flow and logs)
        expect(global.Logger.log).toHaveBeenCalledWith(expect.stringContaining('取得できたアクティビティの数: 1'));
    });
});

describe('processActivityToCalendar', () => {
    let processActivityToCalendar;
    let mockCalendar;
    let mockEvent;

    beforeEach(async () => {
        vi.resetModules();
        vi.clearAllMocks();

        const module = await import('../main.js');
        processActivityToCalendar = module.processActivityToCalendar;

        mockEvent = {
            setColor: vi.fn()
        };

        mockCalendar = {
            getEvents: vi.fn(() => []),
            createEvent: vi.fn(() => mockEvent)
        };

        global.getActivityStyle.mockReturnValue({ color: 'BLUE' });
        global.makeDescription.mockReturnValue('Test Description');
    });

    it('should skip duplicate activity', () => {
        const activity = { id: 123, start_date: '2023-01-01T10:00:00Z', elapsed_time: 3600 };
        mockCalendar.getEvents.mockReturnValueOnce([{
            getDescription: vi.fn(() => 'strava.com/activities/123')
        }]);

        const result = processActivityToCalendar(activity, mockCalendar, new Set(['Run']));

        expect(result).toBe('skipped');
        expect(global.Logger.log).toHaveBeenCalledWith(expect.stringContaining('スキップ: 既に登録済みのアクティビティです'));
        expect(mockCalendar.createEvent).not.toHaveBeenCalled();
    });

    it('should create event for new distance activity', () => {
        const activity = {
            id: 123,
            type: 'Run',
            name: 'Morning Run',
            distance: 5200,
            start_date: '2023-01-01T10:00:00Z',
            elapsed_time: 3600
        };

        const result = processActivityToCalendar(activity, mockCalendar, new Set(['Run']));

        expect(result).toBe('success');
        expect(mockCalendar.createEvent).toHaveBeenCalledWith(
            '[Run] Morning Run - 5.2km',
            expect.any(Date),
            expect.any(Date),
            { description: 'Test Description' }
        );
        expect(mockEvent.setColor).toHaveBeenCalledWith('BLUE');
        expect(global.Utilities.sleep).toHaveBeenCalled();
    });

    it('should create event without distance for non-distance activity', () => {
        const activity = {
            id: 123,
            type: 'Yoga',
            name: 'Morning Yoga',
            distance: 0,
            start_date: '2023-01-01T10:00:00Z',
            elapsed_time: 3600
        };

        const result = processActivityToCalendar(activity, mockCalendar, new Set(['Run']));

        expect(result).toBe('success');
        expect(mockCalendar.createEvent).toHaveBeenCalledWith(
            '[Yoga] Morning Yoga',
            expect.any(Date),
            expect.any(Date),
            { description: 'Test Description' }
        );
    });
});
