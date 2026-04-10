import { vi } from 'vitest';

// GASのグローバルオブジェクトをモック化
global.Logger = {
    log: vi.fn(),
};

global.Utilities = {
    sleep: vi.fn()
};

global.UrlFetchApp = {
    fetch: vi.fn()
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
    createService: vi.fn(() => {
        const mockService = {
            setAuthorizationBaseUrl: vi.fn().mockReturnThis(),
            setTokenUrl: vi.fn().mockReturnThis(),
            setClientId: vi.fn().mockReturnThis(),
            setClientSecret: vi.fn().mockReturnThis(),
            setCallbackFunction: vi.fn().mockReturnThis(),
            setPropertyStore: vi.fn().mockReturnThis(),
            setScope: vi.fn().mockReturnThis(),
            hasAccess: vi.fn(),
            getAccessToken: vi.fn(),
            handleCallback: vi.fn(),
            getAuthorizationUrl: vi.fn(),
            reset: vi.fn(),
        };
        return mockService;
    })
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
