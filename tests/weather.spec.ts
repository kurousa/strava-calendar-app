import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('weather.ts', () => {
    describe('fetchWeatherData', () => {
        const lat = 35.6895;
        const lng = 139.6917;
        const dateObj = new Date('2024-04-12T10:30:00+09:00'); // 10:30 JST

        let fetchWeatherData: any;

        beforeEach(async () => {
            vi.resetModules();
            const weatherModule = await import("../weather");
            fetchWeatherData = weatherModule.fetchWeatherData;

            vi.stubGlobal('sendErrorEmail', vi.fn());
            vi.clearAllMocks();
            // Mock PropertiesService to return an API key
            vi.stubGlobal('PropertiesService', {
                getScriptProperties: vi.fn().mockReturnValue({
                    getProperty: vi.fn((key: string) => {
                        if (key === 'WEATHER_API_KEY') return 'fake_weather_key';
                        return null;
                    })
                })
            });
        });

        it('should fetch weather data correctly for a given date and time', () => {
            const mockResponse = {
                getResponseCode: () => 200,
                getContentText: () => JSON.stringify({
                    forecast: {
                        forecastday: [{
                            hour: new Array(24).fill(0).map((_, i) => ({
                                temp_c: i === 10 ? 20.5 : 0,
                                wind_kph: i === 10 ? 5.2 : 0,
                                condition: { text: i === 10 ? '晴れ' : 'Unknown' }
                            }))
                        }]
                    }
                })
            };
            (global as any).UrlFetchApp.fetch.mockReturnValue(mockResponse);

            const result = fetchWeatherData(lat, lng, dateObj);

            expect(result).toBe('天気: 晴れ / 気温: 20.5℃ / 風速: 5.2km/h');
            expect((global as any).UrlFetchApp.fetch).toHaveBeenCalledWith(
                expect.stringContaining('key=fake_weather_key'),
                expect.any(Object)
            );
            expect((global as any).UrlFetchApp.fetch).toHaveBeenCalledWith(
                expect.stringContaining('q=35.6895,139.6917'),
                expect.any(Object)
            );
            expect((global as any).UrlFetchApp.fetch).toHaveBeenCalledWith(
                expect.stringContaining('dt=2024-04-12'),
                expect.any(Object)
            );
        });

        it('should return empty string if API key is missing', () => {
            vi.stubGlobal('PropertiesService', {
                getScriptProperties: vi.fn().mockReturnValue({
                    getProperty: vi.fn(() => null)
                })
            });
            const result = fetchWeatherData(lat, lng, dateObj);
            expect(result).toBe('');
            expect((global as any).Logger.log).toHaveBeenCalledWith(expect.stringContaining('[Weather API Error] APIキーが設定されていません。'));
        });

        it('should return empty string if response code is not 200', () => {
            const mockResponse = {
                getResponseCode: () => 400,
                getContentText: () => JSON.stringify({
                    error: { message: 'Invalid API Key' }
                })
            };
            (global as any).UrlFetchApp.fetch.mockReturnValue(mockResponse);

            const result = fetchWeatherData(lat, lng, dateObj);

            expect(result).toBe('');
            expect((global as any).Logger.log).toHaveBeenCalledWith(expect.stringContaining('[Weather API Error] Invalid API Key'));
        });

        it('should return empty string if an exception occurs', () => {
            (global as any).UrlFetchApp.fetch.mockImplementation(() => {
                throw new Error('Network Error');
            });

            const result = fetchWeatherData(lat, lng, dateObj);

            expect(result).toBe('');
            expect((global as any).Logger.log).toHaveBeenCalledWith(expect.stringContaining('[Weather API Exception]'));
        });

        it('should return empty string if forecast data is missing', () => {
             const mockResponse = {
                getResponseCode: () => 200,
                getContentText: () => JSON.stringify({})
            };
            (global as any).UrlFetchApp.fetch.mockReturnValue(mockResponse);

            const result = fetchWeatherData(lat, lng, dateObj);
            expect(result).toBe('');
        });

        it('should return "不明" if condition text is missing', () => {
             const mockResponse = {
                getResponseCode: () => 200,
                getContentText: () => JSON.stringify({
                    forecast: {
                        forecastday: [{
                            hour: new Array(24).fill(0).map((_, i) => ({
                                temp_c: 20,
                                wind_kph: 5,
                                condition: {}
                            }))
                        }]
                    }
                })
            };
            (global as any).UrlFetchApp.fetch.mockReturnValue(mockResponse);

            const result = fetchWeatherData(lat, lng, dateObj);
            expect(result).toBe('天気: 不明 / 気温: 20℃ / 風速: 5km/h');
        });
    });
});
