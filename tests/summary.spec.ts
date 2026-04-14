import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aggregateActivities, generateSummary } from '../summary';

describe('summary', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (global as any).getStravaActivities = vi.fn();
        (global as any).formatSummaryReport = vi.fn().mockReturnValue('mock report');
        (global as any).sendDiscordMessage = vi.fn();
    });

    describe('aggregateActivities', () => {
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-07');
        const activities = [
            { type: 'Run', distance: 10000, moving_time: 3600, total_elevation_gain: 100, calories: 500 },
            { type: 'Run', distance: 5000, moving_time: 1800, total_elevation_gain: 50, calories: 250 },
            { type: 'Ride', distance: 20000, moving_time: 3600, total_elevation_gain: 200, calories: 600 }
        ];

        it('should aggregate data correctly', () => {
            const result = aggregateActivities(activities, startDate, endDate);
            expect(result.totalDistance).toBe(35000);
            expect(result.totalMovingTime).toBe(9000);
            expect(result.totalElevationGain).toBe(350);
            expect(result.totalCalories).toBe(1350);
            expect(result.activityCount).toBe(3);
            expect(result.typeStats['Run'].count).toBe(2);
            expect(result.typeStats['Run'].distance).toBe(15000);
            expect(result.typeStats['Ride'].count).toBe(1);
            expect(result.typeStats['Ride'].distance).toBe(20000);
            expect(result.longestActivity).toEqual(activities[2]);
        });
    });

    describe('generateSummary', () => {
        it('should skip if no activities found', () => {
            (global as any).getStravaActivities.mockReturnValue([]);
            generateSummary('weekly');
            expect((global as any).sendDiscordMessage).not.toHaveBeenCalled();
        });

        it('should send summary if activities found', () => {
            (global as any).getStravaActivities.mockReturnValue([{ type: 'Run', distance: 1000 }]);
            generateSummary('weekly');
            expect((global as any).sendDiscordMessage).toHaveBeenCalledWith('mock report');
        });
    });
});
