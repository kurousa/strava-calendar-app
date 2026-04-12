import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getWeatherEmoji, fetchWeatherData } from '../weather';

describe('weather', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getWeatherEmoji', () => {
        it('should return ☀️ for code 0', () => {
            expect(getWeatherEmoji(0)).toBe('☀️ 晴れ');
        });

        it('should return ⛅ for codes 1, 2, 3', () => {
            expect(getWeatherEmoji(1)).toBe('⛅ 曇り');
            expect(getWeatherEmoji(2)).toBe('⛅ 曇り');
            expect(getWeatherEmoji(3)).toBe('⛅ 曇り');
        });

        it('should return 🌫️ for codes 45-48', () => {
            expect(getWeatherEmoji(45)).toBe('🌫️ 霧');
            expect(getWeatherEmoji(48)).toBe('🌫️ 霧');
        });

        it('should return 🌧️ for codes 51-67', () => {
            expect(getWeatherEmoji(51)).toBe('🌧️ 雨');
            expect(getWeatherEmoji(67)).toBe('🌧️ 雨');
        });

        it('should return ❄️ for codes 71-77', () => {
            expect(getWeatherEmoji(71)).toBe('❄️ 雪');
            expect(getWeatherEmoji(77)).toBe('❄️ 雪');
        });

        it('should return 🚿 for codes 80-82', () => {
            expect(getWeatherEmoji(80)).toBe('🚿 にわか雨');
            expect(getWeatherEmoji(82)).toBe('🚿 にわか雨');
        });

        it('should return ⛈️ for codes 95-99', () => {
            expect(getWeatherEmoji(95)).toBe('⛈️ 雷雨');
            expect(getWeatherEmoji(99)).toBe('⛈️ 雷雨');
        });

        it('should return ☁️ for unknown codes', () => {
            expect(getWeatherEmoji(999)).toBe('☁️ 不明');
        });
    });

    describe('fetchWeatherData', () => {
        const mockLat = 35.6895;
        const mockLng = 139.6917;
        const mockDate = new Date('2023-10-27T10:00:00'); // 10 AM

        it('should fetch and format weather data correctly on success', () => {
            const mockResponse = {
                getResponseCode: () => 200,
                getContentText: () => JSON.stringify({
                    hourly: {
                        temperature_2m: Array(24).fill(20.5),
                        weathercode: Array(24).fill(1),
                        windspeed_10m: Array(24).fill(3.2)
                    }
                })
            };
            (global.UrlFetchApp.fetch as any).mockReturnValue(mockResponse);

            const result = fetchWeatherData(mockLat, mockLng, mockDate);

            expect(global.UrlFetchApp.fetch).toHaveBeenCalledWith(
                expect.stringContaining(`latitude=${mockLat}`),
                expect.any(Object)
            );
            expect(global.UrlFetchApp.fetch).toHaveBeenCalledWith(
                expect.stringContaining('start_date=2023-10-27'),
                expect.any(Object)
            );
            expect(result).toBe('天気: ⛅ 曇り / 気温: 20.5℃ / 風速: 3.2m/s');
        });

        it('should return empty string on non-200 response', () => {
            const mockResponse = {
                getResponseCode: () => 404,
                getContentText: () => 'Not Found'
            };
            (global.UrlFetchApp.fetch as any).mockReturnValue(mockResponse);

            const result = fetchWeatherData(mockLat, mockLng, mockDate);

            expect(result).toBe('');
            expect(global.Logger.log).toHaveBeenCalledWith(expect.stringContaining('[Weather API Error]'));
        });

        it('should return empty string on exception', () => {
            (global.UrlFetchApp.fetch as any).mockImplementation(() => {
                throw new Error('Network error');
            });

            const result = fetchWeatherData(mockLat, mockLng, mockDate);

            expect(result).toBe('');
            expect(global.Logger.log).toHaveBeenCalledWith(expect.stringContaining('[Weather API Exception]'));
        });

        it('should handle null/undefined temperature data', () => {
            const mockResponse = {
                getResponseCode: () => 200,
                getContentText: () => JSON.stringify({
                    hourly: {
                        temperature_2m: Array(24).fill(null),
                        weathercode: Array(24).fill(1),
                        windspeed_10m: Array(24).fill(3.2)
                    }
                })
            };
            (global.UrlFetchApp.fetch as any).mockReturnValue(mockResponse);

            const result = fetchWeatherData(mockLat, mockLng, mockDate);

            expect(result).toBe('');
        });
    });
});
