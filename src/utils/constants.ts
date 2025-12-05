
export const YAHOO_INTERVALS: { [key: string]: string } = {
    '1m': '1m', '15m': '15m', '1h': '60m', '4h': '1h', '1d': '1d', '1w': '1wk'
};

export const TIMEFRAMES = ['15m', '1h', '1d', '1w'];

export const POPULAR_SYMBOLS = [
    { symbol: 'SPY', name: 'S&P 500 ETF' }, { symbol: 'QQQ', name: 'Invesco QQQ' }, { symbol: 'IWM', name: 'Russell 2000' },
    { symbol: 'NVDA', name: 'NVIDIA Corp' }, { symbol: 'AAPL', name: 'Apple Inc.' }, { symbol: 'MSFT', name: 'Microsoft' },
    { symbol: 'TSLA', name: 'Tesla Inc.' }, { symbol: 'AMD', name: 'Adv. Micro Devices' }, { symbol: 'BTC-USD', name: 'Bitcoin USD' },
    { symbol: 'ETH-USD', name: 'Ethereum USD' }, { symbol: 'GC=F', name: 'Gold Futures' }, { symbol: 'CL=F', name: 'Crude Oil' },
    { symbol: '^VIX', name: 'Volatility Index' }, { symbol: 'GME', name: 'GameStop' }, { symbol: 'TLT', name: '20+ Yr Treasury Bond' },
];

export const PERSONALITIES = {
    analyst: {
        id: 'analyst', name: 'Neutral Analyst', color: 'text-blue-400',
        description: 'Balanced, factual, and data-driven.',
        systemPrompt: "You are a professional financial analyst. Be objective, concise, and focus on the data provided. Use Markdown headers (##, ###) and tables. Focus on support/resistance, volume analysis, technical indicators, volatility regimes, unfilled gaps, and the provided sentiment/macro/options data."
    },
    warren: {
        id: 'warren', name: 'Warren', color: 'text-emerald-400',
        description: 'Long-term value investor. Ignores noise.',
        systemPrompt: "You are a legendary value investor. Dislike short-term trading, crypto speculation, and technical analysis. Focus on fundamentals, moats, and long-term value. Scold speculative behavior."
    },
    wsb: {
        id: 'wsb', name: 'The Degenerate', color: 'text-purple-400',
        description: 'High risk, high reward. YOLOs only.',
        systemPrompt: "You are a 'WallStreetBets' trader. Use slang like 'Diamond Hands', 'YOLO'. Hype up high volume and option flow. But still provide probability scenarios."
    },
    karen: {
        id: 'karen', name: 'Karen (Risk Mgr)', color: 'text-rose-400',
        description: 'Skeptical. Hates your trade ideas.',
        systemPrompt: "You are a strict Risk Manager named Karen. Criticize every trade setup. Focus on downside risk and potential failure points."
    }
};

export const SENTIMENT_DICT = {
    positive: ['surge', 'jump', 'gain', 'profit', 'beat', 'growth', 'record', 'strong', 'bull', 'buy', 'upgrade', 'higher', 'rise', 'rally', 'optimism', 'outperform', 'soar'],
    negative: ['drop', 'fall', 'loss', 'miss', 'weak', 'bear', 'sell', 'downgrade', 'crash', 'slump', 'lower', 'risk', 'inflation', 'debt', 'fear', 'plunge', 'retreat']
};

export const PROXY_URL = "https://corsproxy.io/?";
export const TIINGO_START_DATE = "2020-01-01";
export const YAHOO_BASE_URL = "https://query1.finance.yahoo.com";
export const TWELVE_DATA_BASE_URL = "https://api.twelvedata.com";
export const TIINGO_BASE_URL = "https://api.tiingo.com/tiingo";
export const ALPACA_BASE_URL = "https://paper-api.alpaca.markets/v2"; // Default to paper for safety
