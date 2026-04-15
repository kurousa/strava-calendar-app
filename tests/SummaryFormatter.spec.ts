import { describe, it, expect, vi } from 'vitest';

describe('SummaryFormatter', () => {
    const mockData = {
        totalDistanceKm: 100.5,
        totalMovingTimeMin: 630, // 10時間30分
        totalElevationGain: 1500,
        totalCalories: 3000,
        activityCount: 5,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-07'),
        longestActivity: {
            id: 123456,
            name: 'Sunday Long Run',
            distance: 30000,
            type: 'Run'
        }
    };

    it('週次サマリーが正しくフォーマットされること', () => {
        const result = formatSummaryReport(mockData, 'weekly');
        expect(result).toContain('今週のサマリーレポート');
        expect(result).toContain('2024/1/1 〜 2024/1/7');
        expect(result).toContain('100.5 km');
        expect(result).toContain('10時間30分');
        expect(result).toContain('1500 m');
        expect(result).toContain('3000 kcal');
        expect(result).toContain('最長アクティビティ');
        expect(result).toContain('Sunday Long Run (30.0 km)');
    });

    it('月次サマリーが正しくフォーマットされること', () => {
        const result = formatSummaryReport(mockData, 'monthly');
        expect(result).toContain('今月のサマリーレポート');
    });

    it('消費カロリーが0の場合は表示されないこと', () => {
        const dataWithoutCalories = { ...mockData, totalCalories: 0 };
        const result = formatSummaryReport(dataWithoutCalories, 'weekly');
        expect(result).not.toContain('総消費カロリー');
    });
});
