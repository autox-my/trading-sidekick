import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { POPULAR_SYMBOLS } from '../utils/constants';

interface Technicals {
    rsi: number;
    sma: number;
    lastPrice: number;
    avgVolume: number;
    lastVolume: number;
    atr: number;
    regime: string;
}

interface ChartConfig {
    upColor: string;
    downColor: string;
    upOpacity: number;
    downOpacity: number;
    borderUpColor: string;
    borderDownColor: string;
    gridVisible: boolean;
    background: string;
    smaPeriod: number;
    smaVisible: boolean;
    smaColor: string;
    smaOpacity: number;
    avKey: string;
    annotationVisible: boolean;
    annotationColor: string;
    annotationOpacity: number;
    chartType: 'candle' | 'bar' | 'line';
    marginTop: number;
    marginBottom: number;
    marginRight: number;
}

const defaultChartConfig: ChartConfig = {
    upColor: '#22c55e',
    downColor: '#ef4444',
    upOpacity: 1,
    downOpacity: 1,
    borderUpColor: '#22c55e',
    borderDownColor: '#ef4444',
    gridVisible: true,
    background: '#0f172a',
    smaPeriod: 20,
    smaVisible: true,
    smaColor: '#3b82f6',
    smaOpacity: 1,
    avKey: '',
    annotationVisible: true,
    annotationColor: '#0ea5e9',
    annotationOpacity: 0.6,
    chartType: 'candle',
    marginTop: 0.05,
    marginBottom: 0.05,
    marginRight: 0.1
};

interface MarketState {
    activeSymbol: string;
    timeframe: string;
    marketData: any[];
    technicals: any;
    chartConfig: ChartConfig;
    scannedPatterns: string[];
    dismissedPatterns: string[];
    showSignals: boolean;
    newsData: any;
    macroData: any;
    macroCorrelations: any;
    darkPoolLevels: any;
    externalData: any;
    lastDataUpdate: number;
    priceDir: 'up' | 'down' | 'neutral';
    searchInput: string;
    searchSuggestions: any[];
    showSuggestions: boolean;

    // Elliott Wave Visualization
    elliottWaveData: any[];
    showElliottWaves: boolean;

    // Actions
    // Actions
    setActiveSymbol: (symbol: string) => void;
    setTimeframe: (tf: string) => void;
    setMarketData: (data: any[]) => void;
    setTechnicals: (techs: any) => void;
    setPriceDir: (dir: 'up' | 'down' | 'neutral') => void;
    setChartConfig: (config: ChartConfig) => void;
    setScannedPatterns: (patterns: string[]) => void;
    setDismissedPatterns: (patterns: string[] | ((prev: string[]) => string[])) => void;
    setShowSignals: (show: boolean) => void;
    setNewsData: (data: any) => void;
    setMacroData: (data: any) => void;
    setMacroCorrelations: (data: any) => void;
    setDarkPoolLevels: (data: any) => void;
    setExternalData: (data: any) => void;
    setLastDataUpdate: (timestamp: any) => void;
    setSearchInput: (input: string) => void;
    setSearchSuggestions: (suggestions: any[]) => void;
    setShowSuggestions: (show: boolean) => void;
    handleSearch: (e: React.FormEvent) => void;

    // Elliott Wave Actions
    setElliottWaveData: (data: any[]) => void;
    setShowElliottWaves: (show: boolean) => void;
}

export const useMarketStore = create<MarketState>()(
    persist(
        (set, get) => ({
            activeSymbol: 'SPY',
            timeframe: '1D',
            marketData: [],
            technicals: { lastPrice: 0, rsi: 0, sma: 0, atr: 0, regime: 'Neutral' },
            chartConfig: defaultChartConfig,
            scannedPatterns: [],
            dismissedPatterns: [],
            showSignals: false,
            newsData: null,
            macroData: null,
            macroCorrelations: null,
            darkPoolLevels: null,
            externalData: null,
            lastDataUpdate: 0,
            priceDir: 'neutral',
            searchInput: '',
            searchSuggestions: [],
            showSuggestions: false,

            elliottWaveData: [],
            showElliottWaves: true,

            setActiveSymbol: (symbol) => set({ activeSymbol: symbol }),
            setTimeframe: (tf) => set({ timeframe: tf }),
            setMarketData: (data) => set({ marketData: data, lastDataUpdate: Date.now() }),
            setLastDataUpdate: (timestamp) => set({ lastDataUpdate: timestamp }),
            setTechnicals: (techs) => set({ technicals: techs }),
            setPriceDir: (dir) => set({ priceDir: dir }),

            setChartConfig: (config) => set({ chartConfig: config }),
            setScannedPatterns: (patterns) => set({ scannedPatterns: patterns }),
            setDismissedPatterns: (patterns) => set((state) => ({
                dismissedPatterns: typeof patterns === 'function' ? patterns(state.dismissedPatterns) : patterns
            })),
            setShowSignals: (show) => set({ showSignals: show }),
            setNewsData: (data) => set({ newsData: data }),
            setMacroData: (data) => set({ macroData: data }),
            setMacroCorrelations: (data) => set({ macroCorrelations: data }),
            setDarkPoolLevels: (data) => set({ darkPoolLevels: data }),
            setExternalData: (data) => set({ externalData: data }),
            setSearchInput: (input) => set({ searchInput: input }),
            setSearchSuggestions: (suggestions) => set({ searchSuggestions: suggestions }),
            setShowSuggestions: (show) => set({ showSuggestions: show }),
            handleSearch: (e) => {
                e.preventDefault();
                const { searchInput } = get();
                if (searchInput.trim()) {
                    set({ activeSymbol: searchInput.toUpperCase(), searchInput: '', showSuggestions: false });
                }
            },

            setElliottWaveData: (data) => set({ elliottWaveData: data }),
            setShowElliottWaves: (show) => set({ showElliottWaves: show })
        }),
        {
            name: 'market-storage',
            partialize: (state) => ({
                timeframe: state.timeframe,
                chartConfig: state.chartConfig
            }),
        }
    )
);
