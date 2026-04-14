import { vi } from 'vitest';

// GASのグローバルオブジェクトをモック化
vi.hoisted(() => {
    (global as any).Logger = {
        log: vi.fn(),
    };

    (global as any).CalendarApp = {
        getCalendarById: vi.fn(),
        getDefaultCalendar: vi.fn(),
        EventColor: {
            BLUE: 'BLUE',
            RED: 'RED',
            GREEN: 'GREEN',
            CYAN: 'CYAN',
            PALE_GREEN: 'PALE_GREEN',
            ORANGE: 'ORANGE',
            GRAY: 'GRAY'
        },
    };

    (global as any).SpreadsheetApp = {
        openById: vi.fn(() => ({
            getSheetByName: vi.fn(),
            insertSheet: vi.fn(),
        }))
    };

    const scriptPropertiesMock = {
        getProperty: vi.fn((key: string) => {
            if (key === 'STRAVA_CLIENT_ID') return 'fake_id';
            if (key === 'STRAVA_CLIENT_SECRET') return 'fake_secret';
            return null;
        })
    };

    (global as any).PropertiesService = {
        getScriptProperties: vi.fn(() => scriptPropertiesMock),
        getUserProperties: vi.fn(() => ({
            getProperty: vi.fn(),
            setProperty: vi.fn()
        }))
    };

    (global as any).OAuth2 = {
        createService: vi.fn()
    };

    (global as any).HtmlService = {
        createHtmlOutput: vi.fn(() => {
            const mockOutput = {
                setStatusCode: vi.fn().mockReturnThis(),
            };
            return mockOutput;
        }),
        createHtmlOutputFromFile: vi.fn(() => {
            const mockOutput = {
                setTitle: vi.fn().mockReturnThis(),
                setStatusCode: vi.fn().mockReturnThis(),
            };
            return mockOutput;
        })
    };

    (global as any).Session = {
        getEffectiveUser: vi.fn(() => ({
            getEmail: vi.fn(() => 'test@example.com')
        }))
    };

    (global as any).MailApp = {
        sendEmail: vi.fn()
    };

    (global as any).UrlFetchApp = {
        fetch: vi.fn(),
    };

    // Utilitiesのモック
    (global as any).Utilities = {
        sleep: vi.fn(),
        formatDate: (date: Date, timeZone: string, format: string) => {
            // 簡易的な formatDate モック (テストで必要な形式のみ対応)
            const d = new Intl.DateTimeFormat('en-US', {
                timeZone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                hour12: false
            }).formatToParts(date);
            const p: any = {};
            d.forEach(part => p[part.type] = part.value);

            let result = format;
            result = result.replace('yyyy', p.year);
            result = result.replace('MM', p.month);
            result = result.replace('dd', p.day);
            if (p.hour) {
                // hour12: false with en-US can return "24" for midnight in some Node versions.
                const h = parseInt(p.hour, 10) % 24;
                result = result.replace('HH', String(h).padStart(2, '0'));
                result = result.replace('H', String(h));
            }
            return result;
        }
    };
});

// athlete.ts のグローバル関数モック
vi.stubGlobal('getAthleteWeight', vi.fn().mockReturnValue(null));


// Globalize DefaultFormatter for testing so that formatters can access it as they would in GAS environment
import * as DefaultFormatter from './formatters/DefaultFormatter.ts';
(global as any).getCommonMetrics = (DefaultFormatter as any).getCommonMetrics || (() => ({}));


// Globalize formatter functions for main.ts testing
(global as any).getActivityStyle = (DefaultFormatter as any).getActivityStyle || (() => ({ color: "BLUE" }));
(global as any).makeDescription = (DefaultFormatter as any).makeDescription || (() => "mock description");



import * as RunFormatter from "./formatters/RunFormatter.ts";
import * as RideFormatter from "./formatters/RideFormatter.ts";

global.makeRunDescription = (RunFormatter as any).makeRunDescription || (() => "mock run desc");
global.makeRideDescription = (RideFormatter as any).makeRideDescription || (() => "mock ride desc");


// Restore original functions
global.makeRunDescription = (RunFormatter as any).makeRunDescription;
global.makeRideDescription = (RideFormatter as any).makeRideDescription;

// Mock for getExistingActivityIds in tests
global.getExistingActivityIds = vi.fn().mockReturnValue(new Set());

// Globalize STRAVA_ACTIVITY_ID_REGEX for tests
import * as NotifierModule from './notifier.ts';
vi.stubGlobal('sendSyncNotification', (NotifierModule as any).sendSyncNotification || vi.fn());

// Globalize STRAVA_ACTIVITY_ID_REGEX for tests
import * as MainModule from './main.ts';
global.STRAVA_ACTIVITY_ID_REGEX = (MainModule as any).STRAVA_ACTIVITY_ID_REGEX;

// Globalize fetchWeatherData for tests
import * as WeatherModule from './weather.ts';
global.fetchWeatherData = (WeatherModule as any).fetchWeatherData || vi.fn(() => "天気: ☀️ 晴れ / 気温: 20℃ / 風速: 2m/s");
