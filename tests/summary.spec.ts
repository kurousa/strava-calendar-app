import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('summary.ts', () => {
    const mockActivities = [
        { id: 1, distance: 5000, moving_time: 1800, total_elevation_gain: 100, calories: 300, type: 'Run', name: 'Morning Run' },
        { id: 2, distance: 15000, moving_time: 5400, total_elevation_gain: 300, calories: 900, type: 'Ride', name: 'Lunch Ride' },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        // global.sendDiscordMessage をスパイ化
        global.sendDiscordMessage = vi.fn();
    });

    describe('generateSummary', () => {
        it('アクティビティを正しく集計すること', () => {
            (global as any).getStravaActivities.mockReturnValue(mockActivities);
            const start = new Date('2024-01-01');
            const end = new Date('2024-01-07');

            const result = generateSummary(start, end);

            expect(result.totalDistanceKm).toBe(20); // 5 + 15
            expect(result.totalMovingTimeMin).toBe(120); // 30 + 90
            expect(result.totalElevationGain).toBe(400); // 100 + 300
            expect(result.totalCalories).toBe(1200); // 300 + 900
            expect(result.activityCount).toBe(2);
            expect(result.longestActivity.id).toBe(2);
        });

        it('アクティビティがない場合、空の集計結果を返すこと', () => {
            (global as any).getStravaActivities.mockReturnValue([]);
            const result = generateSummary(new Date(), new Date());
            expect(result.activityCount).toBe(0);
            expect(result.totalDistanceKm).toBe(0);
            expect(result.longestActivity).toBeNull();
        });
    });

    describe('sendWeeklySummary', () => {
        it('アクティビティがある場合、Discordに通知すること', () => {
            (global as any).getStravaActivities.mockReturnValue(mockActivities);
            sendWeeklySummary();
            expect(global.sendDiscordMessage).toHaveBeenCalled();
        });

        it('アクティビティがない場合、Discordに通知しないこと', () => {
            (global as any).getStravaActivities.mockReturnValue([]);
            sendWeeklySummary();
            expect(global.sendDiscordMessage).not.toHaveBeenCalled();
        });
    });
});
