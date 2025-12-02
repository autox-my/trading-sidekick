import { calculateRSI, calculateSMA } from '../utils/calculations';

export interface Candle {
    time: number; // Unix timestamp in seconds
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface Quote {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    timestamp: number;
    source: string;
}

export interface SearchResult {
    symbol: string;
    name: string;
    type: string;
    exchange: string;
    currency: string;
}

export interface MarketDataProvider {
    name: string;
    getQuote(symbol: string): Promise<Quote | null>;
    getCandles(symbol: string, interval: string, range: string): Promise<Candle[]>;
    searchSymbols(query: string): Promise<SearchResult[]>;
}

// --- Twelve Data Provider ---
class TwelveDataProvider implements MarketDataProvider {
    name = "Twelve Data";
    private apiKey: string;
    private baseUrl = "https://api.twelvedata.com";

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async getQuote(symbol: string): Promise<Quote | null> {
        if (!this.apiKey) return null;
        try {
            const res = await fetch(`${this.baseUrl}/quote?symbol=${symbol}&apikey=${this.apiKey}`);
            const data = await res.json();
            if (data.code || !data.close) return null;

            return {
                symbol: data.symbol,
                price: parseFloat(data.close),
                change: parseFloat(data.change),
                changePercent: parseFloat(data.percent_change),
                timestamp: data.timestamp, // Twelve Data returns unix timestamp or string? Usually string, need to check.
                // Actually Twelve Data returns timestamp as number in some endpoints, but let's be safe.
                // For /quote it returns timestamp as number.
                source: "Twelve Data (Real-time)"
            };
        } catch (e) {
            console.error("Twelve Data Quote Error:", e);
            return null;
        }
    }

    async getCandles(symbol: string, interval: string, _range: string): Promise<Candle[]> {
        if (!this.apiKey) return [];
        // Map interval/range to Twelve Data format if needed
        // Twelve Data supports 1min, 5min, 15min, 30min, 45min, 1h, 2h, 4h, 1day, 1week, 1month
        try {
            const res = await fetch(`${this.baseUrl}/time_series?symbol=${symbol}&interval=${interval}&outputsize=500&apikey=${this.apiKey}`);
            const data = await res.json();
            if (data.code || !data.values) return [];

            return data.values.map((v: any) => ({
                time: new Date(v.datetime).getTime() / 1000,
                open: parseFloat(v.open),
                high: parseFloat(v.high),
                low: parseFloat(v.low),
                close: parseFloat(v.close),
                volume: parseFloat(v.volume)
            })).reverse(); // Twelve Data returns newest first
        } catch (e) {
            console.error("Twelve Data Candles Error:", e);
            return [];
        }
    }

    async searchSymbols(query: string): Promise<SearchResult[]> {
        if (!this.apiKey) return [];
        try {
            const res = await fetch(`${this.baseUrl}/symbol_search?symbol=${query}&apikey=${this.apiKey}`);
            const data = await res.json();
            if (data.code || !data.data) return [];

            return data.data.map((item: any) => ({
                symbol: item.symbol,
                name: item.instrument_name,
                type: item.instrument_type,
                exchange: item.exchange,
                currency: item.currency
            }));
        } catch (e) {
            console.error("Twelve Data Search Error:", e);
            return [];
        }
    }
}

// --- Tiingo Provider ---
class TiingoProvider implements MarketDataProvider {
    name = "Tiingo";
    private apiKey: string;
    private baseUrl = "https://api.tiingo.com/tiingo";

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async getQuote(symbol: string): Promise<Quote | null> {
        if (!this.apiKey) return null;
        try {
            // Tiingo IEX endpoint for real-time (or near real-time)
            const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(`${this.baseUrl}/iex/${symbol}?token=${this.apiKey}`)}`);
            const data = await res.json();
            // Tiingo returns array for /iex endpoint
            const quote = Array.isArray(data) ? data[0] : data;
            if (!quote || !quote.last) return null;

            const prevClose = quote.prevClose || quote.last; // Fallback if prevClose missing
            const change = quote.last - prevClose;
            const changePercent = (change / prevClose) * 100;

            return {
                symbol: quote.ticker,
                price: quote.last,
                change: change,
                changePercent: changePercent,
                timestamp: new Date(quote.timestamp).getTime() / 1000,
                source: "Tiingo (IEX)"
            };
        } catch (e) {
            console.error("Tiingo Quote Error:", e);
            return null;
        }
    }

    async getCandles(symbol: string, interval: string, _range: string): Promise<Candle[]> {
        if (!this.apiKey) return [];
        try {
            // Tiingo EOD or IEX? For intraday we need IEX.
            // interval: '5min', '1hour', '1day'
            // Map '1d' to 'daily' for EOD endpoint, or use IEX for intraday
            let url = "";
            if (interval === '1d') {
                url = `${this.baseUrl}/daily/${symbol}/prices?token=${this.apiKey}&resampleFreq=daily`;
            } else {
                // Tiingo IEX historical
                // interval mapping: 5m -> 5min
                const tiingoInterval = interval.replace('m', 'min');
                url = `${this.baseUrl}/iex/${symbol}/prices?token=${this.apiKey}&resampleFreq=${tiingoInterval}`;
            }

            const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
            const data = await res.json();
            if (!Array.isArray(data)) return [];

            return data.map((v: any) => ({
                time: new Date(v.date).getTime() / 1000,
                open: v.open,
                high: v.high,
                low: v.low,
                close: v.close,
                volume: v.volume
            }));
        } catch (e) {
            console.error("Tiingo Candles Error:", e);
            return [];
        }
    }

    async searchSymbols(_query: string): Promise<SearchResult[]> {
        return [];
    }
}

// --- Yahoo Provider (Fallback) ---
class YahooProvider implements MarketDataProvider {
    name = "Yahoo Finance";

    async getQuote(symbol: string): Promise<Quote | null> {
        try {
            const proxyUrl = "https://corsproxy.io/?";
            const targetUrl = encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`);
            const res = await fetch(proxyUrl + targetUrl);
            const json = await res.json();
            const result = json.chart.result[0];
            const meta = result.meta;
            const price = meta.regularMarketPrice;
            const prevClose = meta.chartPreviousClose;
            const change = price - prevClose;
            const changePercent = (change / prevClose) * 100;

            return {
                symbol: symbol,
                price: price,
                change: change,
                changePercent: changePercent,
                timestamp: meta.regularMarketTime,
                source: "Yahoo Finance (Delayed)"
            };
        } catch (e) {
            console.error("Yahoo Quote Error:", e);
            return null;
        }
    }

    async getCandles(symbol: string, interval: string, range: string): Promise<Candle[]> {
        try {
            const proxyUrl = "https://corsproxy.io/?";
            const targetUrl = encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`);
            const response = await fetch(proxyUrl + targetUrl);
            const json = await response.json();
            const result = json.chart.result[0];
            const quotes = result.indicators.quote[0];
            const timestamps = result.timestamp;

            if (!timestamps || !quotes) return [];

            const candles: Candle[] = [];
            for (let i = 0; i < timestamps.length; i++) {
                if (quotes.close[i] == null) continue;
                candles.push({
                    time: timestamps[i],
                    open: quotes.open[i],
                    high: quotes.high[i],
                    low: quotes.low[i],
                    close: quotes.close[i],
                    volume: quotes.volume[i]
                });
            }
            return candles;
        } catch (e) {
            console.error("Yahoo Candles Error:", e);
            return [];
        }
    }

    async searchSymbols(query: string): Promise<SearchResult[]> {
        try {
            const proxyUrl = "https://corsproxy.io/?";
            const targetUrl = encodeURIComponent(`https://query1.finance.yahoo.com/v1/finance/search?q=${query}&quotesCount=10&newsCount=0`);
            const res = await fetch(proxyUrl + targetUrl);
            const data = await res.json();

            if (!data.quotes) return [];

            return data.quotes.map((item: any) => ({
                symbol: item.symbol,
                name: item.shortname || item.longname || item.symbol,
                type: item.quoteType,
                exchange: item.exchange,
                currency: "USD"
            }));
        } catch (e) {
            console.error("Yahoo Search Error:", e);
            return [];
        }
    }
}

// --- Hybrid Service ---
class HybridMarketDataService {
    private static instance: HybridMarketDataService;
    private twelveData: TwelveDataProvider;
    private tiingo: TiingoProvider;
    private yahoo: YahooProvider;

    private constructor() {
        // We will read keys from env or fallback to empty
        const twelveKey = import.meta.env.VITE_TWELVE_DATA_API_KEY || "";
        const tiingoKey = import.meta.env.VITE_TIINGO_API_KEY || "";

        this.twelveData = new TwelveDataProvider(twelveKey);
        this.tiingo = new TiingoProvider(tiingoKey);
        this.yahoo = new YahooProvider();
    }

    public static getInstance(): HybridMarketDataService {
        if (!HybridMarketDataService.instance) {
            HybridMarketDataService.instance = new HybridMarketDataService();
        }
        return HybridMarketDataService.instance;
    }

    async getQuote(symbol: string): Promise<Quote | null> {
        // Priority: Twelve Data -> Tiingo -> Yahoo
        let quote = await this.twelveData.getQuote(symbol);
        if (quote) return quote;

        console.warn("Twelve Data failed/limit, trying Tiingo...");
        quote = await this.tiingo.getQuote(symbol);
        if (quote) return quote;

        console.warn("Tiingo failed, trying Yahoo...");
        return await this.yahoo.getQuote(symbol);
    }

    async getCandles(symbol: string, interval: string, range: string): Promise<Candle[]> {
        // Optimization: Fetch from Twelve Data and Tiingo in parallel to reduce delay
        // We prefer Twelve Data, but if it fails, we want Tiingo ready immediately.

        const twelveDataPromise = this.twelveData.getCandles(symbol, interval, range)
            .catch(e => { console.warn("Twelve Data failed:", e); return []; });

        const tiingoPromise = this.tiingo.getCandles(symbol, interval, range)
            .catch(e => { console.warn("Tiingo failed:", e); return []; });

        // Wait for Twelve Data first (Primary)
        const twelveDataCandles = await twelveDataPromise;
        if (twelveDataCandles.length > 0) return twelveDataCandles;

        // If Twelve Data failed, check Tiingo (Secondary)
        const tiingoCandles = await tiingoPromise;
        if (tiingoCandles.length > 0) {
            console.warn("Using Tiingo as fallback");
            return tiingoCandles;
        }

        // Fallback to Yahoo (Tertiary) - Only fetch if others fail to save bandwidth/proxy usage
        console.warn("Primary providers failed, trying Yahoo...");
        return await this.yahoo.getCandles(symbol, interval, range);
    }

    async searchSymbols(query: string): Promise<SearchResult[]> {
        // Priority: Twelve Data -> Yahoo
        let results = await this.twelveData.searchSymbols(query);
        if (results.length > 0) return results;

        console.warn("Twelve Data search empty/failed, trying Yahoo...");
        return await this.yahoo.searchSymbols(query);
    }

    // Helper to get Eagle Eye style data (Multi-timeframe + Indicators)
    async getEagleEyeData(symbol: string) {
        const [dailyCandles, fiveMinCandles] = await Promise.all([
            this.getCandles(symbol, '1d', '1y'),
            this.getCandles(symbol, '5m', '1d')
        ]);

        if (dailyCandles.length === 0 && fiveMinCandles.length === 0) return null;

        const processCandles = (candles: Candle[]) => {
            if (candles.length === 0) return null;
            const closes = candles.map(c => c.close);
            const lastPrice = closes[closes.length - 1];
            const rsi = calculateRSI(closes);
            const sma = calculateSMA(closes, 20);
            const trend = lastPrice > (sma || 0) ? "Bullish" : "Bearish";
            return { lastPrice, rsi, sma, trend, candles };
        };

        return {
            daily: processCandles(dailyCandles),
            fiveMin: processCandles(fiveMinCandles)
        };
    }
}

export const marketDataService = HybridMarketDataService.getInstance();
