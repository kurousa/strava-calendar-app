import { describe, it, expect } from 'vitest';
// @ts-ignore
import { calculateTSS } from '../tss';

describe('tss', () => {
    it('should calculate TSS correctly for a standard workout', () => {
        // 1 hour (3600s), avgHR=155, maxHR=190, restHR=50
        // Intensive = (155-50)/(190-50) = 105/140 = 0.75
        // TSS = (3600 * 0.75^2) / 3600 * 100 = 0.75^2 * 100 = 0.5625 * 100 = 56.25
        // Rounding to 56
        const result = calculateTSS(3600, 155, 190, 50);
        expect(result).toBe(56);
    });

    it('should return 100 for a 1-hour maximal effort', () => {
        // intensity = (190-50)/(190-50) = 1.0
        // TSS = (3600 * 1^2) / 3600 * 100 = 100
        const result = calculateTSS(3600, 190, 190, 50);
        expect(result).toBe(100);
    });

    it('should return 0 if heart rate is missing', () => {
        expect(calculateTSS(3600, 0, 190, 50)).toBe(0);
        expect(calculateTSS(3600, 155, 0, 50)).toBe(0);
    });
});
