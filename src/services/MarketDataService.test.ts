import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { marketDataService } from '../services/MarketDataService';

// Mock fetch
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

// Mock sonner toast
vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
    },
}));

describe('MarketDataService', () => {
    beforeEach(() => {
        fetchMock.mockReset();
        // Inject mock keys
        (marketDataService as any).twelveData.apiKey = 'mock-key';
        (marketDataService as any).tiingo.apiKey = 'mock-key';
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('getQuote', () => {
        it('should fetch quote from Twelve Data successfully', async () => {
            const mockResponse = {
                symbol: 'AAPL',
                close: '150.00',
                change: '1.50',
                percent_change: '1.00',
                timestamp: 1672531200
            };

            fetchMock.mockResolvedValueOnce({
                json: async () => mockResponse,
            });

            const quote = await marketDataService.getQuote('AAPL');

            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(quote).not.toBeNull();
            expect(quote?.source).toContain('Twelve Data');
        });

        it('should fallback to Tiingo if Twelve Data fails', async () => {
            // Twelve Data fails
            fetchMock.mockRejectedValueOnce(new Error('API Error'));

            // Tiingo succeeds
            const mockTiingoResponse = [{
                ticker: 'AAPL',
                last: 150.00,
                prevClose: 148.50,
                timestamp: '2023-01-01T00:00:00Z'
            }];

            fetchMock.mockResolvedValueOnce({
                json: async () => mockTiingoResponse,
            });

            const quote = await marketDataService.getQuote('AAPL');

            expect(fetchMock).toHaveBeenCalledTimes(2);
            expect(quote).not.toBeNull();
            expect(quote?.source).toContain('Tiingo');
        });

        it('should fallback to Yahoo if both Twelve Data and Tiingo fail', async () => {
            // Twelve Data fails
            fetchMock.mockRejectedValueOnce(new Error('Twelve Data Error'));
            // Tiingo fails
            fetchMock.mockRejectedValueOnce(new Error('Tiingo Error'));

            // Yahoo succeeds
            const mockYahooResponse = {
                chart: {
                    result: [{
                        meta: {
                            regularMarketPrice: 150.00,
                            chartPreviousClose: 148.50,
                            regularMarketTime: 1672531200
                        }
                    }]
                }
            };

            fetchMock.mockResolvedValueOnce({
                json: async () => mockYahooResponse,
            });

            const quote = await marketDataService.getQuote('AAPL');

            expect(fetchMock).toHaveBeenCalledTimes(3);
            expect(quote).not.toBeNull();
            expect(quote?.source).toContain('Yahoo');
        });
    });

    describe('getCandles', () => {
        it('should fetch candles from Twelve Data successfully', async () => {
            const mockResponse = {
                values: [
                    { datetime: '2023-01-01', open: '100', high: '110', low: '90', close: '105', volume: '1000' }
                ]
            };

            fetchMock.mockResolvedValueOnce({
                json: async () => mockResponse,
            });
            // Tiingo promise is also created in parallel, so we need to handle that mock too?
            // The service calls both in parallel:
            // const twelveDataPromise = ...
            // const tiingoPromise = ...
            // So fetch will be called twice immediately!

            // We need to mock both responses.
            // 1. Twelve Data (success)
            // 2. Tiingo (doesn't matter, but fetch is called)

            // Actually, since they are parallel, the order of execution of fetch depends on the runtime, 
            // but usually they start almost simultaneously.
            // We should provide mocks for both.

            fetchMock
                .mockResolvedValueOnce({ json: async () => mockResponse }) // Twelve Data
                .mockResolvedValueOnce({ json: async () => [] }); // Tiingo (unused but called)

            const { candles, source } = await marketDataService.getCandles('AAPL', '1d', '1mo');

            expect(candles.length).toBeGreaterThan(0);
            expect(source).toBe('Twelve Data');
        });

        it('should fallback to Tiingo if Twelve Data fails', async () => {
            // Twelve Data fails
            // Tiingo succeeds

            // Since they run in parallel, we need to be careful with mockResolvedValueOnce order.
            // However, usually the first call in code triggers the first mock.
            // Twelve Data is called first in code.

            fetchMock
                .mockRejectedValueOnce(new Error('Twelve Data Error')) // Twelve Data
                .mockResolvedValueOnce({ // Tiingo
                    json: async () => [{
                        date: '2023-01-01', open: 100, high: 110, low: 90, close: 105, volume: 1000
                    }]
                });

            const { candles, source } = await marketDataService.getCandles('AAPL', '1d', '1mo');

            expect(candles.length).toBeGreaterThan(0);
            expect(source).toBe('Tiingo');
        });

        it('should fallback to Yahoo if both Twelve Data and Tiingo fail', async () => {
            // Twelve Data fails
            // Tiingo fails
            // Yahoo is called AFTER both await

            fetchMock
                .mockRejectedValueOnce(new Error('Twelve Data Error')) // Twelve Data
                .mockRejectedValueOnce(new Error('Tiingo Error')) // Tiingo
                .mockResolvedValueOnce({ // Yahoo
                    json: async () => ({
                        chart: {
                            result: [{
                                timestamp: [1672531200],
                                indicators: {
                                    quote: [{
                                        open: [100], high: [110], low: [90], close: [105], volume: [1000]
                                    }]
                                }
                            }]
                        }
                    })
                });

            const { candles, source } = await marketDataService.getCandles('AAPL', '1d', '1mo');

            expect(candles.length).toBeGreaterThan(0);
            expect(source).toBe('Yahoo Finance');
        });

        it('should return empty if all fail', async () => {
            fetchMock
                .mockRejectedValueOnce(new Error('Twelve Data Error'))
                .mockRejectedValueOnce(new Error('Tiingo Error'))
                .mockRejectedValueOnce(new Error('Yahoo Error'));

            const { candles, source } = await marketDataService.getCandles('AAPL', '1d', '1mo');

            expect(candles).toEqual([]);
            expect(source).toBe('None');
        });
    });
});
