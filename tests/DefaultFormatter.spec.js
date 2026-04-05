import { describe, it, expect } from 'vitest';
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
});
