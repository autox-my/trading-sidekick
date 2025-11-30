import { useEffect, useRef } from 'react';
import { Header } from './components/Layout/Header';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ChartArea } from './components/Dashboard/ChartArea';
import { HUD } from './components/Dashboard/HUD';
import { ScannerChips } from './components/Dashboard/ScannerChips';
import { OptionsFlow } from './components/Dashboard/OptionsFlow';
import { SidekickPanel } from './components/Dashboard/SidekickPanel';
import { ChartSettings } from './components/Dashboard/ChartSettings';
import { YAHOO_INTERVALS } from './utils/constants';
import {
  calculateRSI,
  calculateSMA,
  calculateATR,
  getVolatilityRegime,
  calculateAvgVolume
} from './utils/calculations';
import {
  generateMockData,
  detectPatterns,
  detectMacroDivergences
} from './utils/helpers';
import {
  fetchAlphaVantageMacro,
  fetchRealNews,
  fetchMacroCorrelationData
} from './services/api';
import { useUIStore } from './store/useUIStore';
import { useMarketStore } from './store/useMarketStore';

// --- CUSTOM ANIMATION STYLES ---
const animationStyles = `
@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes popIn {
  0% { opacity: 0; transform: scale(0.95) translateY(5px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes flashGreen {
  0% { background-color: rgba(16, 185, 129, 0.2); color: #6ee7b7; }
  100% { background-color: transparent; color: inherit; }
}
@keyframes flashRed {
  0% { background-color: rgba(244, 63, 94, 0.2); color: #fda4af; }
  100% { background-color: transparent; color: inherit; }
}
.animate-slideUp { animation: slideUp 0.4s cubic-bezier(0.2, 0.0, 0.2, 1) forwards; }
.animate-popIn { animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
`;

export default function TradingSidekickApp() {
  const {
    isSidebarOpen,
    viewMode,
    setAvKeyStatus,
    setConnectionStatus,
    theme
  } = useUIStore();

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
    setLastDataUpdate
  } = useMarketStore();

  // Direction tracking for price tick
  const prevPriceRef = useRef(0);

  // --- EFFECTS ---
  useEffect(() => {
    if (!chartConfig.avKey) { setAvKeyStatus('idle'); return; }
    const validate = async () => {
      setAvKeyStatus('checking');
      const result = await fetchAlphaVantageMacro(chartConfig.avKey);
      if (result) {
        setAvKeyStatus('valid');
        setMacroData(result);
      } else setAvKeyStatus('invalid');
    };
    const timer = setTimeout(validate, 1500);
    return () => clearTimeout(timer);
  }, [chartConfig.avKey, setAvKeyStatus, setMacroData]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'OFA_DATA_UPDATE') {
        setExternalData(event.data.payload);
        setLastDataUpdate(new Date());
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setExternalData, setLastDataUpdate]);

  useEffect(() => {
    const loadData = async () => {
      const news = await fetchRealNews(activeSymbol);
      setNewsData(news);
      const mc = await fetchMacroCorrelationData();
      setMacroCorrelations(mc);
    };
    loadData();
  }, [activeSymbol, setNewsData, setMacroCorrelations]);

  useEffect(() => {
    const fetchData = async () => {
      const interval = YAHOO_INTERVALS[timeframe] || '1h';
      let range = '6mo';
      if (timeframe === '15m') range = '1mo';
      if (['1d', '1w', '1D', '1W'].includes(timeframe)) range = '10y'; // Fetch more data for long-term analysis
      const proxyUrl = "https://corsproxy.io/?";
      const targetUrl = encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${activeSymbol}?interval=${interval}&range=${range}`);
      try {
        console.log(`Fetching data for ${activeSymbol}...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const response = await fetch(proxyUrl + targetUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const json = await response.json();
        if (!json.chart || !json.chart.result || !json.chart.result[0]) throw new Error("Invalid API response structure");

        const result = json.chart.result[0];
        const timestamps = result.timestamp;
        const quotes = result.indicators.quote[0];

        if (!timestamps || !quotes) throw new Error("Missing timestamp or quote data");

        const candles = timestamps.map((t: number, i: number) => ({
          time: t,
          open: Number(quotes.open[i]),
          high: Number(quotes.high[i]),
          low: Number(quotes.low[i]),
          close: Number(quotes.close[i]),
          volume: Number(quotes.volume[i])
        })).filter((c: any) =>
          !isNaN(c.close) && c.close > 0 &&
          !isNaN(c.open) && c.open > 0 &&
          !isNaN(c.high) && c.high > 0 &&
          !isNaN(c.low) && c.low > 0
        );

        if (candles.length === 0) throw new Error("No valid candles found");

        console.log(`Loaded ${candles.length} candles.`);
        setMarketData(candles);
        setConnectionStatus('live');
        const patterns = detectPatterns(candles);
        const macroDivs = detectMacroDivergences(candles, macroCorrelations);
        const combinedAlerts = [...patterns, ...macroDivs];
        // We don't check for equality here, just update. Store can handle equality check if needed.
        setScannedPatterns(combinedAlerts);

        const closes = candles.map((c: any) => c.close);
        const volumes = candles.map((c: any) => c.volume);
        const atr = calculateATR(candles);
        const regime = getVolatilityRegime(atr, candles);
        const lastVol = volumes[volumes.length - 1];
        const avgVol = calculateAvgVolume(volumes);

        // Update price direction for animated ticks
        if (closes.length > 0) {
          const currentPrice = closes[closes.length - 1];
          if (currentPrice > prevPriceRef.current) setPriceDir('up');
          else if (currentPrice < prevPriceRef.current) setPriceDir('down');
          prevPriceRef.current = currentPrice;
        }

        setTechnicals({ lastPrice: closes[closes.length - 1], rsi: calculateRSI(closes), sma: calculateSMA(closes, chartConfig.smaPeriod), atr, regime, avgVolume: avgVol, lastVolume: lastVol });
      } catch (e) {
        console.warn("Data fetch failed, using mock data:", e);
        // MOCK DATA FALLBACK
        setConnectionStatus('mock');
        const mockCandles = generateMockData();
        setMarketData(mockCandles);
        const closes = mockCandles.map((c: any) => c.close);
        setTechnicals({ ...technicals, lastPrice: closes[closes.length - 1], rsi: calculateRSI(closes) });
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [activeSymbol, timeframe, macroCorrelations, chartConfig.smaPeriod, setMarketData, setConnectionStatus, setScannedPatterns, setTechnicals, setPriceDir]);

  return (
    <>
      <style>{animationStyles}</style>
      <div className={`flex h-screen w-full font-sans overflow-hidden tracking-wide selection:bg-indigo-500/30 ${theme.mode === 'light' ? 'light bg-slate-50 text-slate-900' : 'bg-[#0a0e17] text-slate-300'}`}>
        <div className={`flex flex-col flex-1 min-w-0 transition-all duration-0 ${isSidebarOpen ? 'mr-0' : ''}`}>
          <Header />

          <main className={`flex-1 relative group h-full overflow-hidden ${theme.mode === 'light' ? 'bg-gradient-to-b from-slate-50 to-white' : 'bg-gradient-to-b from-[#0a0e17] to-[#0f172a]'}`}>
            {viewMode === 'chart' ? (
              <>
                <HUD />
                <ScannerChips />
                <ErrorBoundary>
                  <ChartArea />
                </ErrorBoundary>
                <ChartSettings />
              </>
            ) : (
              <OptionsFlow />
            )}
          </main>
        </div>

        <SidekickPanel />
      </div>
    </>
  );
}