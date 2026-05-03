import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendSyncNotification, sendErrorEmail, resetCache } from '../notifier.ts';

describe('notifier', () => {
    const mockUserProps = {
        getProperty: vi.fn(),
        setProperty: vi.fn()
    };

    beforeEach(() => {
        vi.stubGlobal('sendErrorEmail', vi.fn()); // Fallback for modules calling it globally
        vi.clearAllMocks();
        if (typeof resetCache === 'function') resetCache();
        
        vi.mocked(global.PropertiesService.getUserProperties).mockReturnValue(mockUserProps);
        vi.mocked(global.Session.getEffectiveUser).mockReturnValue({
            getEmail: vi.fn(() => 'test@example.com')
        } as any);
    });

    describe('sendSyncNotification', () => {
        it('should skip notification if DISCORD_WEBHOOK_URL is not set', () => {
            vi.mocked(global.PropertiesService.getScriptProperties().getProperty).mockReturnValue(null);

            sendSyncNotification(1, 1, false);

            expect(global.Logger.log).toHaveBeenCalledWith('DISCORD_WEBHOOK_URL が設定されていないため、通知をスキップします。');
            expect(global.UrlFetchApp.fetch).not.toHaveBeenCalled();
        });

        it('should not notify if both counts are 0', () => {
            vi.mocked(global.PropertiesService.getScriptProperties().getProperty).mockReturnValue('https://discord.com/api/webhooks/mock');

            sendSyncNotification(0, 0, false);

            expect(global.UrlFetchApp.fetch).not.toHaveBeenCalled();
        });

        it('should send notification to Discord with correct message (periodic)', () => {
            vi.mocked(global.PropertiesService.getScriptProperties().getProperty).mockReturnValue('https://discord.com/api/webhooks/mock');
            vi.mocked(global.UrlFetchApp.fetch).mockReturnValue({
                getResponseCode: () => 204,
                getContentText: () => ''
            } as any);

            sendSyncNotification(5, 2, false);

            expect(global.UrlFetchApp.fetch).toHaveBeenCalledWith(
                'https://discord.com/api/webhooks/mock',
                expect.objectContaining({
                    method: 'post',
                    contentType: 'application/json',
                    payload: JSON.stringify({
                        content: '✅ **Strava カレンダー定期同期完了**\n新規登録: 5件 / スキップ: 2件'
                    })
                })
            );
            expect(global.Logger.log).toHaveBeenCalledWith('Discordへの通知が完了しました。');
        });
    });

    describe('sendErrorEmail', () => {
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
});

