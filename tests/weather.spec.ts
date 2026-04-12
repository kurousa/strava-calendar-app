import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getWeatherEmoji, fetchWeatherData} from "../weather";

describe('weather.ts', () => {
    describe('getWeatherEmoji', () => {
        it('should return "☀️ 晴れ" for code 0', () => {
            expect(getWeatherEmoji(0)).toBe('☀️ 晴れ');
        });

        it('should return "⛅ 曇り" for codes 1, 2, 3', () => {
            expect(getWeatherEmoji(1)).toBe('⛅ 曇り');
            expect(getWeatherEmoji(2)).toBe('⛅ 曇り');
            expect(getWeatherEmoji(3)).toBe('⛅ 曇り');
        });

        it('should return "🌫️ 霧" for codes 45-48', () => {
            expect(getWeatherEmoji(45)).toBe('🌫️ 霧');
            expect(getWeatherEmoji(48)).toBe('🌫️ 霧');
        });

        it('should return "🌧️ 雨" for codes 51-67', () => {
            expect(getWeatherEmoji(51)).toBe('🌧️ 雨');
            expect(getWeatherEmoji(67)).toBe('🌧️ 雨');
        });

        it('should return "❄️ 雪" for codes 71-77', () => {
            expect(getWeatherEmoji(71)).toBe('❄️ 雪');
            expect(getWeatherEmoji(77)).toBe('❄️ 雪');
        });

        it('should return "🚿 にわか雨" for codes 80-82', () => {
            expect(getWeatherEmoji(80)).toBe('🚿 にわか雨');
            expect(getWeatherEmoji(82)).toBe('🚿 にわか雨');
        });

        it('should return "⛈️ 雷雨" for codes 95-99', () => {
            expect(getWeatherEmoji(95)).toBe('⛈️ 雷雨');
            expect(getWeatherEmoji(99)).toBe('⛈️ 雷雨');
        });

        it('should return "☁️ 不明" for other codes', () => {
            expect(getWeatherEmoji(100)).toBe('☁️ 不明');
            expect(getWeatherEmoji(-1)).toBe('☁️ 不明');
        });
    });

    describe('fetchWeatherData', () => {
        const lat = 35.6895;
        const lng = 139.6917;
        const dateObj = new Date('2024-04-12T10:30:00+09:00'); // 10:30 JST

        beforeEach(() => {
            vi.clearAllMocks();
        });

        it('should fetch weather data correctly for a given date and time', () => {
            const mockResponse = {
                getResponseCode: () => 200,
                getContentText: () => JSON.stringify({
                    hourly: {
                        temperature_2m: new Array(24).fill(0).map((_, i) => i === 10 ? 20.5 : 0),
                        weathercode: new Array(24).fill(0).map((_, i) => i === 10 ? 0 : 99),
                        windspeed_10m: new Array(24).fill(0).map((_, i) => i === 10 ? 5.2 : 0)
                    }
                })
            };
            (global as any).UrlFetchApp.fetch.mockReturnValue(mockResponse);

            const result = fetchWeatherData(lat, lng, dateObj);

            expect(result).toBe('天気: ☀️ 晴れ / 気温: 20.5℃ / 風速: 5.2km/h');
            expect((global as any).UrlFetchApp.fetch).toHaveBeenCalledWith(
                expect.stringContaining('latitude=35.6895'),
                expect.any(Object)
            );
            expect((global as any).UrlFetchApp.fetch).toHaveBeenCalledWith(
                expect.stringContaining('longitude=139.6917'),
                expect.any(Object)
            );
            expect((global as any).UrlFetchApp.fetch).toHaveBeenCalledWith(
                expect.stringContaining('start_date=2024-04-12'),
                expect.any(Object)
            );
            expect((global as any).UrlFetchApp.fetch).toHaveBeenCalledWith(
                expect.stringContaining('end_date=2024-04-12'),
                expect.any(Object)
            );
            expect((global as any).UrlFetchApp.fetch).toHaveBeenCalledWith(
                expect.stringContaining('timezone=Asia%2FTokyo'),
                expect.any(Object)
            );
        });

        it('should return empty string if response code is not 200', () => {
            const mockResponse = {
                getResponseCode: () => 500,
                getContentText: () => 'Internal Server Error'
            };
            (global as any).UrlFetchApp.fetch.mockReturnValue(mockResponse);

            const result = fetchWeatherData(lat, lng, dateObj);

            expect(result).toBe('');
            expect((global as any).Logger.log).toHaveBeenCalledWith(expect.stringContaining('[Weather API Error]'));
        });

        it('should return empty string if an exception occurs', () => {
            (global as any).UrlFetchApp.fetch.mockImplementation(() => {
                throw new Error('Network Error');
            });

            const result = fetchWeatherData(lat, lng, dateObj);

            expect(result).toBe('');
            expect((global as any).Logger.log).toHaveBeenCalledWith(expect.stringContaining('[Weather API Exception]'));
        });

        it('should return empty string if temperature data is missing', () => {
             const mockResponse = {
                getResponseCode: () => 200,
                getContentText: () => JSON.stringify({
                    hourly: {
                        temperature_2m: [],
                        weathercode: [],
                        windspeed_10m: []
                    }
                })
            };
            (global as any).UrlFetchApp.fetch.mockReturnValue(mockResponse);

            const result = fetchWeatherData(lat, lng, dateObj);
            expect(result).toBe('');
        });
    });
});
