import { vi } from 'vitest';

// GASのグローバルオブジェクトをモック化
global.Logger = {
    log: vi.fn(),
};

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
};

global.PropertiesService = {
    getScriptProperties: vi.fn(() => ({
        getProperty: vi.fn((key) => {
            if (key === 'STRAVA_CLIENT_ID') return 'fake_id';
            if (key === 'STRAVA_CLIENT_SECRET') return 'fake_secret';
            return null;
        })
    })),
    getUserProperties: vi.fn(() => ({
        getProperty: vi.fn(),
        setProperty: vi.fn()
    }))
};

global.OAuth2 = {
    createService: vi.fn()
};

global.HtmlService = {
    createHtmlOutput: vi.fn(),
    createHtmlOutputFromFile: vi.fn(() => {
        const mockOutput = {
            setTitle: vi.fn().mockReturnThis(),
        };
        return mockOutput;
    })
};

global.Session = {
    getEffectiveUser: vi.fn(() => ({
        getEmail: vi.fn(() => 'test@example.com')
    }))
};

global.MailApp = {
    sendEmail: vi.fn()
};

global.Utilities = {
    sleep: vi.fn()
};
global.getStravaActivities = vi.fn();
global.getActivityStyle = vi.fn(() => ({ color: global.CalendarApp.EventColor.BLUE }));
global.makeDescription = vi.fn(() => 'Test Description');

// Globalize DefaultFormatter for testing so that formatters can access it as they would in GAS environment
import * as DefaultFormatter from './formatters/DefaultFormatter.js';
global.getCommonMetrics = DefaultFormatter.getCommonMetrics || (() => ({}));

// Utilitiesのモック
global.Utilities = {
    sleep: vi.fn(),
};


// Globalize formatter functions for main.js testing
global.getActivityStyle = DefaultFormatter.getActivityStyle || (() => ({ color: "BLUE" }));
global.makeDescription = DefaultFormatter.makeDescription || (() => "mock description");


import * as RunFormatter from "./formatters/RunFormatter.js";
import * as RideFormatter from "./formatters/RideFormatter.js";

global.makeRunDescription = RunFormatter.makeRunDescription || (() => "mock run desc");
global.makeRideDescription = RideFormatter.makeRideDescription || (() => "mock ride desc");


// Restore original functions
global.makeRunDescription = RunFormatter.makeRunDescription;
global.makeRideDescription = RideFormatter.makeRideDescription;
