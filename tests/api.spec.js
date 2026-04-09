import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getStravaActivities, getSearchParam, convertToTime } from '../api';

describe('api', () => {
    const mockService = {
        hasAccess: vi.fn(),
        getAccessToken: vi.fn(),
    };

    const mockResponse = {
        getContentText: vi.fn(),
        getResponseCode: vi.fn(),
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
        mockResponse.getResponseCode.mockReturnValue(200);
        mockResponse.getContentText.mockReturnValue(JSON.stringify(activities));

        const result = getStravaActivities();

        expect(result).toEqual(activities);
        expect(global.UrlFetchApp.fetch).toHaveBeenCalledWith(
            expect.stringMatching(/https:\/\/www\.strava\.com\/api\/v3\/athlete\/activities/),
            expect.objectContaining({
                headers: {
                    Authorization: 'Bearer fake_token'
                }
            })
        );
    });

    it('should return empty array and log error when no access', () => {
        mockService.hasAccess.mockReturnValue(false);

        const result = getStravaActivities();

        expect(result).toEqual([]);
        expect(global.sendErrorEmail).toHaveBeenCalled();
        expect(global.Logger.log).toHaveBeenCalledWith(expect.stringContaining('Stravaと連携されていません'));
    });

    it('should return empty array, log error and send email when fetch throws an error', () => {
        mockService.hasAccess.mockReturnValue(true);
        mockService.getAccessToken.mockReturnValue('fake_token');
        global.UrlFetchApp.fetch.mockImplementation(() => {
            throw new Error('Network error');
        });

        const result = getStravaActivities();

        expect(result).toEqual([]);
        expect(global.sendErrorEmail).toHaveBeenCalledWith(expect.stringContaining('Network error'));
        expect(global.Logger.log).toHaveBeenCalledWith(expect.stringContaining('Network error'));
    });

    it('should not crash if sendErrorEmail is undefined when fetch throws an error', () => {
        mockService.hasAccess.mockReturnValue(true);
        mockService.getAccessToken.mockReturnValue('fake_token');
        global.UrlFetchApp.fetch.mockImplementation(() => {
            throw new Error('Network error');
        });

        // Temporarily remove sendErrorEmail from global
        vi.stubGlobal('sendErrorEmail', undefined);

        const result = getStravaActivities();

        expect(result).toEqual([]);
        expect(global.Logger.log).toHaveBeenCalledWith(expect.stringContaining('Network error'));
    });

    it('should break loop and return empty array when response status is not 200', () => {
        mockService.hasAccess.mockReturnValue(true);
        mockService.getAccessToken.mockReturnValue('fake_token');
        mockResponse.getResponseCode.mockReturnValue(401);

        const result = getStravaActivities();

        expect(result).toEqual([]);
        expect(global.Logger.log).toHaveBeenCalledWith('[API Error] Status Code: 401');
    });

    it('should break loop when response contains exactly 0 activities', () => {
        mockService.hasAccess.mockReturnValue(true);
        mockService.getAccessToken.mockReturnValue('fake_token');
        mockResponse.getResponseCode.mockReturnValue(200);
        mockResponse.getContentText.mockReturnValue(JSON.stringify([]));

        const result = getStravaActivities();

        expect(result).toEqual([]);
    });

    it('should handle pagination and Utilities.sleep correctly', () => {
        const activities1 = Array.from({ length: 200 }, (_, i) => ({ id: i, name: `Run ${i}` }));
        const activities2 = [{ id: 200, name: 'Run 200' }];

        mockService.hasAccess.mockReturnValue(true);
        mockService.getAccessToken.mockReturnValue('fake_token');
        mockResponse.getResponseCode.mockReturnValue(200);

        // Return 200 activities on first call, 1 activity on second call
        mockResponse.getContentText
            .mockReturnValueOnce(JSON.stringify(activities1))
            .mockReturnValueOnce(JSON.stringify(activities2));

        vi.stubGlobal('Utilities', { sleep: vi.fn() });

        const result = getStravaActivities(undefined, undefined, 200);

        expect(result.length).toBe(201);
        expect(global.Utilities.sleep).toHaveBeenCalledWith(200);
        expect(global.UrlFetchApp.fetch).toHaveBeenCalledTimes(2);
    });

    describe('getSearchParam', () => {
        it('should return correct params with all arguments', () => {
            const afterDate = new Date('2024-01-01T00:00:00Z');
            const beforeDate = new Date('2024-01-02T00:00:00Z');
            const perPage = 100;

            const params = getSearchParam(afterDate, beforeDate, perPage);

            expect(params.per_page).toBe(100);
            expect(params.after).toBe(convertToTime(afterDate));
            expect(params.before).toBe(convertToTime(beforeDate));
        });

        it('should set default after and before dates if not provided', () => {
            const perPage = 50;
            const now = new Date('2024-01-05T12:00:00Z');
            vi.useFakeTimers();
            vi.setSystemTime(now);

            const params = getSearchParam(undefined, undefined, perPage);

            expect(params.per_page).toBe(50);

            const expectedBefore = convertToTime(now);
            const expectedAfterDate = new Date(now);
            expectedAfterDate.setDate(now.getDate() - 1);
            const expectedAfter = convertToTime(expectedAfterDate);

            expect(params.before).toBe(expectedBefore);
            expect(params.after).toBe(expectedAfter);

            vi.useRealTimers();
        });
    });

    describe('convertToTime', () => {
        it('should convert Date to unix timestamp (seconds)', () => {
            const date = new Date('2024-01-02T00:00:10Z');
            const seconds = convertToTime(date);
            expect(seconds).toBe(1704153610);
        });
    });
});
