import { useEffect, useRef } from 'react';
import { useMarketStore } from '../store/useMarketStore';
import { useUIStore } from '../store/useUIStore';
import { marketDataService } from '../services/MarketDataService';
import {
    fetchAlphaVantageMacro,
    fetchRealNews,
    fetchAlphaVantageNews,
    fetchGlobalMarketStatus,
    fetchMacroCorrelationData
} from '../services/api';
import {
    generateMockData,
    detectPatterns,
    detectMacroDivergences
} from '../utils/helpers';
import {
    calculateRSI,
    calculateSMA,
    calculateATR,
    getVolatilityRegime,
    calculateAvgVolume,
    calculateVWAP
} from '../utils/calculations';
import { YAHOO_INTERVALS } from '../utils/constants';

export const useMarketData = () => {
    const {
        activeSymbol,
        timeframe,
        chartConfig,
        macroCorrelations,
        setMarketData,
        setTechnicals,
        setScannedPatterns,
        setNewsData,
        setMacroCorrelations,
        setMacroData,
        setPriceDir,
        technicals,
        setExternalData,
        setLastDataUpdate,
        setMarketStatus,
        setDataSource,
        showPrePost
    } = useMarketStore();

    const { setConnectionStatus, setAvKeyStatus } = useUIStore();
    const prevPriceRef = useRef(0);

    // 1. Validate Alpha Vantage Key & Fetch Initial Macro/Status
    useEffect(() => {
        if (!chartConfig.avKey) {
            setAvKeyStatus('idle');
            return;
        }
        const validate = async () => {
            setAvKeyStatus('checking');
            const currentMacro = useMarketStore.getState().macroData;
            const now = Date.now();
            const isStale = !currentMacro?.lastUpdated || (now - currentMacro.lastUpdated > 24 * 60 * 60 * 1000);

            if (!currentMacro || !currentMacro.gdp || isStale) {
                const result = await fetchAlphaVantageMacro(chartConfig.avKey);
                if (result) {
                    setAvKeyStatus('valid');
                    setMacroData({ ...result, lastUpdated: now });
                } else {
                    setAvKeyStatus('invalid');
                }
            } else {
                setAvKeyStatus('valid');
            }

            const status = await fetchGlobalMarketStatus(chartConfig.avKey);
            if (status) setMarketStatus(status);
        };
        const timer = setTimeout(validate, 1500);
        return () => clearTimeout(timer);
    }, [chartConfig.avKey, setAvKeyStatus, setMacroData, setMarketStatus]);

    // 2. Listen for External Data (Options Flow)
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data && event.data.type === 'OFA_DATA_UPDATE') {
                setExternalData(event.data.payload);
                setLastDataUpdate(Date.now());
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [setExternalData, setLastDataUpdate]);

    // 3. Fetch News & Macro Correlations
    useEffect(() => {
        const loadData = async () => {
            const news = await fetchRealNews(activeSymbol);
            setNewsData(news);
            const mc = await fetchMacroCorrelationData();
            setMacroCorrelations(mc);

            if (chartConfig.avKey) {
                setTimeout(async () => {
                    const avNews = await fetchAlphaVantageNews(chartConfig.avKey, activeSymbol);
                    if (avNews) setNewsData(avNews);
                }, 2000);
            }
        };
        loadData();
    }, [activeSymbol, setNewsData, setMacroCorrelations, chartConfig.avKey]);

    // 4. Main Market Data Loop
    useEffect(() => {
        const fetchData = async () => {
            const tf = timeframe.toLowerCase();
            const interval = tf;
            let range = '6mo';
            if (tf === '15m') range = '1mo';
            if (['1d', '1w'].includes(tf)) range = '10y';

            const { showPrePost } = useMarketStore.getState();

            try {
                const { candles, source } = await marketDataService.getCandles(activeSymbol, interval, range, showPrePost);
                setDataSource(source);

                // const quote = await marketDataService.getQuote(activeSymbol);
                // if (quote) setDataSource(quote.source); // Prefer candle source as it's the main view

                if (candles.length === 0) throw new Error("No valid candles found");

                setMarketData(candles);
                setConnectionStatus('live');

                const patterns = detectPatterns(candles);
                const macroDivs = detectMacroDivergences(candles, macroCorrelations);
                setScannedPatterns([...patterns, ...macroDivs]);

                const closes = candles.map(c => c.close);
                const volumes = candles.map(c => c.volume);
                const atr = calculateATR(candles);
                const regime = getVolatilityRegime(atr, candles);
                const lastVol = volumes[volumes.length - 1];
                const avgVol = calculateAvgVolume(volumes);
                const vwap = calculateVWAP(candles);

                if (closes.length > 0) {
                    const currentPrice = closes[closes.length - 1];
                    if (currentPrice > prevPriceRef.current) setPriceDir('up');
                    else if (currentPrice < prevPriceRef.current) setPriceDir('down');
                    prevPriceRef.current = currentPrice;
                }

                setTechnicals({
                    lastPrice: closes[closes.length - 1],
                    rsi: calculateRSI(closes),
                    sma: calculateSMA(closes, chartConfig.smaPeriod) || 0,
                    atr,
                    regime: regime as any, // Cast to match strict type if needed, or update utils
                    avgVolume: avgVol,
                    lastVolume: lastVol,
                    vwap
                });

            } catch (e) {
                console.warn("Data fetch failed, using mock data:", e);
                setConnectionStatus('mock');
                const mockCandles = generateMockData();
                setMarketData(mockCandles);
                const closes = mockCandles.map((c: any) => c.close);
                setTechnicals({
                    ...technicals,
                    lastPrice: closes[closes.length - 1],
                    rsi: calculateRSI(closes),
                    avgVolume: 0,
                    lastVolume: 0,
                    vwap: 0
                });
            }
        };

        fetchData();

        // Subscribe to Real-time Updates (WebSocket)
        marketDataService.subscribeToQuotes(activeSymbol, (quote) => {
            // Check if source is Alpaca to enable live UI
            if (quote.source.includes("Alpaca")) {
                setDataSource(quote.source);
            }

            setTechnicals({
                ...useMarketStore.getState().technicals,
                lastPrice: quote.price
            });

            // Note: We might want to append this live quote to the current candles if it's a new minute/bar
            // For now, updating the "Last Price" technical indicator provides the live feel.
        });

        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, [activeSymbol, timeframe, macroCorrelations, chartConfig.smaPeriod, setMarketData, setConnectionStatus, setScannedPatterns, setTechnicals, setPriceDir, showPrePost]);
};
