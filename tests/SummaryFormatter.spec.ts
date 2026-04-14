import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatSummaryReport, formatDuration } from '../formatters/SummaryFormatter';

describe('SummaryFormatter', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock getActivityStyle which is used in formatSummaryReport
        (global as any).getActivityStyle = vi.fn().mockImplementation((type) => {
            if (type === 'Run') return { emoji: '🏃' };
            if (type === 'Ride') return { emoji: '🚴' };
            return { emoji: '🏅' };
        });
    });

    describe('formatDuration', () => {
        it('should format seconds to H時間M分', () => {
            expect(formatDuration(3660)).toBe('1時間1分');
            expect(formatDuration(7200)).toBe('2時間0分');
        });

        it('should format seconds to M分 if less than 1 hour', () => {
            expect(formatDuration(600)).toBe('10分');
            expect(formatDuration(59)).toBe('0分');
        });
    });

    describe('formatSummaryReport', () => {
        const mockSummary = {
            totalDistance: 50000,
            totalMovingTime: 3600 * 5,
            totalElevationGain: 500,
            totalCalories: 2500,
            activityCount: 5,
            longestActivity: {
                name: 'Long Run',
                type: 'Run',
                distance: 20000,
                moving_time: 7200
            },
            typeStats: {
                'Run': { count: 3, distance: 30000, movingTime: 10800 },
                'Ride': { count: 2, distance: 20000, movingTime: 7200 }
            },
            // Use dates that are less likely to shift to another day due to timezone differences
            startDate: new Date(2024, 0, 1, 12, 0, 0),
            endDate: new Date(2024, 0, 7, 12, 0, 0)
        };

        it('should format weekly summary correctly', () => {
            const result = formatSummaryReport(mockSummary, 'weekly');
            expect(result).toContain('今週のサマリーレポート');
            expect(result).toContain('01/01 〜 01/07');
            expect(result).toContain('総走行距離: **50.0 km**');
            expect(result).toContain('総移動時間: **5時間0分**');
            expect(result).toContain('🏃 Run: 3 回 / 30.0 km');
            expect(result).toContain('🚴 Ride: 2 回 / 20.0 km');
            expect(result).toContain('最長のアクティビティ:');
            expect(result).toContain('🏃 Long Run (20.0 km / 2時間0分)');
        });

        it('should format monthly summary correctly', () => {
            const result = formatSummaryReport(mockSummary, 'monthly');
            expect(result).toContain('今月のサマリーレポート');
        });
    });
});
