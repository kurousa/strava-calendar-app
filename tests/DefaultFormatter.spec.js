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

import { getCommonMetrics, makeDefaultDescription, getActivityStyle, makeDescription } from '../formatters/DefaultFormatter';

describe('DefaultFormatter', () => {
    describe('getCommonMetrics', () => {
        it('should calculate metrics for a complete activity object', () => {
            const activity = {
                distance: 12345,
                moving_time: 3675,
                total_elevation_gain: 150,
                has_heartrate: true,
                average_heartrate: 145
            };
            const metrics = getCommonMetrics(activity);
            expect(metrics).toEqual({
                distanceKm: '12.3',
                timeMin: 61,
                elevation: 150,
                hr: '145 bpm'
            });
        });

        it('should handle missing or null optional fields with defaults', () => {
            const activity = {
                distance: null,
                moving_time: null,
                total_elevation_gain: null,
                has_heartrate: null
            };
            const metrics = getCommonMetrics(activity);
            expect(metrics).toEqual({
                distanceKm: '0.0',
                timeMin: 0,
                elevation: 0,
                hr: '測定なし'
            });
        });

        it('should handle heart rate when has_heartrate is false', () => {
            const activity = {
                has_heartrate: false,
                average_heartrate: 145 // Should be ignored
            };
            const metrics = getCommonMetrics(activity);
            expect(metrics.hr).toBe('測定なし');
        });

        it('should handle heart rate when has_heartrate is true', () => {
            const activity = {
                has_heartrate: true,
                average_heartrate: 160
            };
            const metrics = getCommonMetrics(activity);
            expect(metrics.hr).toBe('160 bpm');
        });

        it('should handle heart rate when has_heartrate is true but average_heartrate is missing', () => {
            const activity = {
                has_heartrate: true,
                average_heartrate: null
            };
            const metrics = getCommonMetrics(activity);
            // Based on implementation: activity.average_heartrate + ' bpm'
            // null + ' bpm' -> "null bpm"
            expect(metrics.hr).toBe('null bpm');
        });

        it('should handle zero values for distance, time, and elevation', () => {
            const activity = {
                distance: 0,
                moving_time: 0,
                total_elevation_gain: 0
            };
            const metrics = getCommonMetrics(activity);
            expect(metrics.distanceKm).toBe('0.0');
            expect(metrics.timeMin).toBe(0);
            expect(metrics.elevation).toBe(0);
        });
    });

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
        const styleTestCases = [
            ['Walk', { emoji: '🚶', color: 'GREEN' }],
            ['Run', { emoji: '🏃', color: 'BLUE' }],
            ['VirtualRun', { emoji: '🏃', color: 'BLUE' }],
            ['Ride', { emoji: '🚴', color: 'RED' }],
            ['VirtualRide', { emoji: '🚴', color: 'RED' }],
            ['Swim', { emoji: '🏊', color: 'CYAN' }],
            ['Hike', { emoji: '🥾', color: 'PALE_GREEN' }],
            ['Workout', { emoji: '🏋️', color: 'ORANGE' }],
            ['WeightTraining', { emoji: '🏋️', color: 'ORANGE' }],
            ['Unknown', { emoji: '🏅', color: 'GRAY' }] // Default case
        ];

        it.each(styleTestCases)('should return correct style for %s', (type, expectedStyle) => {
            expect(getActivityStyle(type)).toEqual(expectedStyle);
        });

        it('should return an immutable (frozen) object to prevent cache side-effects', () => {
            const style = getActivityStyle('Run');

            // Verify the object is frozen
            expect(Object.isFrozen(style)).toBe(true);

            // Attempting to mutate a frozen object should throw a TypeError in strict mode.
            expect(() => {
                'use strict';
                style.emoji = '🚀';
            }).toThrow(TypeError);
        });
    });

    describe('makeDescription', () => {
        beforeEach(() => {
            // makeDescription internally calls global makeRideDescription and makeRunDescription
            // because in GAS they are in the same global scope.
            // We mock them globally for tests to verify routing behavior.
            vi.stubGlobal('makeRideDescription', vi.fn((activity) => `RIDE: ${activity.id}`));
            vi.stubGlobal('makeRunDescription', vi.fn((activity) => `RUN: ${activity.id}`));
        });

        afterEach(() => {
            vi.unstubAllGlobals();
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
