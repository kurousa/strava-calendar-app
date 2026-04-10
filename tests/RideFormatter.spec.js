import { describe, it, expect } from 'vitest';
import { makeRideDescription } from '../src/formatters/RideFormatter';

describe('RideFormatter', () => {
    it('should format ride description with all fields', () => {
        const activity = {
            id: 123456,
            distance: 40000, // 40km
            moving_time: 7200, // 2 hours = 120 min
            total_elevation_gain: 500,
            has_heartrate: true,
            average_heartrate: 140,
            average_speed: 5.555, // ~20km/h (5.555 * 3.6 = 19.998)
            average_watts: 200,
            average_cadence: 90
        };

        const result = makeRideDescription(activity);
        expect(result).toBe(`
距離: 40.0 km
時間: 120 分
平均速度: 20.0 km/h
獲得標高: 500 m
平均心拍数: 140 bpm
平均パワー: 200 W
平均ケイデンス: 90 rpm
詳細: https://www.strava.com/activities/123456
        `.trim());
    });

    it('should format ride description with minimum fields', () => {
        const activity = {
            id: 789012,
            distance: 10000,
            moving_time: 1800,
            total_elevation_gain: 0,
            has_heartrate: false,
            average_speed: 5.555,
        };

        const result = makeRideDescription(activity);
        // Note: per current RideFormatter.ts, no blank line before "詳細" if watts/cadence are empty
        expect(result).toBe(`
距離: 10.0 km
時間: 30 分
平均速度: 20.0 km/h
獲得標高: 0 m
平均心拍数: 測定なし
詳細: https://www.strava.com/activities/789012
        `.trim());
    });
});
