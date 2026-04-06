import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Google Apps Script global CalendarApp
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

import { makeDefaultDescription, getActivityStyle, makeDescription } from '../formatters/DefaultFormatter';
import { makeRideDescription } from '../formatters/RideFormatter';
import { makeRunDescription } from '../formatters/RunFormatter';

describe('DefaultFormatter', () => {
    describe('makeDefaultDescription', () => {
        it('should make default description', () => {
            const activity = {
                name: 'テストアクティビティ',
                distance: 10000,
                moving_time: 3600,
                total_elevation_gain: 100,
                has_heartrate: true,
                average_heartrate: 150,
                id: 123456789,
            };

            expect(makeDefaultDescription(activity)).toBe(`
距離: 10.0 km
時間: 60 分
獲得標高: 100 m
平均心拍数: 150 bpm

詳細: https://www.strava.com/activities/123456789
  `.trim());
        });
    });

    describe('getActivityStyle', () => {
        it('should return correct style for Walk', () => {
            expect(getActivityStyle('Walk')).toEqual({ emoji: '🚶', color: 'GREEN' });
        });

        it('should return correct style for Run', () => {
            expect(getActivityStyle('Run')).toEqual({ emoji: '🏃', color: 'BLUE' });
        });

        it('should return correct style for VirtualRun', () => {
            expect(getActivityStyle('VirtualRun')).toEqual({ emoji: '🏃', color: 'BLUE' });
        });

        it('should return correct style for Ride', () => {
            expect(getActivityStyle('Ride')).toEqual({ emoji: '🚴', color: 'RED' });
        });

        it('should return correct style for VirtualRide', () => {
            expect(getActivityStyle('VirtualRide')).toEqual({ emoji: '🚴', color: 'RED' });
        });

        it('should return correct style for Swim', () => {
            expect(getActivityStyle('Swim')).toEqual({ emoji: '🏊', color: 'CYAN' });
        });

        it('should return correct style for Hike', () => {
            expect(getActivityStyle('Hike')).toEqual({ emoji: '🥾', color: 'PALE_GREEN' });
        });

        it('should return correct style for Workout', () => {
            expect(getActivityStyle('Workout')).toEqual({ emoji: '🏋️', color: 'ORANGE' });
        });

        it('should return correct style for WeightTraining', () => {
            expect(getActivityStyle('WeightTraining')).toEqual({ emoji: '🏋️', color: 'ORANGE' });
        });

        it('should return default style for unknown type', () => {
            expect(getActivityStyle('Unknown')).toEqual({ emoji: '🏅', color: 'GRAY' });
        });
    });

    describe('makeDescription', () => {
        beforeEach(() => {
            // makeDescription internally calls global makeRideDescription and makeRunDescription
            // because in GAS they are in the same global scope.
            // We mock them globally for tests to verify routing behavior.
            global.makeRideDescription = vi.fn((activity) => `RIDE: ${activity.id}`);
            global.makeRunDescription = vi.fn((activity) => `RUN: ${activity.id}`);
        });

        afterEach(() => {
            delete global.makeRideDescription;
            delete global.makeRunDescription;
        });

        it('should delegate to makeRideDescription for Ride', () => {
            const activity = { type: 'Ride', id: 1 };
            const result = makeDescription(activity);
            expect(global.makeRideDescription).toHaveBeenCalledWith(activity);
            expect(result).toBe('RIDE: 1');
        });

        it('should delegate to makeRideDescription for VirtualRide', () => {
            const activity = { type: 'VirtualRide', id: 2 };
            const result = makeDescription(activity);
            expect(global.makeRideDescription).toHaveBeenCalledWith(activity);
            expect(result).toBe('RIDE: 2');
        });

        it('should delegate to makeRunDescription for Run', () => {
            const activity = { type: 'Run', id: 3 };
            const result = makeDescription(activity);
            expect(global.makeRunDescription).toHaveBeenCalledWith(activity);
            expect(result).toBe('RUN: 3');
        });

        it('should delegate to makeRunDescription for Walk', () => {
            const activity = { type: 'Walk', id: 4 };
            const result = makeDescription(activity);
            expect(global.makeRunDescription).toHaveBeenCalledWith(activity);
            expect(result).toBe('RUN: 4');
        });

        it('should fall back to makeDefaultDescription for other types (e.g. Swim)', () => {
            const activity = { type: 'Swim', id: 5, distance: 1000 };
            const result = makeDescription(activity);
            // Default description includes detailed formatting, we check part of it
            expect(result).toContain('距離: 1.0 km');
            expect(result).toContain('詳細: https://www.strava.com/activities/5');
            expect(global.makeRideDescription).not.toHaveBeenCalled();
            expect(global.makeRunDescription).not.toHaveBeenCalled();
        });
    });
});
