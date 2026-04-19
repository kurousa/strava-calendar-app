import { describe, it, expect } from 'vitest';
import { cn } from '../../src/lib/utils';

describe('utils', () => {
  describe('cn', () => {
    it('merges standard class names', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
    });

    it('handles conditional class names with clsx', () => {
      expect(cn('class1', true && 'class2', false && 'class3')).toBe('class1 class2');
      expect(cn({ 'class1': true, 'class2': false })).toBe('class1');
    });

    it('merges conflicting tailwind classes with tailwind-merge', () => {
      // p-4 and p-8 are both padding classes, tailwind-merge should resolve to the latter
      expect(cn('p-4', 'p-8')).toBe('p-8');
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });

    it('handles arrays of classes', () => {
      expect(cn(['class1', 'class2'], 'class3')).toBe('class1 class2 class3');
    });

    it('handles undefined and null gracefully', () => {
      expect(cn('class1', undefined, null, 'class2')).toBe('class1 class2');
    });
  });
});
