import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { doGet, doPost } from '../router';
import { verifyGoogleToken, resetConfigCache } from '../auth';
import { importPastActivitiesFromWeb } from '../manual_import';

describe('router', () => {

    describe('verifyGoogleToken', () => {
        beforeEach(() => {
            vi.resetAllMocks();
            vi.stubGlobal('Logger', { log: vi.fn() });
            resetConfigCache();
        });

        it('should return true for valid token and allowed email', () => {
            const mockProps = {
                getProperty: vi.fn((key) => {
                    if (key === 'GOOGLE_CLIENT_ID') return 'valid_client_id';
                    if (key === 'ALLOWED_EMAILS') return 'test@example.com';
                    return null;
                })
            };
            vi.stubGlobal('PropertiesService', {
                ...(global as any).PropertiesService,
                getScriptProperties: vi.fn().mockReturnValue(mockProps)
            });

            vi.stubGlobal('UrlFetchApp', {
                ...(global as any).UrlFetchApp,
                fetch: vi.fn().mockReturnValue({
                    getContentText: () => JSON.stringify({
                        aud: 'valid_client_id',
                        email: 'test@example.com'
                    })
                })
            });

            const result = verifyGoogleToken('valid_header.valid_payload.valid_signature');
            expect(result).toBe(true);
        });

        it('should return true if email matches one of multiple allowed emails', () => {
            const mockProps = {
                getProperty: vi.fn((key) => {
                    if (key === 'GOOGLE_CLIENT_ID') return 'valid_client_id';
                    if (key === 'ALLOWED_EMAILS') return 'other@example.com, test@example.com, user@example.com';
                    return null;
                })
            };
            vi.stubGlobal('PropertiesService', {
                ...(global as any).PropertiesService,
                getScriptProperties: vi.fn().mockReturnValue(mockProps)
            });

            vi.stubGlobal('UrlFetchApp', {
                ...(global as any).UrlFetchApp,
                fetch: vi.fn().mockReturnValue({
                    getContentText: () => JSON.stringify({
                        aud: 'valid_client_id',
                        email: 'test@example.com'
                    })
                })
            });

            const result = verifyGoogleToken('valid_header.valid_payload.valid_signature');
            expect(result).toBe(true);
        });

        it('should return false if token is empty', () => {
            expect(verifyGoogleToken('')).toBe(false);
        });

        it('should return false if aud mismatch', () => {
            const mockProps = {
                getProperty: vi.fn((key) => {
                    if (key === 'GOOGLE_CLIENT_ID') return 'valid_client_id';
                    return null;
                })
            };
            vi.stubGlobal('PropertiesService', {
                ...(global as any).PropertiesService,
                getScriptProperties: vi.fn().mockReturnValue(mockProps)
            });

            vi.stubGlobal('UrlFetchApp', {
                ...(global as any).UrlFetchApp,
                fetch: vi.fn().mockReturnValue({
                    getContentText: () => JSON.stringify({
                        aud: 'wrong_client_id',
                        email: 'test@example.com'
                    })
                })
            });

            const result = verifyGoogleToken('test_header.test_payload.test_signature');
            expect(result).toBe(false);
            expect((global as any).Logger.log).toHaveBeenCalledWith(expect.stringContaining('aud が一致しません'));
        });

        it('should return false if email is not allowed', () => {
            const mockProps = {
                getProperty: vi.fn((key) => {
                    if (key === 'GOOGLE_CLIENT_ID') return 'valid_client_id';
                    if (key === 'ALLOWED_EMAILS') return 'allowed@example.com';
                    return null;
                })
            };
            vi.stubGlobal('PropertiesService', {
                ...(global as any).PropertiesService,
                getScriptProperties: vi.fn().mockReturnValue(mockProps)
            });

            vi.stubGlobal('UrlFetchApp', {
                ...(global as any).UrlFetchApp,
                fetch: vi.fn().mockReturnValue({
                    getContentText: () => JSON.stringify({
                        aud: 'valid_client_id',
                        email: 'intruder@example.com'
                    })
                })
            });

            const result = verifyGoogleToken('test_header.test_payload.test_signature');
            expect(result).toBe(false);
            expect((global as any).Logger.log).toHaveBeenCalledWith(expect.stringContaining('許可されていないユーザーによるアクセスです'));
        });

        it('should return false if UrlFetchApp fails', () => {
            vi.stubGlobal('UrlFetchApp', {
                ...(global as any).UrlFetchApp,
                fetch: vi.fn().mockImplementation(() => {
                    throw new Error('Network error');
                })
            });

            const result = verifyGoogleToken('bad_header.bad_payload.bad_signature');
            expect(result).toBe(false);
            expect((global as any).Logger.log).toHaveBeenCalledWith(expect.stringContaining('IDトークンの検証に失敗しました'));
        });
    });

    describe('doGet', () => {
        beforeEach(() => {
            vi.resetAllMocks();
            resetConfigCache();
        });

        it('should create HTML output from index file and set title', () => {
            const mockSetTitle = vi.fn().mockReturnThis();
            vi.stubGlobal('HtmlService', {
                ...(global as any).HtmlService,
                createHtmlOutputFromFile: vi.fn().mockReturnValue({
                    setTitle: mockSetTitle
                })
            });

            const result = doGet({} as unknown as GoogleAppsScript.Events.DoGet);

            expect(HtmlService.createHtmlOutputFromFile).toHaveBeenCalledWith('index');
            expect(mockSetTitle).toHaveBeenCalledWith('Strava カレンダーインポート');
            expect(result).toBeDefined();
        });

        it('should handle Strava Webhook validation request', () => {
            const mockProps = {
                getProperty: vi.fn().mockReturnValue('fake_token')
            };
            vi.stubGlobal('PropertiesService', {
                ...(global as any).PropertiesService,
                getScriptProperties: vi.fn().mockReturnValue(mockProps)
            });

            const e = {
                parameter: {
                    'hub.mode': 'subscribe',
                    'hub.verify_token': 'fake_token',
                    'hub.challenge': 'test_challenge'
                }
            };
            const result = doGet(e as unknown as GoogleAppsScript.Events.DoGet);

            expect(ContentService.createTextOutput).toHaveBeenCalledWith(
                JSON.stringify({ "hub.challenge": "test_challenge" })
            );
            expect(result.getContent()).toBe(JSON.stringify({ "hub.challenge": "test_challenge" }));
        });

        it('should return 403 for invalid verify token', () => {
            const mockProps = {
                getProperty: vi.fn().mockReturnValue('fake_token')
            };
            vi.stubGlobal('PropertiesService', {
                ...(global as any).PropertiesService,
                getScriptProperties: vi.fn().mockReturnValue(mockProps)
            });
            vi.stubGlobal('Logger', { log: vi.fn() });

            const e = {
                parameter: {
                    'hub.mode': 'subscribe',
                    'hub.verify_token': 'wrong_token'
                }
            };
            doGet(e as unknown as GoogleAppsScript.Events.DoGet);

            expect(HtmlService.createHtmlOutput).toHaveBeenCalledWith('Forbidden: Invalid Verify Token');
            expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('Webhook検証トークンが一致しません'));
        });

        it('should handle headless API getStats action with valid ID Token', () => {
            const mockData = { some: 'stats' };
            vi.stubGlobal('getDashboardData', vi.fn().mockReturnValue(mockData));
            
            // PropertiesService のモック
            const mockProps = {
                getProperty: vi.fn((key) => {
                    if (key === 'GOOGLE_CLIENT_ID') return 'valid_client_id';
                    if (key === 'ALLOWED_EMAILS') return 'test@example.com';
                    return null;
                })
            };
            vi.stubGlobal('PropertiesService', {
                ...(global as any).PropertiesService,
                getScriptProperties: vi.fn().mockReturnValue(mockProps)
            });

            // UrlFetchApp.fetch のモック
            vi.stubGlobal('UrlFetchApp', {
                ...(global as any).UrlFetchApp,
                fetch: vi.fn().mockReturnValue({
                    getContentText: () => JSON.stringify({
                        aud: 'valid_client_id',
                        email: 'test@example.com'
                    })
                })
            });

            const e = {
                parameter: {
                    action: 'getStats',
                    token: 'valid_header.valid_payload.valid_signature'
                }
            };
            const result = doGet(e as unknown as GoogleAppsScript.Events.DoGet);

            expect(result.getContent()).toContain('"status":"success"');
            expect(result.getContent()).toContain('"code":200');
            expect(UrlFetchApp.fetch).toHaveBeenCalledWith(expect.stringContaining('id_token=valid_header.valid_payload.valid_signature'));
        });

        it('should return error for getStats action with invalid ID Token (aud mismatch)', () => {
            const mockProps = {
                getProperty: vi.fn((key) => {
                    if (key === 'GOOGLE_CLIENT_ID') return 'valid_client_id';
                    return null;
                })
            };
            vi.stubGlobal('PropertiesService', {
                ...(global as any).PropertiesService,
                getScriptProperties: vi.fn().mockReturnValue(mockProps)
            });
            vi.stubGlobal('UrlFetchApp', {
                ...(global as any).UrlFetchApp,
                fetch: vi.fn().mockReturnValue({
                    getContentText: () => JSON.stringify({
                        aud: 'wrong_client_id',
                        email: 'test@example.com'
                    })
                })
            });
            vi.stubGlobal('Logger', { log: vi.fn() });

            const e = {
                parameter: {
                    action: 'getStats',
                    token: 'invalid_header.invalid_payload.invalid_signature'
                }
            };
            const result = doGet(e as unknown as GoogleAppsScript.Events.DoGet);

            expect(result.getContent()).toContain('"status":"error"');
            expect(result.getContent()).toContain('"code":401');
            expect(result.getContent()).toContain('Unauthorized: Invalid Token');
            expect((global as any).Logger.log).toHaveBeenCalledWith(expect.stringContaining('IDトークンの aud が一致しません'));
        });

        it('should return error for getStats action with forbidden email', () => {
            const mockProps = {
                getProperty: vi.fn((key) => {
                    if (key === 'GOOGLE_CLIENT_ID') return 'valid_client_id';
                    if (key === 'ALLOWED_EMAILS') return 'allowed@example.com';
                    return null;
                })
            };
            vi.stubGlobal('PropertiesService', {
                ...(global as any).PropertiesService,
                getScriptProperties: vi.fn().mockReturnValue(mockProps)
            });
            vi.stubGlobal('UrlFetchApp', {
                ...(global as any).UrlFetchApp,
                fetch: vi.fn().mockReturnValue({
                    getContentText: () => JSON.stringify({
                        aud: 'valid_client_id',
                        email: 'intruder@example.com'
                    })
                })
            });
            vi.stubGlobal('Logger', { log: vi.fn() });

            const e = {
                parameter: {
                    action: 'getStats',
                    token: 'some_header.some_payload.some_signature'
                }
            };
            const result = doGet(e as unknown as GoogleAppsScript.Events.DoGet);

            expect(result.getContent()).toContain('"status":"error"');
            expect(result.getContent()).toContain('"code":401');
            expect((global as any).Logger.log).toHaveBeenCalledWith(expect.stringContaining('許可されていないユーザーによるアクセスです'));
        });

        it('should return internal server error when getDashboardData fails', () => {
            vi.stubGlobal('getDashboardData', vi.fn().mockImplementation(() => {
                throw new Error('Database failure');
            }));

            // PropertiesService and UrlFetchApp mocks to pass authentication
            const mockProps = {
                getProperty: vi.fn((key) => {
                    if (key === 'GOOGLE_CLIENT_ID') return 'valid_client_id';
                    if (key === 'ALLOWED_EMAILS') return 'test@example.com';
                    return null;
                })
            };
            vi.stubGlobal('PropertiesService', {
                ...(global as any).PropertiesService,
                getScriptProperties: vi.fn().mockReturnValue(mockProps)
            });
            vi.stubGlobal('UrlFetchApp', {
                ...(global as any).UrlFetchApp,
                fetch: vi.fn().mockReturnValue({
                    getContentText: () => JSON.stringify({
                        aud: 'valid_client_id',
                        email: 'test@example.com'
                    })
                })
            });
            vi.stubGlobal('Logger', { log: vi.fn() });

            const e = {
                parameter: {
                    action: 'getStats',
                    token: 'valid_token'
                }
            };
            const result = doGet(e as unknown as GoogleAppsScript.Events.DoGet);

            expect(result.getContent()).toContain('"status":"error"');
            expect(result.getContent()).toContain('"message":"Internal Server Error"');
            expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('[Dashboard Error] Error: Database failure'));
        });

        it('should return error if getStats action is called without token', () => {
            vi.stubGlobal('Logger', { log: vi.fn() });

            const e = {
                parameter: {
                    action: 'getStats'
                }
            };
            const result = doGet(e as unknown as GoogleAppsScript.Events.DoGet);

            expect(result.getContent()).toContain('"status":"error"');
            expect(result.getContent()).toContain('"code":401');
            expect(result.getContent()).toContain('Unauthorized: Invalid Token');
        });
    });

    describe('doPost', () => {
        beforeEach(() => {
            vi.resetAllMocks();
            resetConfigCache();
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
            const result = doPost(e as unknown as GoogleAppsScript.Events.DoPost);

            expect(ContentService.createTextOutput).toHaveBeenCalledWith(JSON.stringify({ status: 'ok' }));
            expect(result.getContent()).toBe(JSON.stringify({ status: 'ok' }));
        });

        it('should handle errors in doPost and return generic message', () => {
            const e = {
                postData: {
                    contents: 'invalid json'
                }
            };
            vi.stubGlobal('Logger', { log: vi.fn() });
            const result = doPost(e as unknown as GoogleAppsScript.Events.DoPost);

            expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('[Webhook Error]'));
            expect(result.getContent()).toContain('"status":"error"');
            expect(result.getContent()).toContain('"message":"Internal Server Error"');
        });
    });

    describe('importPastActivitiesFromWeb', () => {
        beforeEach(() => {
            vi.resetAllMocks();
            vi.stubGlobal('Logger', { log: vi.fn() });
            vi.stubGlobal('importPastActivities', vi.fn());
            resetConfigCache();
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
            expect(Logger.log).toHaveBeenCalledWith(expectedError);
        });

        it('should reject invalid dates', () => {
            const result = importPastActivitiesFromWeb('2024-13-45', '2024-01-31');
            expect(result).toBe('エラー: 無効な日付が指定されました。');
            expect(Logger.log).toHaveBeenCalledWith('エラー: 無効な日付が指定されました。');
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
            expect(Logger.log).toHaveBeenCalledWith('エラー: 開始日は終了日より前の日付を指定してください。');
        });

        it('should correctly parse dates and pass them to importPastActivities', () => {
            vi.stubGlobal('importPastActivities', vi.fn().mockReturnValue('SUCCESS_MOCK'));

            const startStr = '2024-03-01';
            const endStr = '2024-03-31';

            const result = importPastActivitiesFromWeb(startStr, endStr);

            expect(result).toBe('SUCCESS_MOCK');

            // Check that importPastActivities was called with correctly parsed dates
            expect(importPastActivities).toHaveBeenCalledTimes(1);
            const callArgs = (importPastActivities as any).mock.calls[0];

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
