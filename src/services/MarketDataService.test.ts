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
        (marketDataService as any).alpaca.apiKey = 'mock-key';
        (marketDataService as any).alpaca.secretKey = 'mock-secret';
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('getQuote', () => {
        it('should fetch quote from Alpaca successfully', async () => {
            const mockSnapshotResponse = {
                latestTrade: { p: 155.00, t: '2023-01-01T00:00:00Z' },
                prevDailyBar: { c: 150.00 },
                dailyBar: { c: 155.00 }
            };

            // First call is to IEX latest quote (which we skip checking explicitly in this test structure if we just mock the first fetch call, 
            // but the code calls fetch twice? No, wait. 
            // AlpacaProvider.getQuote calls:
            // 1. fetch(`${this.dataUrl}/iex/stocks/${symbol}/quotes/latest?feed=iex`...)
            // 2. fetch(`${this.dataUrl}/stocks/${symbol}/snapshot?feed=iex`...)

            // We need to mock both sequential calls
            fetchMock
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ quote: { ap: 156, bp: 154 } }) // quote response
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockSnapshotResponse // snapshot response
                });

            const quote = await marketDataService.getQuote('AAPL');

            expect(fetchMock).toHaveBeenCalledTimes(2);
            expect(quote).not.toBeNull();
            expect(quote?.source).toContain('Alpaca');
            expect(quote?.price).toBe(155.00);
        });

        it('should fallback to Twelve Data if Alpaca fails', async () => {
            // Alpaca fails (first call)
            fetchMock.mockRejectedValueOnce(new Error('Alpaca Error'));

            // Twelve Data succeeds
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

            // 1 Alpaca + 1 Twelve Data
            expect(fetchMock).toHaveBeenCalledTimes(2);
            expect(quote).not.toBeNull();
            expect(quote?.source).toContain('Twelve Data');
        });

        it('should fallback to Tiingo if Alpaca and Twelve Data fail', async () => {
            // Alpaca fails
            fetchMock.mockRejectedValueOnce(new Error('Alpaca Error'));
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

            expect(fetchMock).toHaveBeenCalledTimes(3);
            expect(quote).not.toBeNull();
            expect(quote?.source).toContain('Tiingo');
        });

        it('should fallback to Yahoo if all primary providers fail', async () => {
            // Alpaca fails
            fetchMock.mockRejectedValueOnce(new Error('Alpaca Error'));
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

            expect(fetchMock).toHaveBeenCalledTimes(4);
            expect(quote).not.toBeNull();
            expect(quote?.source).toContain('Yahoo');
        });
    });

    describe('getCandles', () => {
        it('should fetch candles from Alpaca successfully', async () => {
            // Alpaca (Primary) is called first alone in my implementation line 335?
            // "const alpacaPromise = this.alpaca.getCandles..."
            // "const alpacaCandles = await alpacaPromise;"
            // IF alpacaCandles.length > 0 RETURN.

            // So for this test case, ONLY Alpaca should be called if it succeeds. 
            // The others are NOT called in parallel with Alpaca.

            const mockAlpacaResponse = {
                bars: [
                    { t: '2023-01-01T00:00:00Z', o: 100, h: 110, l: 90, c: 105, v: 1000 }
                ]
            };

            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => mockAlpacaResponse,
            });

            const { candles, source } = await marketDataService.getCandles('AAPL', '1d', '1mo');

            expect(candles.length).toBeGreaterThan(0);
            expect(source).toContain('Alpaca');
        });

        it('should fallback to Twelve Data if Alpaca fails', async () => {
            // Twelve Data succeeds
            const mockResponse = {
                values: [
                    { datetime: '2023-01-01', open: '100', high: '110', low: '90', close: '105', volume: '1000' }
                ]
            };
            // 1. Alpaca (Fail)
            // 2. Twelve Data (Success)
            // 3. Tiingo (called in parallel with Twelve Data)

            fetchMock
                .mockRejectedValueOnce(new Error('Alpaca Error')) // Alpaca
                .mockResolvedValueOnce({ json: async () => mockResponse }) // Twelve Data
                .mockResolvedValueOnce({ json: async () => [] }); // Tiingo

            const { candles, source } = await marketDataService.getCandles('AAPL', '1d', '1mo');

            expect(candles.length).toBeGreaterThan(0);
            expect(source).toBe('Twelve Data');
        });

        it('should fallback to Tiingo if Alpaca and Twelve Data fail', async () => {
            // Alpaca Fail
            // Twelve Data fail
            // Tiingo succeed

            // Since they run in parallel, we need to be careful with mockResolvedValueOnce order.
            // However, usually the first call in code triggers the first mock.
            // Twelve Data is called first in code.

            fetchMock
                .mockRejectedValueOnce(new Error('Alpaca Error')) // Alpaca
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

        it('should fallback to Yahoo if primary/secondary providers fail', async () => {
            // Alpaca fail
            // Twelve Data fail
            // Tiingo fail
            // Yahoo succeed

            fetchMock
                .mockRejectedValueOnce(new Error('Alpaca Error'))
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
                .mockRejectedValueOnce(new Error('Alpaca Error'))
                .mockRejectedValueOnce(new Error('Twelve Data Error'))
                .mockRejectedValueOnce(new Error('Tiingo Error'))
                .mockRejectedValueOnce(new Error('Yahoo Error'));

            const { candles, source } = await marketDataService.getCandles('AAPL', '1d', '1mo');

            expect(candles).toEqual([]);
            expect(source).toBe('None');
        });
    });
});
