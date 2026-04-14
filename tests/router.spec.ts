import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { doGet, doPost } from '../router';
import { importPastActivitiesFromWeb } from '../manual_import';

describe('router', () => {

    describe('doGet', () => {
        beforeEach(() => {
            vi.resetAllMocks();
        });

        it('should create HTML output from index file and set title', () => {
            const mockSetTitle = vi.fn().mockReturnThis();
            global.HtmlService.createHtmlOutputFromFile.mockReturnValue({
                setTitle: mockSetTitle
            });

            const result = doGet({} as any);

            expect(global.HtmlService.createHtmlOutputFromFile).toHaveBeenCalledWith('index');
            expect(mockSetTitle).toHaveBeenCalledWith('Strava カレンダーインポート');
            expect(result).toBeDefined();
        });
    });

    describe('doPost', () => {
        beforeEach(() => {
            vi.resetAllMocks();
        });

        it('should return OK text output', () => {
            const e = {
                postData: {
                    contents: JSON.stringify({
                        aspect_type: 'create',
                        object_type: 'activity',
                        object_id: 12345
                    })
                }
            };
            vi.stubGlobal('handleStravaWebhook', vi.fn());
            const result = doPost(e as any);

            expect(global.ContentService.createTextOutput).toHaveBeenCalledWith(JSON.stringify({ status: 'ok' }));
            expect(result.getContent()).toBe(JSON.stringify({ status: 'ok' }));
        });
    });

    describe('importPastActivitiesFromWeb', () => {
        beforeEach(() => {
            vi.resetAllMocks();
            vi.stubGlobal('Logger', { log: vi.fn() });
            vi.stubGlobal('importPastActivities', vi.fn());
        });



        it('should reject invalid date formats', () => {
            const result1 = importPastActivitiesFromWeb('2024/01/01', '2024-01-31');
            const result2 = importPastActivitiesFromWeb('2024-01-01', '2024/01/31');
            const result3 = importPastActivitiesFromWeb('abcdef', '123456');
            const result4 = importPastActivitiesFromWeb('', '2024-01-31');

            const expectedError = 'エラー: 日付の形式が正しくありません (YYYY-MM-DD)。';
            expect(result1).toBe(expectedError);
            expect(result2).toBe(expectedError);
            expect(result3).toBe(expectedError);
            expect(result4).toBe(expectedError);
            expect(global.Logger.log).toHaveBeenCalledWith(expectedError);
        });

        it('should reject invalid dates', () => {
            const result = importPastActivitiesFromWeb('2024-13-45', '2024-01-31');
            expect(result).toBe('エラー: 無効な日付が指定されました。');
            expect(global.Logger.log).toHaveBeenCalledWith('エラー: 無効な日付が指定されました。');
        });

        it('should reject invalid dates with rollover', () => {
            const result1 = importPastActivitiesFromWeb('2024-02-31', '2024-03-31');
            expect(result1).toBe('エラー: 無効な日付が指定されました。');

            const result2 = importPastActivitiesFromWeb('2024-11-31', '2024-12-01');
            expect(result2).toBe('エラー: 無効な日付が指定されました。');
        });

        it('should reject date ranges where start is after end', () => {
            const result = importPastActivitiesFromWeb('2024-01-31', '2024-01-01');
            expect(result).toBe('エラー: 開始日は終了日より前の日付を指定してください。');
            expect(global.Logger.log).toHaveBeenCalledWith('エラー: 開始日は終了日より前の日付を指定してください。');
        });

        it('should correctly parse dates and pass them to importPastActivities', () => {
            global.importPastActivities.mockReturnValue('SUCCESS_MOCK');

            const startStr = '2024-03-01';
            const endStr = '2024-03-31';

            const result = importPastActivitiesFromWeb(startStr, endStr);

            expect(result).toBe('SUCCESS_MOCK');

            // Check that importPastActivities was called with correctly parsed dates
            expect(global.importPastActivities).toHaveBeenCalledTimes(1);
            const callArgs = global.importPastActivities.mock.calls[0];

            expect(callArgs[0]).toBeInstanceOf(Date);
            const expectedStart = new Date('2024-03-01T00:00:00');
            const expectedEnd = new Date('2024-03-31T23:59:59');

            expect(callArgs[0].getTime()).toBe(expectedStart.getTime());
            expect(callArgs[1]).toBeInstanceOf(Date);
            expect(callArgs[1].getTime()).toBe(expectedEnd.getTime());
        });

        it('should return error if importPastActivities is not defined', () => {
            vi.stubGlobal('importPastActivities', undefined);
            const result = importPastActivitiesFromWeb('2024-03-01', '2024-03-31');
            expect(result).toBe('エラー: インポート関数が見つかりません');
        });
    });
});
