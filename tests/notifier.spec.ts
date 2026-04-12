import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendSyncNotification, resetCache } from '../notifier.ts';

describe('notifier', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        if (typeof resetCache === 'function') resetCache();
    });

    it('should skip notification if DISCORD_WEBHOOK_URL is not set', () => {
        const getPropertyMock = vi.mocked(global.PropertiesService.getScriptProperties().getProperty).mockReturnValue(null);

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

    it('should send notification to Discord with correct message (manual)', () => {
        vi.mocked(global.PropertiesService.getScriptProperties().getProperty).mockReturnValue('https://discord.com/api/webhooks/mock');
        vi.mocked(global.UrlFetchApp.fetch).mockReturnValue({
            getResponseCode: () => 204,
            getContentText: () => ''
        } as any);

        sendSyncNotification(3, 0, true);

        expect(global.UrlFetchApp.fetch).toHaveBeenCalledWith(
            'https://discord.com/api/webhooks/mock',
            expect.objectContaining({
                payload: JSON.stringify({
                    content: '✅ **Strava カレンダー手動インポート完了**\n新規登録: 3件 / スキップ: 0件'
                })
            })
        );
    });

    it('should log error if response code is not 200 or 204', () => {
        vi.mocked(global.PropertiesService.getScriptProperties().getProperty).mockReturnValue('https://discord.com/api/webhooks/mock');
        vi.mocked(global.UrlFetchApp.fetch).mockReturnValue({
            getResponseCode: () => 400,
            getContentText: () => 'Bad Request'
        } as any);

        sendSyncNotification(1, 0, false);

        expect(global.Logger.log).toHaveBeenCalledWith('[Notification Error] Bad Request');
    });

    it('should log exception if fetch fails', () => {
        vi.mocked(global.PropertiesService.getScriptProperties().getProperty).mockReturnValue('https://discord.com/api/webhooks/mock');
        vi.mocked(global.UrlFetchApp.fetch).mockImplementation(() => {
            throw new Error('Network Error');
        });

        sendSyncNotification(1, 0, false);

        expect(global.Logger.log).toHaveBeenCalledWith(expect.stringContaining('[Notification Exception] 通知の送信に失敗しました: Error: Network Error'));
    });
});
