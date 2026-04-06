import { describe, it, expect } from 'vitest';

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

import { makeDefaultDescription, getActivityStyle } from '../formatters/DefaultFormatter';

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
});
