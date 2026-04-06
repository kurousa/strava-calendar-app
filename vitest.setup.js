import { vi } from 'vitest';

// GASのグローバルオブジェクトをモック化
global.Logger = {
    log: vi.fn(),
};

global.CalendarApp = {
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
    createHtmlOutput: vi.fn()
};

global.Session = {
    getEffectiveUser: vi.fn(() => ({
        getEmail: vi.fn(() => 'test@example.com')
    }))
};

global.MailApp = {
    sendEmail: vi.fn()
};

// Globalize DefaultFormatter for testing so that formatters can access it as they would in GAS environment
import * as DefaultFormatter from './formatters/DefaultFormatter.js';
global.getCommonMetrics = DefaultFormatter.getCommonMetrics || (() => ({}));
