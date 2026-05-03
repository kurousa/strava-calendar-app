import { vi } from 'vitest';
import * as DefaultFormatter from './formatters/DefaultFormatter.ts';
import * as RunFormatter from "./formatters/RunFormatter.ts";
import * as RideFormatter from "./formatters/RideFormatter.ts";
import * as NotifierModule from './notifier.ts';
import './const.ts';
import * as MainModule from './main.ts';
import * as AuthModule from './auth.ts';
import * as WeatherModule from './weather.ts';
import * as AiModule from './ai.ts';
import * as MapsModule from './maps.ts';
import * as SummaryFormatterModule from './formatters/SummaryFormatter.ts';
import * as SummaryModule from './summary.ts';
import * as TssModule from './tss.ts';
import * as DateFormatter from './formatters/date.ts';
import * as PresenterModule from './presenter.ts';
import * as CalendarModule from './calendar.ts';

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

    (global as any).Calendar = {
        Events: {
            patch: vi.fn(), list: vi.fn().mockReturnValue({ items: [] }),
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
            if (key === 'GEMINI_API_KEY') return 'fake_gemini_key';
            return null;
        })
    };

    (global as any).CacheService = {
        getUserCache: vi.fn(() => ({
            get: vi.fn(() => null),
            put: vi.fn(),
            remove: vi.fn()
        })),
        getScriptCache: vi.fn(() => ({
            get: vi.fn(() => null),
            put: vi.fn(),
            remove: vi.fn()
        }))
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

    (global as any).ContentService = {
        createTextOutput: vi.fn((content) => ({
            getContent: () => content,
            setMimeType: vi.fn().mockReturnThis(),
        })),
        MimeType: {
            JSON: 'JSON',
            CSV: 'CSV',
            HTML: 'HTML',
            JAVASCRIPT: 'JAVASCRIPT',
            TEXT: 'TEXT',
            XML: 'XML'
        }
    };

    (global as any).Session = {
        getEffectiveUser: vi.fn(() => ({
            getEmail: vi.fn(() => 'test@example.com')
        })),
        getScriptTimeZone: vi.fn(() => 'Asia/Tokyo')
    };

    (global as any).MailApp = {
        sendEmail: vi.fn()
    };

    (global as any).UrlFetchApp = {
        fetch: vi.fn(),
        fetchAll: vi.fn((requests: any[]) => {
            return requests.map(req => ({
                getResponseCode: () => 200,
                getContentText: () => JSON.stringify({
                    hourly: {
                        temperature_2m: new Array(24).fill(20),
                        weathercode: new Array(24).fill(0),
                        windspeed_10m: new Array(24).fill(10)
                    }
                })
            }));
        }),
    };

    (global as any).Maps = {
        newStaticMap: vi.fn(() => ({
            setSize: vi.fn().mockReturnThis(),
            setLanguage: vi.fn().mockReturnThis(),
            addPath: vi.fn().mockReturnThis(),
            getBlob: vi.fn(() => ({
                setName: vi.fn().mockReturnThis(),
            })),
        })),
    };

    (global as any).DriveApp = {
        getFoldersByName: vi.fn(() => ({
            hasNext: vi.fn(),
            next: vi.fn(),
        })),
        createFolder: vi.fn(() => ({
            createFile: vi.fn(() => ({
                setName: vi.fn().mockReturnThis(),
                setSharing: vi.fn().mockReturnThis(),
                getUrl: vi.fn(() => 'https://drive.google.com/map_file'),
            })),
            getFilesByName: vi.fn(() => ({
                hasNext: vi.fn(),
                next: vi.fn(),
            })),
        })),
        Access: {
            ANYONE_WITH_LINK: 'ANYONE_WITH_LINK',
        },
        Permission: {
            VIEW: 'VIEW',
        },
    };

    // Utilitiesのモック
    (global as any).Utilities = {
        sleep: vi.fn(),
        formatDate: (date: Date, timeZone: string, format: string) => {
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

// Globalize DefaultFormatter for testing
vi.stubGlobal('getCommonMetrics', vi.fn((DefaultFormatter as any).getCommonMetrics || (() => ({}))));
vi.stubGlobal('getActivityStyle', vi.fn((DefaultFormatter as any).getActivityStyle || (() => ({ color: "BLUE" }))));
vi.stubGlobal('makeDescription', vi.fn((DefaultFormatter as any).makeDescription || (() => "mock description")));

// Globalize Run/Ride formatters
vi.stubGlobal('makeRunDescription', vi.fn((RunFormatter as any).makeRunDescription || (() => "mock run desc")));
vi.stubGlobal('makeRideDescription', vi.fn((RideFormatter as any).makeRideDescription || (() => "mock ride desc")));

// Globalize main functions for tests
vi.stubGlobal('getTargetCalendar', vi.fn((CalendarModule as any).getTargetCalendar || vi.fn()));
vi.stubGlobal('processActivityToCalendar', vi.fn((CalendarModule as any).processActivityToCalendar || vi.fn()));
vi.stubGlobal('getExistingActivityIds', vi.fn((CalendarModule as any).getExistingActivityIds || vi.fn(() => new Set())));
vi.stubGlobal('sendSyncNotification', vi.fn((NotifierModule as any).sendSyncNotification || vi.fn()));
vi.stubGlobal('sendErrorEmail', vi.fn((NotifierModule as any).sendErrorEmail || vi.fn()));

// Globalize Strava API functions
vi.stubGlobal('getStravaActivities', vi.fn(() => []));
vi.stubGlobal('getStravaAthleteProfile', vi.fn());
vi.stubGlobal('getStravaActivity', vi.fn());
vi.stubGlobal('createStravaWebhookSubscription', vi.fn());
vi.stubGlobal('viewStravaWebhookSubscriptions', vi.fn(() => []));
vi.stubGlobal('deleteStravaWebhookSubscription', vi.fn());

// Globalize Auth functions
vi.stubGlobal('getOAuthService', vi.fn((AuthModule as any).getOAuthService || vi.fn()));
vi.stubGlobal('authCallback', vi.fn((AuthModule as any).authCallback || vi.fn()));
vi.stubGlobal('startAuth', vi.fn((AuthModule as any).startAuth || vi.fn()));
vi.stubGlobal('resetAuth', vi.fn((AuthModule as any).resetAuth || vi.fn()));
vi.stubGlobal('verifyGoogleToken', vi.fn((AuthModule as any).verifyGoogleToken || vi.fn()));

// Globalize Sheets functions
vi.stubGlobal('backupToSpreadsheet', vi.fn());

// Globalize fetchWeatherData for tests
vi.stubGlobal('fetchWeatherData', vi.fn((WeatherModule as any).fetchWeatherData || (() => "天気: ☀️ 晴れ / 気温: 20℃ / 風速: 2m/s")));
vi.stubGlobal('fetchWeatherDataBatch', vi.fn((WeatherModule as any).fetchWeatherDataBatch || vi.fn()));

// Globalize generateAiComment for tests
vi.stubGlobal('generateAiComment', vi.fn((AiModule as any).generateAiComment || (() => "ナイスラン！")));

// Globalize Maps functions for tests
vi.stubGlobal('saveMapToDrive', vi.fn((MapsModule as any).saveMapToDrive || vi.fn()));
vi.stubGlobal('getOrCreateMapFolder', vi.fn((MapsModule as any).getOrCreateMapFolder || vi.fn()));

// Globalize Summary functions
vi.stubGlobal('formatSummaryReport', vi.fn((SummaryFormatterModule as any).formatSummaryReport || vi.fn()));
vi.stubGlobal('generateSummary', vi.fn((SummaryModule as any).generateSummary || vi.fn()));
vi.stubGlobal('sendWeeklySummary', vi.fn((SummaryModule as any).sendWeeklySummary || vi.fn()));
vi.stubGlobal('sendMonthlySummary', vi.fn((SummaryModule as any).sendMonthlySummary || vi.fn()));
vi.stubGlobal('sendDiscordMessage', vi.fn((NotifierModule as any).sendDiscordMessage || vi.fn()));

// Globalize TSS functions
vi.stubGlobal('calculateTSS', vi.fn((TssModule as any).calculateTSS || vi.fn()));

// Globalize getActivityStartDate
vi.stubGlobal('getActivityStartDate', vi.fn((DateFormatter as any).getActivityStartDate || ((activity: any) => {
    return activity.start_date_local
        ? new Date(activity.start_date_local.replace(/Z$/i, ''))
        : new Date(activity.start_date);
})));

// Globalize presenter functions for tests
vi.stubGlobal('createResponse', vi.fn((PresenterModule as any).createResponse));
vi.stubGlobal('createHtmlResponse', vi.fn((PresenterModule as any).createHtmlResponse));
vi.stubGlobal('createHtmlPage', vi.fn((PresenterModule as any).createHtmlPage));

