import { describe, it, expect, vi, beforeEach } from 'vitest';

// mock GAS globals
const ContentServiceMock = {
    createTextOutput: vi.fn().mockReturnThis(),
    setMimeType: vi.fn().mockReturnThis(),
    MimeType: {
        JSON: 'application/json'
    }
};
vi.stubGlobal('ContentService', ContentServiceMock);

// Mock api.ts functions
const getStravaActivityMock = vi.fn();
const createStravaWebhookSubscriptionMock = vi.fn();
const viewStravaWebhookSubscriptionsMock = vi.fn();
const deleteStravaWebhookSubscriptionMock = vi.fn();

vi.stubGlobal('getStravaActivity', getStravaActivityMock);
vi.stubGlobal('createStravaWebhookSubscription', createStravaWebhookSubscriptionMock);
vi.stubGlobal('viewStravaWebhookSubscriptions', viewStravaWebhookSubscriptionsMock);
vi.stubGlobal('deleteStravaWebhookSubscription', deleteStravaWebhookSubscriptionMock);

// Mock main.ts functions that are called
const getTargetCalendarMock = vi.fn();
const processActivityToCalendarMock = vi.fn();
const sendSyncNotificationMock = vi.fn();

vi.stubGlobal('getTargetCalendar', getTargetCalendarMock);
vi.stubGlobal('processActivityToCalendar', processActivityToCalendarMock);
vi.stubGlobal('sendSyncNotification', sendSyncNotificationMock);


import { doGet, doPost } from '../router';
import { handleStravaWebhook } from '../webhook';

describe('Strava Webhook Handling', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Mock PropertiesService for verification token
        const scriptPropertiesMock = (global as any).PropertiesService.getScriptProperties();
        scriptPropertiesMock.getProperty.mockImplementation((key: string) => {
            if (key === 'STRAVA_WEBHOOK_VERIFY_TOKEN') return 'MY_SECRET_TOKEN';
            return null;
        });
    });

    describe('doGet', () => {
        it('should handle validation request from Strava', () => {
            const e = {
                parameter: {
                    'hub.mode': 'subscribe',
                    'hub.verify_token': 'MY_SECRET_TOKEN',
                    'hub.challenge': 'challenge_123'
                }
            };

            doGet(e);

            expect(ContentServiceMock.createTextOutput).toHaveBeenCalledWith(JSON.stringify({ "hub.challenge": "challenge_123" }));
            expect(ContentServiceMock.setMimeType).toHaveBeenCalledWith('application/json');
        });

        it('should ignore validation request with wrong token', () => {
            const e = {
                parameter: {
                    'hub.mode': 'subscribe',
                    'hub.verify_token': 'WRONG_TOKEN',
                    'hub.challenge': 'challenge_123'
                }
            };

            const result = doGet(e);
            // Should return HTML output (mocked in vitest.setup.ts)
            expect(ContentServiceMock.createTextOutput).not.toHaveBeenCalled();
            expect(result).toBeDefined();
        });
    });

    describe('doPost', () => {
        it('should parse webhook event and call handleStravaWebhook', async () => {
            const event = {
                aspect_type: 'create',
                object_type: 'activity',
                object_id: 12345
            };
            const e = {
                postData: {
                    contents: JSON.stringify(event)
                }
            };

            // Set up globals as they are used in main.ts
            vi.stubGlobal('getStravaActivity', getStravaActivityMock);
            vi.stubGlobal('getTargetCalendar', getTargetCalendarMock);
            vi.stubGlobal('processActivityToCalendar', processActivityToCalendarMock);
            vi.stubGlobal('sendSyncNotification', sendSyncNotificationMock);

            // Mock getStravaActivity to return something so handleStravaWebhook doesn't fail
            getStravaActivityMock.mockReturnValue({ id: 12345, name: 'Test Activity' });
            getTargetCalendarMock.mockReturnValue({});

            // handleStravaWebhook is now called via global
            const handleStravaWebhookMock = vi.fn();
            vi.stubGlobal('handleStravaWebhook', handleStravaWebhookMock);

            doPost(e);

            expect(handleStravaWebhookMock).toHaveBeenCalledWith(event);
            expect(ContentServiceMock.createTextOutput).toHaveBeenCalledWith(JSON.stringify({ status: 'ok' }));
        });

        it('should return error status on failure', () => {
            const e = {
                postData: {
                    contents: 'invalid json'
                }
            };

            doPost(e);

            expect(ContentServiceMock.createTextOutput).toHaveBeenCalledWith(expect.stringContaining('"status":"error"'));
        });
    });

    describe('handleStravaWebhook', () => {
        it('should process new activity creation', async () => {
            const event: any = {
                aspect_type: 'create',
                object_type: 'activity',
                object_id: 12345
            };

            const mockActivity = { id: 12345, name: 'New Activity' };
            const mockCalendar = { getName: () => 'Test Calendar' };

            getStravaActivityMock.mockReturnValue(mockActivity);
            getTargetCalendarMock.mockReturnValue(mockCalendar);
            processActivityToCalendarMock.mockReturnValue('success');

            // Set up globals as they are used in main.ts
            vi.stubGlobal('getStravaActivity', getStravaActivityMock);
            vi.stubGlobal('getTargetCalendar', getTargetCalendarMock);
            vi.stubGlobal('processActivityToCalendar', processActivityToCalendarMock);
            vi.stubGlobal('sendSyncNotification', sendSyncNotificationMock);

            handleStravaWebhook(event);

            expect(getStravaActivityMock).toHaveBeenCalledWith(12345);
            expect(getTargetCalendarMock).toHaveBeenCalled();
            expect(processActivityToCalendarMock).toHaveBeenCalledWith(mockActivity, mockCalendar);
            expect(sendSyncNotificationMock).toHaveBeenCalledWith(1, 0, false);
        });

        it('should ignore update events for now', () => {
            const event: any = {
                aspect_type: 'update',
                object_type: 'activity',
                object_id: 12345
            };

            handleStravaWebhook(event);

            expect(getStravaActivityMock).not.toHaveBeenCalled();
        });
    });
});
