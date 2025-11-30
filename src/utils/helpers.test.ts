import { describe, it, expect } from 'vitest';
import { hexToRgba, mergePriceLevels, detectPatterns } from './helpers';

describe('helpers', () => {
    describe('hexToRgba', () => {
        it('should convert hex to rgba', () => {
            expect(hexToRgba('#ffffff', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
            expect(hexToRgba('#000000', 1)).toBe('rgba(0, 0, 0, 1)');
        });
    });

    describe('mergePriceLevels', () => {
        it('should merge close levels', () => {
            const support = 100;
            const resistance = 101; // Close enough to merge if threshold is > 1
            const darkPools = [{ price: 100.5, totalPremium: 1000000 }];

            const merged = mergePriceLevels(support, resistance, darkPools, 2);
            expect(merged.length).toBeLessThan(3);
        });
    });

    describe('detectPatterns', () => {
        it('should detect Hammer pattern', () => {
            const dummy = Array(30).fill({ open: 10, high: 11, low: 9, close: 10 });
            const candles = [
                ...dummy,
                { open: 10, high: 10.1, low: 5, close: 9.5 } // Long lower wick, small body near top, very small upper wick
            ];
            const patterns = detectPatterns(candles);
            expect(patterns).toContain('Hammer');
        });
    });
});
