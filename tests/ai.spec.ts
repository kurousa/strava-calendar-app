import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateAiComment } from '../ai';

describe('generateAiComment', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should generate an AI comment when API key is present', () => {
        const mockActivity: any = {
            id: 12345,
            type: 'Run',
            distance: 5000,
            moving_time: 1800,
            total_elevation_gain: 50,
            has_heartrate: true,
            average_heartrate: 150,
            weatherText: '天気: ☀️ 晴れ / 気温: 20℃ / 風速: 2km/h'
        };

        const mockResponse = {
            getResponseCode: () => 200,
            getContentText: () => JSON.stringify({
                candidates: [{
                    content: {
                        parts: [{ text: '素晴らしい走りでした！' }]
                    }
                }]
            })
        };

        (global as any).UrlFetchApp.fetch.mockReturnValue(mockResponse);

        const comment = generateAiComment(mockActivity);

        expect(comment).toBe('素晴らしい走りでした！');
        expect((global as any).UrlFetchApp.fetch).toHaveBeenCalledWith(
            expect.stringContaining('gemini-1.5-flash'),
            expect.objectContaining({
                method: 'post',
                contentType: 'application/json'
            })
        );
    });

    it('should return an empty string when GEMINI_API_KEY is missing', () => {
        const scriptPropertiesMock = (global as any).PropertiesService.getScriptProperties();
        scriptPropertiesMock.getProperty.mockImplementation((key: string) => {
            if (key === 'GEMINI_API_KEY') return null;
            return 'fake';
        });

        const comment = generateAiComment({ type: 'Run' } as any);
        expect(comment).toBe('');

        // Restore mock
        scriptPropertiesMock.getProperty.mockImplementation((key: string) => {
            if (key === 'STRAVA_CLIENT_ID') return 'fake_id';
            if (key === 'STRAVA_CLIENT_SECRET') return 'fake_secret';
            if (key === 'GEMINI_API_KEY') return 'fake_gemini_key';
            return null;
        });
    });

    it('should handle API errors gracefully', () => {
        (global as any).UrlFetchApp.fetch.mockReturnValue({
            getResponseCode: () => 500
        });

        const comment = generateAiComment({ type: 'Run' } as any);
        expect(comment).toBe('');
    });
});
