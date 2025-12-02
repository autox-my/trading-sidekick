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

export interface Technicals {
    lastPrice: number;
    rsi: number;
    sma: number;
    atr: number;
    regime: 'Compressed' | 'Expanded' | 'Normal' | 'Neutral';
    avgVolume: number;
    lastVolume: number;
}

export interface ChartConfig {
    chartType: 'candle' | 'bar' | 'line';
    upColor: string;
    downColor: string;
    upOpacity: number;
    downOpacity: number;
    borderUpColor: string;
    borderDownColor: string;
    wickUpColor: string;
    wickDownColor: string;
    gridVisible: boolean;
    axisVisible: boolean;
    smaVisible: boolean;
    smaPeriod: number;
    smaColor: string;
    smaOpacity: number;
    annotationVisible: boolean;
    annotationColor: string;
    annotationOpacity: number;
    marginTop?: number;
    marginBottom?: number;
    marginRight?: number;
    avKey: string; // Alpha Vantage Key
}

export interface NewsItem {
    title: string;
    url?: string;
    source?: string;
    score: number;
    sentiment_label?: string;
    pubDate: string;
}

export interface NewsData {
    headlines: NewsItem[];
    totalScore: number;
}

export interface MacroData {
    cpi: string;
    fed_rate: string;
    gdp: string;
    unemployment: string;
    tnx_yield: string;
    source: string;
    lastUpdated?: number;
}

export interface MarketStatus {
    region: string;
    market_type: string;
    current_status: string;
    notes: string;
    local_open: string;
    local_close: string;
}

export interface DarkPoolLevel {
    price: number;
    totalPremium: number;
}

export interface DarkPoolSignature {
    price: number;
    premium: number;
    date: string;
}

export interface DarkPoolData {
    levels: DarkPoolLevel[];
    signatures: DarkPoolSignature[];
}

export interface MacroCorrelationData {
    dxy: { price: number; change: number };
    tnx: { price: number; change: number };
}

export interface SearchResult {
    symbol: string;
    name: string;
    type: string;
    exchange: string;
    currency: string;
}

export interface OptionsData {
    pcr: string | number;
    totalCallVol: number;
    totalPutVol: number;
    unusual: any[]; // Define stricter if possible
}

export interface ElliottWave {
    label: string;
    time: string | number;
    price: number;
    description?: string;
}
