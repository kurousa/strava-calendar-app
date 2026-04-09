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

import { deepFreeze, makeDefaultDescription, getActivityStyle, makeDescription } from '../formatters/DefaultFormatter';

describe('DefaultFormatter', () => {

    describe('deepFreeze', () => {
        it('should freeze a simple object', () => {
            const obj = { a: 1, b: 2 };
            const frozen = deepFreeze(obj);
            expect(Object.isFrozen(frozen)).toBe(true);
            expect(() => {
                'use strict';
                frozen.a = 3;
            }).toThrow(TypeError);
        });

        it('should deeply freeze nested objects', () => {
            const obj = {
                a: 1,
                nested: {
                    b: 2,
                    deep: {
                        c: 3
                    }
                }
            };
            const frozen = deepFreeze(obj);

            expect(Object.isFrozen(frozen)).toBe(true);
            expect(Object.isFrozen(frozen.nested)).toBe(true);
            expect(Object.isFrozen(frozen.nested.deep)).toBe(true);

            expect(() => {
                'use strict';
                frozen.nested.b = 4;
            }).toThrow(TypeError);

            expect(() => {
                'use strict';
                frozen.nested.deep.c = 5;
            }).toThrow(TypeError);
        });

        it('should deeply freeze arrays', () => {
            const arr = [1, { a: 2 }, [3, 4]];
            const frozen = deepFreeze(arr);

            expect(Object.isFrozen(frozen)).toBe(true);
            expect(Object.isFrozen(frozen[1])).toBe(true);
            expect(Object.isFrozen(frozen[2])).toBe(true);

            expect(() => {
                'use strict';
                frozen[0] = 5;
            }).toThrow(TypeError);

            expect(() => {
                'use strict';
                frozen[1].a = 6;
            }).toThrow(TypeError);

            expect(() => {
                'use strict';
                frozen[2].push(5);
            }).toThrow(TypeError);
        });

        it('should handle null and primitive values gracefully', () => {
            const obj = {
                a: null,
                b: undefined,
                c: 'string',
                d: 123,
                e: true
            };
            const frozen = deepFreeze(obj);

            expect(Object.isFrozen(frozen)).toBe(true);
            expect(frozen.a).toBeNull();
            expect(frozen.b).toBeUndefined();
        });

        it('should handle objects that are already partially frozen', () => {
             const obj = {
                 a: Object.freeze({ b: 1 }),
                 c: { d: 2 }
             };

             const frozen = deepFreeze(obj);
             expect(Object.isFrozen(frozen)).toBe(true);
             expect(Object.isFrozen(frozen.a)).toBe(true);
             expect(Object.isFrozen(frozen.c)).toBe(true);
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

    describe('initStyles', () => {
        it('should correctly initialize ACTIVITY_STYLES_CACHE and DEFAULT_ACTIVITY_STYLE_CACHE', async () => {
            // Use dynamic import and resetModules to get the fresh getters
            vi.resetModules();
            const formatter = await import('../formatters/DefaultFormatter.js');

            formatter.initStyles();

            // Verify that cache is not null
            expect(formatter.ACTIVITY_STYLES_CACHE).not.toBeNull();
            expect(formatter.DEFAULT_ACTIVITY_STYLE_CACHE).not.toBeNull();

            // Verify DEFAULT_ACTIVITY_STYLE_CACHE contents and that it is frozen
            expect(formatter.DEFAULT_ACTIVITY_STYLE_CACHE).toEqual({ emoji: '🏅', color: 'GRAY' });
            expect(Object.isFrozen(formatter.DEFAULT_ACTIVITY_STYLE_CACHE)).toBe(true);

            // Verify some ACTIVITY_STYLES_CACHE contents
            expect(formatter.ACTIVITY_STYLES_CACHE['Run']).toEqual({ emoji: '🏃', color: 'BLUE' });
            expect(formatter.ACTIVITY_STYLES_CACHE['Ride']).toEqual({ emoji: '🚴', color: 'RED' });
            expect(formatter.ACTIVITY_STYLES_CACHE['Swim']).toEqual({ emoji: '🏊', color: 'CYAN' });
            expect(formatter.ACTIVITY_STYLES_CACHE['Workout']).toEqual({ emoji: '🏋️', color: 'ORANGE' });

            // Verify that ACTIVITY_STYLES_CACHE itself is frozen
            expect(Object.isFrozen(formatter.ACTIVITY_STYLES_CACHE)).toBe(true);

            // Verify that nested objects inside ACTIVITY_STYLES_CACHE are also frozen (deep freeze)
            expect(Object.isFrozen(formatter.ACTIVITY_STYLES_CACHE['Run'])).toBe(true);

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
