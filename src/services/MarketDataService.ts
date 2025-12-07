import { PROXY_URL, TIINGO_BASE_URL, TIINGO_START_DATE, TWELVE_DATA_BASE_URL, YAHOO_BASE_URL } from '../utils/constants';

// Removed unused imports
// import { calculateRSI, calculateSMA } from '../utils/calculations';
// import { toast } from 'sonner';

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
    priority?: number;
}

export interface MarketDataProvider {
    name: string;
    getQuote(symbol: string): Promise<Quote | null>;
    getCandles(symbol: string, interval: string, range: string, extendedHours?: boolean): Promise<Candle[]>;
    searchSymbols(query: string): Promise<SearchResult[]>;
}

// --- Alpaca Provider ---
class AlpacaProvider implements MarketDataProvider {
    name = "Alpaca";
    private apiKey: string;
    private secretKey: string;
    private dataUrl = "https://data.alpaca.markets/v2";

    constructor(apiKey: string, secretKey: string) {
        this.apiKey = apiKey;
        this.secretKey = secretKey;
    }

    private getHeaders() {
        return {
            'APCA-API-KEY-ID': this.apiKey,
            'APCA-API-SECRET-KEY': this.secretKey,
            'accept': 'application/json'
        };
    }

    async getQuote(symbol: string): Promise<Quote | null> {
        if (!this.apiKey || !this.secretKey) return null;
        try {
            // Using IEX (Free) feed for real-time
            const res = await fetch(`${this.dataUrl}/iex/stocks/${symbol}/quotes/latest?feed=iex`, {
                headers: this.getHeaders()
            });

            if (!res.ok) throw new Error(res.statusText);
            const data = await res.json();
            const quote = data.quote;

            if (!quote) return null;

            // For better UX, let's fetch a Snapshot instead
            const snapshotRes = await fetch(`${this.dataUrl}/stocks/${symbol}/snapshot?feed=iex`, {
                headers: this.getHeaders()
            });
            const snapshotData = await snapshotRes.json();

            if (!snapshotData) return null;

            const trade = snapshotData.latestTrade;
            const prevBar = snapshotData.prevDailyBar;
            const dailyBar = snapshotData.dailyBar;

            const price = trade ? trade.p : (dailyBar ? dailyBar.c : 0);
            const prevClose = prevBar ? prevBar.c : price;
            const change = price - prevClose;
            const changePercent = (prevClose > 0) ? (change / prevClose) * 100 : 0;

            return {
                symbol: symbol,
                price: price,
                change: change,
                changePercent: changePercent,
                timestamp: trade ? new Date(trade.t).getTime() / 1000 : Date.now() / 1000,
                source: "Alpaca (IEX)"
            };

        } catch (e) {
            console.error("Alpaca Quote Error:", e);
            return null;
        }
    }

    async getCandles(symbol: string, interval: string, range: string, _extendedHours?: boolean): Promise<Candle[]> {
        if (!this.apiKey || !this.secretKey) return [];
        try {
            let timeframe = '1Day';

            // Mapping intervals
            if (interval === '1m') timeframe = '1Min';
            if (interval === '5m') timeframe = '5Min';
            if (interval === '15m') timeframe = '15Min';
            if (interval === '1h' || interval === '60m') timeframe = '1Hour';
            if (interval === '1w' || interval === '1week') timeframe = '1Week';

            // Determine start date based on range
            let startDate = new Date();
            switch (range) {
                case '1d': startDate.setDate(startDate.getDate() - 2); break;
                case '1w': startDate.setDate(startDate.getDate() - 7); break;
                case '1mo': startDate.setMonth(startDate.getMonth() - 1); break;
                case '3mo': startDate.setMonth(startDate.getMonth() - 3); break;
                case '6mo': startDate.setMonth(startDate.getMonth() - 6); break;
                case '1y': startDate.setFullYear(startDate.getFullYear() - 1); break;
                case '5y': startDate.setFullYear(startDate.getFullYear() - 5); break;
                case '10y': startDate.setFullYear(startDate.getFullYear() - 10); break;
                default: startDate.setMonth(startDate.getMonth() - 1); // Default 1 month
            }

            const startStr = startDate.toISOString().split('T')[0]; // YYYY-MM-DD

            let allBars: any[] = [];
            let pageToken: string | null = null;
            let pageCount = 0;
            const MAX_PAGES = 30; // Safety break

            do {
                let url = `${this.dataUrl}/stocks/${symbol}/bars?timeframe=${timeframe}&start=${startStr}&limit=10000&feed=iex&adjustment=split`;
                if (pageToken) {
                    url += `&page_token=${pageToken}`;
                }

                const res = await fetch(url, {
                    headers: this.getHeaders()
                });

                if (!res.ok) throw new Error(res.statusText);
                const data = await res.json();

                if (data.bars) {
                    allBars = allBars.concat(data.bars);
                }

                pageToken = data.next_page_token;
                pageCount++;

            } while (pageToken && pageCount < MAX_PAGES);

            if (allBars.length === 0) {
                console.warn("Alpaca returned no bars for", symbol);
                return [];
            }

            return allBars.map((b: any) => ({
                time: new Date(b.t).getTime() / 1000,
                open: b.o,
                high: b.h,
                low: b.l,
                close: b.c,
                volume: b.v
            }));
        } catch (e) {
            console.error("Alpaca Candles Error:", e);
            return [];
        }
    }

    async searchSymbols(_query: string): Promise<SearchResult[]> {
        return [];
    }
}

// --- Twelve Data Provider ---
class TwelveDataProvider implements MarketDataProvider {
    name = "Twelve Data";
    private apiKey: string;
    private baseUrl = TWELVE_DATA_BASE_URL;

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
                timestamp: data.timestamp,
                source: "Twelve Data (Real-time)"
            };
        } catch (e) {
            console.error("Twelve Data Quote Error:", e);
            return null;
        }
    }

    private mapInterval(interval: string): string {
        const map: { [key: string]: string } = {
            '1m': '1min',
            '5m': '5min',
            '15m': '15min',
            '30m': '30min',
            '60m': '1h',
            '1h': '1h',
            '1d': '1day',
            '1w': '1week',
            '1mo': '1month'
        };
        return map[interval] || interval;
    }

    async getCandles(symbol: string, interval: string, _range: string, extendedHours?: boolean): Promise<Candle[]> {
        if (!this.apiKey) return [];
        const apiInterval = this.mapInterval(interval);

        try {
            let url = `${this.baseUrl}/time_series?symbol=${symbol}&interval=${apiInterval}&outputsize=500&apikey=${this.apiKey}`;
            if (extendedHours) {
                url += "&prepost=true";
            }
            const res = await fetch(url);
            const data = await res.json();
            if (data.code || !data.values) return [];

            return data.values.map((v: any) => ({
                time: new Date(v.datetime).getTime() / 1000,
                open: parseFloat(v.open),
                high: parseFloat(v.high),
                low: parseFloat(v.low),
                close: parseFloat(v.close),
                // FIX: Fallback to 0 if volume is missing or NaN
                volume: parseFloat(v.volume) || 0
            })).reverse();
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
    private baseUrl = TIINGO_BASE_URL;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async getQuote(symbol: string): Promise<Quote | null> {
        if (!this.apiKey) return null;
        try {
            const res = await fetch(`${PROXY_URL}${encodeURIComponent(`${this.baseUrl}/iex/${symbol}?token=${this.apiKey}`)}`);
            const data = await res.json();
            const quote = Array.isArray(data) ? data[0] : data;
            if (!quote || !quote.last) return null;

            const prevClose = quote.prevClose || quote.last;
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

    async getCandles(symbol: string, interval: string, _range: string, _extendedHours?: boolean): Promise<Candle[]> {
        if (!this.apiKey) return [];
        try {
            let url = "";
            if (interval === '1d' || interval === '1day') {
                url = `${this.baseUrl}/daily/${symbol}/prices?token=${this.apiKey}&resampleFreq=daily&startDate=${TIINGO_START_DATE}`;
            } else {
                let tiingoInterval = interval;
                if (interval === '60m' || interval === '1h') tiingoInterval = '1hour';
                else if (interval === '15m') tiingoInterval = '15min';
                else if (interval === '5m') tiingoInterval = '5min';
                else if (interval === '1m') tiingoInterval = '1min';

                url = `${this.baseUrl}/iex/${symbol}/prices?token=${this.apiKey}&resampleFreq=${tiingoInterval}`;
            }

            const res = await fetch(`${PROXY_URL}${encodeURIComponent(url)}`);
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

class AlpacaWebSocket {
    private ws: WebSocket | null = null;
    private apiKey: string;
    private secretKey: string;
    private streamUrl = "wss://stream.data.alpaca.markets/v2/iex";
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private onQuoteCallback: ((quote: Quote) => void) | null = null;
    private currentSymbol: string | null = null;

    constructor(apiKey: string, secretKey: string) {
        this.apiKey = apiKey;
        this.secretKey = secretKey;
    }

    public connect(onQuote: (quote: Quote) => void) {
        if (this.ws?.readyState === WebSocket.OPEN) return;

        this.onQuoteCallback = onQuote;
        this.ws = new WebSocket(this.streamUrl);

        this.ws.onopen = () => {
            console.log("Alpaca WS Connected");
            this.reconnectAttempts = 0;
            this.authenticate();
        };

        this.ws.onmessage = (event) => {
            try {
                const messages = JSON.parse(event.data);
                if (Array.isArray(messages)) {
                    messages.forEach(msg => this.handleMessage(msg));
                }
            } catch (e) {
                console.error("Alpaca WS Parse Error:", e);
            }
        };

        this.ws.onclose = () => {
            console.log("Alpaca WS Closed");
            this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
            console.error("Alpaca WS Error:", error);
            this.ws?.close();
        };
    }

    private authenticate() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const authMsg = {
            action: "auth",
            key: this.apiKey,
            secret: this.secretKey
        };
        this.ws.send(JSON.stringify(authMsg));
    }

    private handleMessage(msg: any) {
        if (msg.T === "success" && msg.msg === "authenticated") {
            console.log("Alpaca WS Authenticated");
            if (this.currentSymbol) {
                this.subscribe(this.currentSymbol);
            }
        } else if (msg.T === "t") { // Trade
            if (this.onQuoteCallback) {
                this.onQuoteCallback({
                    symbol: msg.S,
                    price: msg.p,
                    change: 0,
                    changePercent: 0,
                    timestamp: new Date(msg.t).getTime() / 1000,
                    source: "Alpaca (Live)"
                });
            }
        }
    }

    public subscribe(symbol: string) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.currentSymbol = symbol;
            return;
        }

        const subMsg = {
            action: "subscribe",
            trades: [symbol],
            quotes: [symbol],
            bars: []
        };
        this.ws.send(JSON.stringify(subMsg));
        this.currentSymbol = symbol;
    }

    public disconnect() {
        this.ws?.close();
        this.ws = null;
    }

    private attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
                console.log(`Alpaca WS Reconnecting... (${this.reconnectAttempts})`);
                if (this.onQuoteCallback) this.connect(this.onQuoteCallback);
            }, 2000 * this.reconnectAttempts);
        }
    }
}

// --- Yahoo Provider (Fallback) ---
class YahooProvider implements MarketDataProvider {
    name = "Yahoo Finance";

    async getQuote(symbol: string): Promise<Quote | null> {
        try {
            const proxyUrl = PROXY_URL;
            const targetUrl = encodeURIComponent(`${YAHOO_BASE_URL}/v8/finance/chart/${symbol}?interval=1d&range=1d`);
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

    async getCandles(symbol: string, interval: string, range: string, extendedHours?: boolean): Promise<Candle[]> {
        try {
            const proxyUrl = PROXY_URL;

            let yahooInterval = interval;
            if (interval === '1w') yahooInterval = '1wk';
            if (interval === '1h') yahooInterval = '60m';

            let targetUrl = encodeURIComponent(`${YAHOO_BASE_URL}/v8/finance/chart/${symbol}?interval=${yahooInterval}&range=${range}`);
            if (extendedHours) {
                targetUrl = encodeURIComponent(`${YAHOO_BASE_URL}/v8/finance/chart/${symbol}?interval=${yahooInterval}&range=${range}&includePrePost=true`);
            }
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
            const proxyUrl = PROXY_URL;
            const targetUrl = encodeURIComponent(`${YAHOO_BASE_URL}/v1/finance/search?q=${query}&quotesCount=10&newsCount=0`);
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
    private alpaca: AlpacaProvider;
    private twelveData: TwelveDataProvider;
    private tiingo: TiingoProvider;
    private yahoo: YahooProvider;

    private alpacaWs: AlpacaWebSocket;

    private constructor() {
        // We will read keys from env or fallback to empty
        const twelveKey = import.meta.env.VITE_TWELVE_DATA_API_KEY || "";
        const tiingoKey = import.meta.env.VITE_TIINGO_API_KEY || "";
        const alpacaKey = import.meta.env.VITE_ALPACA_API_KEY || "";
        const alpacaSecret = import.meta.env.VITE_ALPACA_SECRET_KEY || "";

        this.alpaca = new AlpacaProvider(alpacaKey, alpacaSecret);
        this.alpacaWs = new AlpacaWebSocket(alpacaKey, alpacaSecret);
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
        // Priority: Alpaca -> Twelve Data -> Tiingo -> Yahoo
        let quote = await this.alpaca.getQuote(symbol);
        if (quote) return quote;

        // console.info("Alpaca failed/missing, trying Twelve Data...");
        quote = await this.twelveData.getQuote(symbol);
        if (quote) return quote;

        // console.info("Twelve Data failed/limit, trying Tiingo...");
        quote = await this.tiingo.getQuote(symbol);
        if (quote) return quote;

        // console.info("Tiingo failed, trying Yahoo...");
        return await this.yahoo.getQuote(symbol);
    }

    async getCandles(symbol: string, interval: string, range: string, extendedHours?: boolean): Promise<{ candles: Candle[], source: string }> {
        if (extendedHours) {
            // Priority: Twelve Data -> Yahoo -> Alpaca -> Tiingo
            console.log("Fetching Extended Hours Data...");

            const twelveDataPromise = this.twelveData.getCandles(symbol, interval, range, extendedHours)
                .catch(e => { console.warn("Twelve Data failed:", e); return []; });

            const twelveDataCandles = await twelveDataPromise;
            if (twelveDataCandles.length > 0) return { candles: twelveDataCandles, source: "Twelve Data (Ext)" };

            const yahooCandles = await this.yahoo.getCandles(symbol, interval, range, extendedHours);
            if (yahooCandles.length > 0) return { candles: yahooCandles, source: "Yahoo Finance (Ext)" };
        }

        const alpacaPromise = this.alpaca.getCandles(symbol, interval, range, extendedHours)
            .catch(e => { console.warn("Alpaca failed:", e); return []; });

        const alpacaCandles = await alpacaPromise;
        if (alpacaCandles.length > 0) return { candles: alpacaCandles, source: "Alpaca (IEX)" };

        const twelveDataPromise = this.twelveData.getCandles(symbol, interval, range, extendedHours)
            .catch(e => { console.warn("Twelve Data failed:", e); return []; });

        const tiingoPromise = this.tiingo.getCandles(symbol, interval, range, extendedHours)
            .catch(e => { console.warn("Tiingo failed:", e); return []; });

        const twelveDataCandles = await twelveDataPromise;
        if (twelveDataCandles.length > 0) return { candles: twelveDataCandles, source: "Twelve Data" };

        const tiingoCandles = await tiingoPromise;
        if (tiingoCandles.length > 0) {
            return { candles: tiingoCandles, source: "Tiingo" };
        }

        const yahooCandles = await this.yahoo.getCandles(symbol, interval, range, extendedHours);
        if (yahooCandles.length > 0) {
            return { candles: yahooCandles, source: "Yahoo Finance" };
        }

        return { candles: [], source: "Error" };
    }

    async searchSymbols(query: string): Promise<SearchResult[]> {
        // Priority: Twelve Data -> Yahoo
        let results = await this.twelveData.searchSymbols(query);
        if (results.length > 0) return results;

        return await this.yahoo.searchSymbols(query);
    }

    async subscribeToQuotes(symbol: string, callback: (quote: Quote) => void) {
        this.alpacaWs.connect(callback);
        setTimeout(() => this.alpacaWs.subscribe(symbol), 1000);
    }

    async getEagleEyeData(symbol: string) {
        return this.getQuote(symbol);
    }
}

export const marketDataService = HybridMarketDataService.getInstance();
