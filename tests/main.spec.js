import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendErrorEmail } from '../main';

describe('main', () => {
    const mockUserProps = {
        getProperty: vi.fn(),
        setProperty: vi.fn()
    };

    beforeEach(() => {
        vi.resetAllMocks();
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
