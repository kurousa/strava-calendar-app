import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as DefaultFormatter from '../src/formatters/DefaultFormatter';
import * as RideFormatter from '../src/formatters/RideFormatter';
import * as RunFormatter from '../src/formatters/RunFormatter';

describe('DefaultFormatter', () => {
    describe('getCommonMetrics', () => {
        it('should correctly extract metrics', () => {
            const activity = {
                distance: 10000,
                moving_time: 3600,
                total_elevation_gain: 100,
                has_heartrate: true,
                average_heartrate: 150
            };
            const result = DefaultFormatter.getCommonMetrics(activity);
            expect(result.distanceKm).toBe('10.0');
            expect(result.timeMin).toBe(60);
            expect(result.elevation).toBe(100);
            expect(result.hr).toBe('150 bpm');
        });
    });

    describe('makeDefaultDescription', () => {
        it('should make default description', () => {
            const activity = {
                id: 123,
                distance: 10000,
                moving_time: 3600,
                total_elevation_gain: 100,
                has_heartrate: true,
                average_heartrate: 150
            };
            const result = DefaultFormatter.makeDefaultDescription(activity);
            expect(result).toContain('距離: 10.0 km');
            expect(result).toContain('時間: 60 分');
            expect(result).toContain('獲得標高: 100 m');
            expect(result).toContain('平均心拍数: 150 bpm');
            expect(result).toContain('https://www.strava.com/activities/123');
        });
    });

    describe('getActivityStyle', () => {
        beforeEach(() => {
            vi.resetModules();
        });

        it('should return correct style for Walk', async () => {
            const { getActivityStyle } = await import('../src/formatters/DefaultFormatter');
            expect(getActivityStyle('Walk')).toEqual({ emoji: '🚶', color: 'GREEN' });
        });

        it('should return correct style for Run', async () => {
            const { getActivityStyle } = await import('../src/formatters/DefaultFormatter');
            expect(getActivityStyle('Run')).toEqual({ emoji: '🏃', color: 'BLUE' });
        });

        it('should return correct style for VirtualRun', async () => {
            const { getActivityStyle } = await import('../src/formatters/DefaultFormatter');
            expect(getActivityStyle('VirtualRun')).toEqual({ emoji: '🏃', color: 'BLUE' });
        });

        it('should return correct style for Ride', async () => {
            const { getActivityStyle } = await import('../src/formatters/DefaultFormatter');
            expect(getActivityStyle('Ride')).toEqual({ emoji: '🚴', color: 'RED' });
        });

        it('should return correct style for VirtualRide', async () => {
            const { getActivityStyle } = await import('../src/formatters/DefaultFormatter');
            expect(getActivityStyle('VirtualRide')).toEqual({ emoji: '🚴', color: 'RED' });
        });

        it('should return correct style for Swim', async () => {
            const { getActivityStyle } = await import('../src/formatters/DefaultFormatter');
            expect(getActivityStyle('Swim')).toEqual({ emoji: '🏊', color: 'CYAN' });
        });

        it('should return correct style for Hike', async () => {
            const { getActivityStyle } = await import('../src/formatters/DefaultFormatter');
            expect(getActivityStyle('Hike')).toEqual({ emoji: '🥾', color: 'PALE_GREEN' });
        });

        it('should return correct style for Workout', async () => {
            const { getActivityStyle } = await import('../src/formatters/DefaultFormatter');
            expect(getActivityStyle('Workout')).toEqual({ emoji: '🏋️', color: 'ORANGE' });
        });

        it('should return correct style for WeightTraining', async () => {
            const { getActivityStyle } = await import('../src/formatters/DefaultFormatter');
            expect(getActivityStyle('WeightTraining')).toEqual({ emoji: '🏋️', color: 'ORANGE' });
        });

        it('should return correct style for Unknown', async () => {
            const { getActivityStyle } = await import('../src/formatters/DefaultFormatter');
            expect(getActivityStyle('Unknown')).toEqual({ emoji: '🏅', color: 'GRAY' });
        });

        it('should return an immutable (frozen) object to prevent cache side-effects', async () => {
            const { getActivityStyle } = await import('../src/formatters/DefaultFormatter');
            const style = getActivityStyle('Walk');
            expect(Object.isFrozen(style)).toBe(true);
        });
    });

    describe('makeDescription', () => {
        beforeEach(() => {
            vi.clearAllMocks();
            vi.spyOn(RideFormatter, 'makeRideDescription').mockReturnValue('RIDE: mock');
            vi.spyOn(RunFormatter, 'makeRunDescription').mockReturnValue('RUN: mock');
        });

        it('should delegate to makeRideDescription for Ride', () => {
            const activity = { type: 'Ride', id: 1 };
            const result = DefaultFormatter.makeDescription(activity);
            expect(RideFormatter.makeRideDescription).toHaveBeenCalledWith(activity);
            expect(result).toBe('RIDE: mock');
        });

        it('should delegate to makeRideDescription for VirtualRide', () => {
            const activity = { type: 'VirtualRide', id: 2 };
            const result = DefaultFormatter.makeDescription(activity);
            expect(RideFormatter.makeRideDescription).toHaveBeenCalledWith(activity);
            expect(result).toBe('RIDE: mock');
        });

        it('should delegate to makeRunDescription for Run', () => {
            const activity = { type: 'Run', id: 3 };
            const result = DefaultFormatter.makeDescription(activity);
            expect(RunFormatter.makeRunDescription).toHaveBeenCalledWith(activity);
            expect(result).toBe('RUN: mock');
        });

        it('should delegate to makeRunDescription for Walk', () => {
            const activity = { type: 'Walk', id: 4 };
            const result = DefaultFormatter.makeDescription(activity);
            expect(RunFormatter.makeRunDescription).toHaveBeenCalledWith(activity);
            expect(result).toBe('RUN: mock');
        });

        it('should fall back to makeDefaultDescription for other types (e.g. Swim)', () => {
            const activity = { type: 'Swim', id: 5, distance: 1000 };
            const result = DefaultFormatter.makeDescription(activity);
            expect(RideFormatter.makeRideDescription).not.toHaveBeenCalled();
            expect(RunFormatter.makeRunDescription).not.toHaveBeenCalled();
            expect(result).toContain('距離: 1.0 km');
        });
    });
});
