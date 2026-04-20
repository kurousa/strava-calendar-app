import { describe, it, expect } from 'vitest';
import { cn } from '../dashboard/src/lib/utils';

describe('utils', () => {
    describe('cn', () => {
        it('should merge basic class names', () => {
            expect(cn('class1', 'class2')).toBe('class1 class2');
        });

        it('should conditionally apply classes (clsx feature)', () => {
            expect(cn('base-class', { 'active-class': true, 'inactive-class': false })).toBe('base-class active-class');
        });

        it('should handle undefined, null, and empty string (clsx feature)', () => {
            expect(cn('base-class', undefined, null, '', 'another-class')).toBe('base-class another-class');
        });

        it('should merge tailwind classes properly (tailwind-merge feature)', () => {
            // px-2 and px-4 conflict, px-4 should win as it comes last
            expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
            // text-red-500 and text-blue-500 conflict, text-blue-500 should win
            expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
            // bg-white and bg-black conflict, bg-black should win
            expect(cn('bg-white', 'bg-black')).toBe('bg-black');
        });

        it('should combine clsx and twMerge features', () => {
            expect(
                cn(
                    'p-2 text-sm',
                    true && 'p-4', // 'p-4' overwrites 'p-2'
                    false && 'text-lg',
                    { 'bg-red-500': true, 'text-blue-500': true } // 'text-blue-500' SHOULD NOT overwrite 'text-sm' because they are different tailwind utility properties (color vs size)
                )
            ).toBe('text-sm p-4 bg-red-500 text-blue-500');
        });
    });
});
