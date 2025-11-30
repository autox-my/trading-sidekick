import { describe, it, expect } from 'vitest';
import {
    calculateSMA,
    calculateRSI,
    calculateATR,
    getVolatilityRegime
} from './calculations';

describe('calculations', () => {
    describe('calculateSMA', () => {
        it('should calculate SMA correctly', () => {
            const data = [10, 20, 30, 40, 50];
            const sma = calculateSMA(data, 3);
            // Last 3: 30, 40, 50 -> avg 40
            expect(sma).toBe(40);
        });

        it('should return null if not enough data', () => {
            const data = [10, 20];
            const sma = calculateSMA(data, 3);
            expect(sma).toBeNull();
        });
    });

    describe('calculateRSI', () => {
        it('should calculate RSI correctly', () => {
            // Simple uptrend
            const data = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
            const rsi = calculateRSI(data, 14);
            expect(rsi).toBeGreaterThan(50);
        });
    });

    describe('calculateATR', () => {
        it('should calculate ATR', () => {
            const candles = [
                { high: 10, low: 8, close: 9 },
                { high: 11, low: 9, close: 10 },
                { high: 12, low: 10, close: 11 },
                { high: 13, low: 11, close: 12 }
            ];
            const atr = calculateATR(candles, 3);
            expect(atr).toBeGreaterThan(0);
        });
    });

    describe('getVolatilityRegime', () => {
        it('should identify Compressed regime', () => {
            // Need enough data for baseline ATR (40 periods)
            const candles = Array(50).fill({ high: 10, low: 9, close: 9.5 });
            // Mocking calculateATR behavior by ensuring the function can run
            // But since we can't easily mock the internal call, we rely on the logic:
            // If we pass a huge currentATR, it should be Expanded.
            // If we pass a tiny currentATR, it should be Compressed.
            // However, baselineATR will be calculated from 'candles'.
            // With constant candles, ATR is constant (approx 1).

            const regime = getVolatilityRegime(0.1, candles); // 0.1 vs ~1.0 -> ratio 0.1 -> Compressed
            expect(regime).toBe('Compressed');
        });

        it('should identify Expanded regime', () => {
            const candles = Array(50).fill({ high: 10, low: 9, close: 9.5 });
            const regime = getVolatilityRegime(5, candles); // 5 vs ~1.0 -> ratio 5 -> Expanded
            expect(regime).toBe('Expanded');
        });
    });
});
