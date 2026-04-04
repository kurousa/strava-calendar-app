import { describe, it } from 'vitest';
import { makeDefaultDescription } from '../formatters/DefaultFormatter';

describe('DefaultFormatter', () => {
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