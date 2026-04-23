import { describe, it, expect } from 'vitest';
import '../const.ts';

describe('const.ts', () => {
    describe('deepFreeze', () => {
        it('should freeze the object', () => {
            const obj = { a: 1 };
            deepFreeze(obj);
            expect(Object.isFrozen(obj)).toBe(true);
            
            // In strict mode, this should throw, but in some environments it might just ignore
            try {
                (obj as any).a = 2;
            } catch (e) {
                // expected
            }
            expect(obj.a).toBe(1);
        });

        it('should freeze nested objects', () => {
            const obj = { a: { b: 1 } };
            deepFreeze(obj);
            expect(Object.isFrozen(obj)).toBe(true);
            expect(Object.isFrozen(obj.a)).toBe(true);

            try {
                (obj.a as any).b = 2;
            } catch (e) {
                // expected
            }
            expect(obj.a.b).toBe(1);
        });

        it('should handle null and non-object values', () => {
            const obj = { a: 1, b: null, c: undefined, d: 'string' };
            deepFreeze(obj);
            expect(Object.isFrozen(obj)).toBe(true);
        });
    });

    describe('Config', () => {
        it('should be defined on global', () => {
            expect((global as any).Config).toBeDefined();
        });

        it('should be frozen', () => {
            expect(Object.isFrozen((global as any).Config)).toBe(true);
        });

        it('should contain expected property keys', () => {
            const Config = (global as any).Config;
            const _GEMINI_VERSION = '2.5';
            const _GEMINI_MODEL = 'flash-lite';

            expect(Config.PROP_CALENDAR_ID).toBe('CALENDAR_ID');
            expect(Config.PROP_STRAVA_CLIENT_ID).toBe('STRAVA_CLIENT_ID');
            expect(Config.PROP_STRAVA_CLIENT_SECRET).toBe('STRAVA_CLIENT_SECRET');
            expect(Config.PROP_STRAVA_SCOPE).toBe('STRAVA_SCOPE');
            expect(Config.PROP_STRAVA_VERIFY_TOKEN).toBe('STRAVA_WEBHOOK_VERIFY_TOKEN');
            expect(Config.PROP_WEB_APP_URL).toBe('WEB_APP_URL');
            expect(Config.PROP_SPREADSHEET_ID).toBe('SPREADSHEET_ID');
            expect(Config.PROP_DISCORD_WEBHOOK_URL).toBe('DISCORD_WEBHOOK_URL');
            expect(Config.PROP_GEMINI_API_KEY).toBe('GEMINI_API_KEY');
            expect(Config.PROP_LAST_ERROR_NOTIFIED_AT).toBe('LAST_ERROR_NOTIFIED_AT');
            expect(Config.PROP_WEATHER_API_KEY).toBe('WEATHER_API_KEY');

            expect(Config.STRAVA_API_BASE).toBe('https://www.strava.com/api/v3');
            expect(Config.WEATHER_API_BASE).toBe('https://api.weatherapi.com/v1');
            expect(Config.GEMINI_API_BASE).toBe(`https://generativelanguage.googleapis.com/v1beta/models/gemini-${_GEMINI_VERSION}-${_GEMINI_MODEL}:generateContent`);

            expect(Config.CALENDAR_API_DELAY_MS).toBe(200);
            expect(Config.STRAVA_API_DELAY_MS).toBe(200);
            expect(Config.STRAVA_ACTIVITY_ID_REGEX).toBeInstanceOf(RegExp);
            expect(Config.DISTANCE_ACTIVITIES).toContain('Run');
            expect(Config.MAP_FOLDER_NAME).toBe('Strava_Route_Maps');
            expect(Config.GEAR_CONFIG_PREFIX).toBe('GEAR_CONFIG_');
            expect(Config.BACKUP_SHEET_NAME).toBe('Activities');
        });

        it('should have nested style data frozen', () => {
            const Config = (global as any).Config;
            expect(Object.isFrozen(Config.ACTIVITY_STYLE_DATA)).toBe(true);
            expect(Object.isFrozen(Config.ACTIVITY_STYLE_DATA['Walk'])).toBe(true);
            expect(Object.isFrozen(Config.ACTIVITY_STYLE_DATA['Run'])).toBe(true);
            expect(Object.isFrozen(Config.ACTIVITY_STYLE_DATA['VirtualRun'])).toBe(true);
            expect(Object.isFrozen(Config.ACTIVITY_STYLE_DATA['Ride'])).toBe(true);
            expect(Object.isFrozen(Config.ACTIVITY_STYLE_DATA['VirtualRide'])).toBe(true);
            expect(Object.isFrozen(Config.ACTIVITY_STYLE_DATA['Swim'])).toBe(true);
            expect(Object.isFrozen(Config.ACTIVITY_STYLE_DATA['Hike'])).toBe(true);
            expect(Object.isFrozen(Config.ACTIVITY_STYLE_DATA['Yoga'])).toBe(true);
            expect(Object.isFrozen(Config.ACTIVITY_STYLE_DATA['WeightTraining'])).toBe(true);
            expect(Object.isFrozen(Config.DEFAULT_ACTIVITY_STYLE_DATA)).toBe(true);
        });
    });

    describe('Global expansion', () => {
        it('should expand Config properties to global', () => {
            // These are defined in Config and should be available globally
            expect((global as any).STRAVA_API_BASE).toBe('https://www.strava.com/api/v3');
            expect((global as any).DISTANCE_ACTIVITIES).toContain('Run');
        });
    });
});
