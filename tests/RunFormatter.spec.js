import { describe, it, expect } from 'vitest';
import { makeRunDescription } from '../src/formatters/RunFormatter';

describe('RunFormatter', () => {
    it('should format run description with pace and heart rate', () => {
        const activity = {
            id: 111111,
            distance: 10000, // 10km
            moving_time: 3000, // 50 min
            total_elevation_gain: 100,
            has_heartrate: true,
            average_heartrate: 156,
            average_speed: 3.3333, // ~5:00/km (1000 / 3.3333 = 300 seconds)
        };

        const result = makeRunDescription(activity);
        expect(result).toBe(`
距離: 10.0 km
時間: 50 分
ペース: 5'00" /km
獲得標高: 100 m
平均心拍数: 156 bpm

詳細: https://www.strava.com/activities/111111
        `.trim());
    });

    it('should format run description without heart rate and speed', () => {
        const activity = {
            id: 222222,
            distance: 5000,
            moving_time: 1500,
            total_elevation_gain: 0,
            has_heartrate: false,
            average_speed: 0
        };

        const result = makeRunDescription(activity);
        expect(result).toBe(`
距離: 5.0 km
時間: 25 分
ペース: 測定なし
獲得標高: 0 m
平均心拍数: 測定なし

詳細: https://www.strava.com/activities/222222
        `.trim());
    });
});
