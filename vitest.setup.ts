import { vi } from 'vitest';

// GASのグローバルオブジェクトをモック化
global.Logger = {
    log: vi.fn(),
} as any;

global.CalendarApp = {
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
} as any;

global.SpreadsheetApp = {
    openById: vi.fn(() => ({
        getSheetByName: vi.fn(),
        insertSheet: vi.fn(),
    }))
} as any;

global.PropertiesService = {
    getScriptProperties: vi.fn(() => ({
        getProperty: vi.fn((key: string) => {
            if (key === 'STRAVA_CLIENT_ID') return 'fake_id';
            if (key === 'STRAVA_CLIENT_SECRET') return 'fake_secret';
            return null;
        })
    })),
    getUserProperties: vi.fn(() => ({
        getProperty: vi.fn(),
        setProperty: vi.fn()
    }))
} as any;

global.OAuth2 = {
    createService: vi.fn()
} as any;

global.HtmlService = {
    createHtmlOutput: vi.fn(),
    createHtmlOutputFromFile: vi.fn(() => {
        const mockOutput = {
            setTitle: vi.fn().mockReturnThis(),
        };
        return mockOutput;
    })
} as any;

global.Session = {
    getEffectiveUser: vi.fn(() => ({
        getEmail: vi.fn(() => 'test@example.com')
    }))
} as any;

global.MailApp = {
    sendEmail: vi.fn()
} as any;

vi.stubGlobal('UrlFetchApp', {
    fetch: vi.fn(() => ({
        getResponseCode: vi.fn(() => 200),
        getContentText: vi.fn(() => JSON.stringify({
            hourly: {
                temperature_2m: Array(24).fill(20),
                weathercode: Array(24).fill(0),
                windspeed_10m: Array(24).fill(2)
            }
        }))
    }))
});

// Globalize DefaultFormatter for testing so that formatters can access it as they would in GAS environment
import * as DefaultFormatter from './formatters/DefaultFormatter.ts';
global.getCommonMetrics = (DefaultFormatter as any).getCommonMetrics || (() => ({}));

// Utilitiesのモック
global.Utilities = {
    sleep: vi.fn(),
} as any;


// Globalize formatter functions for main.ts testing
global.getActivityStyle = (DefaultFormatter as any).getActivityStyle || (() => ({ color: "BLUE" }));
global.makeDescription = (DefaultFormatter as any).makeDescription || (() => "mock description");


import * as RunFormatter from "./formatters/RunFormatter.ts";
import * as RideFormatter from "./formatters/RideFormatter.ts";

global.makeRunDescription = (RunFormatter as any).makeRunDescription || (() => "mock run desc");
global.makeRideDescription = (RideFormatter as any).makeRideDescription || (() => "mock ride desc");


// Restore original functions
global.makeRunDescription = (RunFormatter as any).makeRunDescription;
global.makeRideDescription = (RideFormatter as any).makeRideDescription;

import * as WeatherModule from './weather.ts';
vi.stubGlobal('fetchWeatherData', (WeatherModule as any).fetchWeatherData || vi.fn(() => "天気: ☀️ 晴れ / 気温: 20℃ / 風速: 2m/s"));
