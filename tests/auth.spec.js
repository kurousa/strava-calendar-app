import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOAuthService, authCallback, startAuth, resetAuth } from '../auth';

describe('auth', () => {
    const mockService = {
        setAuthorizationBaseUrl: vi.fn().mockReturnThis(),
        setTokenUrl: vi.fn().mockReturnThis(),
        setClientId: vi.fn().mockReturnThis(),
        setClientSecret: vi.fn().mockReturnThis(),
        setCallbackFunction: vi.fn().mockReturnThis(),
        setPropertyStore: vi.fn().mockReturnThis(),
        setScope: vi.fn().mockReturnThis(),
        handleCallback: vi.fn(),
        hasAccess: vi.fn(),
        getAuthorizationUrl: vi.fn(),
        reset: vi.fn()
    };

    beforeEach(() => {
        vi.resetAllMocks();

        mockService.setAuthorizationBaseUrl.mockReturnThis();
        mockService.setTokenUrl.mockReturnThis();
        mockService.setClientId.mockReturnThis();
        mockService.setClientSecret.mockReturnThis();
        mockService.setCallbackFunction.mockReturnThis();
        mockService.setPropertyStore.mockReturnThis();
        mockService.setScope.mockReturnThis();

        global.OAuth2.createService.mockReturnValue(mockService);
    });

    it('should create and return OAuth service', () => {
        const service = getOAuthService();
        expect(service).toBe(mockService);
        expect(global.OAuth2.createService).toHaveBeenCalledWith('Strava');
        expect(mockService.setClientId).toHaveBeenCalledWith('fake_id');
        expect(mockService.setClientSecret).toHaveBeenCalledWith('fake_secret');
    });

    it('should handle auth callback successfully', () => {
        const request = { parameter: { code: 'auth_code' } };
        mockService.handleCallback.mockReturnValue(true);
        global.HtmlService.createHtmlOutput.mockImplementation((msg) => msg);

        const result = authCallback(request);

        expect(result).toContain('成功');
        expect(mockService.handleCallback).toHaveBeenCalledWith(request);
    });

    it('should handle auth callback failure', () => {
        const request = { parameter: { error: 'access_denied' } };
        mockService.handleCallback.mockReturnValue(false);
        global.HtmlService.createHtmlOutput.mockImplementation((msg) => msg);

        const result = authCallback(request);

        expect(result).toContain('失敗');
    });

    it('should skip auth when already logged in', () => {
        mockService.hasAccess.mockReturnValue(true);

        startAuth();

        expect(global.Logger.log).toHaveBeenCalledWith(expect.stringContaining('完了しています'));
        expect(mockService.getAuthorizationUrl).not.toHaveBeenCalled();
    });

    it('should log authorization url when not logged in', () => {
        mockService.hasAccess.mockReturnValue(false);
        mockService.getAuthorizationUrl.mockReturnValue('https://example.com/auth');

        startAuth();

        expect(mockService.getAuthorizationUrl).toHaveBeenCalled();
        expect(global.Logger.log).toHaveBeenCalledWith('https://example.com/auth');
    });

    it('should reset auth', () => {
        resetAuth();
        expect(mockService.reset).toHaveBeenCalled();
        expect(global.Logger.log).toHaveBeenCalledWith(expect.stringContaining('解除しました'));
    });
});
