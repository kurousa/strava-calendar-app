import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as auth from '../src/auth';

describe('auth', () => {
    let mockService;

    beforeEach(() => {
        vi.clearAllMocks();
        global.Logger.log.mockClear();

        mockService = {
            setAuthorizationBaseUrl: vi.fn().mockReturnThis(),
            setTokenUrl: vi.fn().mockReturnThis(),
            setClientId: vi.fn().mockReturnThis(),
            setClientSecret: vi.fn().mockReturnThis(),
            setCallbackFunction: vi.fn().mockReturnThis(),
            setPropertyStore: vi.fn().mockReturnThis(),
            setScope: vi.fn().mockReturnThis(),
            hasAccess: vi.fn(),
            getAccessToken: vi.fn(),
            handleCallback: vi.fn(),
            getAuthorizationUrl: vi.fn(),
            reset: vi.fn(),
        };

        global.OAuth2 = {
            createService: vi.fn().mockReturnValue(mockService)
        };

        global.HtmlService = {
            createHtmlOutput: vi.fn().mockReturnValue('mock_html_output')
        };
    });

    describe('getOAuthService', () => {
        it('should throw an error if properties are not set', () => {
            // Need to mock properties exactly as they are called in getOAuthService
            const mockProps = {
                getProperty: vi.fn().mockReturnValue(null)
            };
            global.PropertiesService.getScriptProperties.mockReturnValue(mockProps);

            expect(() => auth.getOAuthService()).toThrow('設定されていません');
        });

        it('should create and configure OAuth2 service if properties are set', () => {
            const mockProps = {
                getProperty: vi.fn((key) => {
                    if (key === 'STRAVA_CLIENT_ID') return 'test_id';
                    if (key === 'STRAVA_CLIENT_SECRET') return 'test_secret';
                    return null;
                })
            };
            global.PropertiesService.getScriptProperties.mockReturnValue(mockProps);

            const service = auth.getOAuthService();
            expect(service).toBeDefined();
            expect(service.setClientId).toHaveBeenCalledWith('test_id');
            expect(service.setClientSecret).toHaveBeenCalledWith('test_secret');
            expect(service.setScope).toHaveBeenCalledWith('activity:read_all');
        });
    });

    describe('authCallback', () => {
        beforeEach(() => {
             vi.spyOn(auth, 'getOAuthService').mockReturnValue(mockService);
        });

        it('should return success HTML when authorized', () => {
            mockService.handleCallback.mockReturnValue(true);

            const result = auth.authCallback({});
            expect(result).toBeDefined();
            expect(global.HtmlService.createHtmlOutput).toHaveBeenCalledWith(expect.stringContaining('成功'));
        });

        it('should return failure HTML when not authorized', () => {
            mockService.handleCallback.mockReturnValue(false);

            const result = auth.authCallback({});
            expect(result).toBeDefined();
            expect(global.HtmlService.createHtmlOutput).toHaveBeenCalledWith(expect.stringContaining('失敗'));
        });
    });

    describe('startAuth', () => {
        beforeEach(() => {
             vi.spyOn(auth, 'getOAuthService').mockReturnValue(mockService);
        });

        it('should log already connected if has access', () => {
            mockService.hasAccess.mockReturnValue(true);

            auth.startAuth();
            expect(global.Logger.log).toHaveBeenCalledWith(expect.stringContaining('完了しています'));
        });

        it('should log authorization URL if no access', () => {
            mockService.hasAccess.mockReturnValue(false);
            mockService.getAuthorizationUrl.mockReturnValue('http://auth.url');

            auth.startAuth();
            expect(global.Logger.log).toHaveBeenCalledWith('http://auth.url');
        });
    });

    describe('resetAuth', () => {
        beforeEach(() => {
             vi.spyOn(auth, 'getOAuthService').mockReturnValue(mockService);
        });

        it('should call reset on service and log', () => {
            auth.resetAuth();
            expect(mockService.reset).toHaveBeenCalled();
            expect(global.Logger.log).toHaveBeenCalledWith(expect.stringContaining('解除しました'));
        });
    });
});
