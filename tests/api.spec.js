import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getStravaActivities } from '../api';

describe('api', () => {
    const mockService = {
        hasAccess: vi.fn(),
        getAccessToken: vi.fn(),
    };

    const mockResponse = {
        getContentText: vi.fn(),
    };

    beforeEach(() => {
        vi.resetAllMocks();

        // GAS globals / specific functions used in api.js
        vi.stubGlobal('getOAuthService', vi.fn(() => mockService));
        vi.stubGlobal('Logger', { log: vi.fn() });
        vi.stubGlobal('UrlFetchApp', { fetch: vi.fn(() => mockResponse) });
        vi.stubGlobal('sendErrorEmail', vi.fn());
    });

    it('should return activities when access is granted and fetch is successful', () => {
        const activities = [
            { id: 1, name: 'Run 1' },
            { id: 2, name: 'Ride 1' }
        ];

        mockService.hasAccess.mockReturnValue(true);
        mockService.getAccessToken.mockReturnValue('fake_token');
        mockResponse.getContentText.mockReturnValue(JSON.stringify(activities));

        const result = getStravaActivities();

        expect(result).toEqual(activities);
        expect(global.UrlFetchApp.fetch).toHaveBeenCalledWith(
            expect.stringContaining('https://www.strava.com/api/v3/athlete/activities'),
            {
                headers: {
                    Authorization: 'Bearer fake_token'
                }
            }
        );
    });

    it('should return empty array and log error when no access', () => {
        mockService.hasAccess.mockReturnValue(false);

        const result = getStravaActivities();

        expect(result).toEqual([]);
        expect(global.sendErrorEmail).toHaveBeenCalled();
        expect(global.Logger.log).toHaveBeenCalledWith(expect.stringContaining('Stravaと連携されていません'));
    });

    it('should return empty array and log error when fetch fails', () => {
        mockService.hasAccess.mockReturnValue(true);
        mockService.getAccessToken.mockReturnValue('fake_token');
        global.UrlFetchApp.fetch.mockImplementation(() => {
            throw new Error('Network error');
        });

        const result = getStravaActivities();

        expect(result).toEqual([]);
        expect(global.sendErrorEmail).toHaveBeenCalled();
        expect(global.Logger.log).toHaveBeenCalledWith(expect.stringContaining('Strava APIの呼び出しに失敗しました'));
    });
});
