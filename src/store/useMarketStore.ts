import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { marketDataService } from '../services/MarketDataService';
import type { TrendlineData } from '../components/Chart/plugins/TrendlinePrimitive';
import type { BoxData } from '../components/Chart/plugins/BoxPrimitive';
import type {
    Candle,
    Technicals,
    ChartConfig,
    NewsData,
    MacroData,
    MacroCorrelationData,
    DarkPoolData,
    MarketStatus,
    SearchResult,
    ElliottWave,
    PlaybookSetup
} from '../types';

const defaultChartConfig: ChartConfig = {
    upColor: '#22c55e',
    downColor: '#ef4444',
    upOpacity: 1,
    downOpacity: 1,
    borderUpColor: '#22c55e',
    borderDownColor: '#ef4444',
    wickUpColor: '#22c55e',
    wickDownColor: '#ef4444',
    gridVisible: true,
    axisVisible: true,
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
    marginRight: 0.1,
    volumeVisible: false,
    magnetMode: 'magnetOHLC'
};

interface MarketState {
    activeSymbol: string;
    timeframe: string;
    marketData: Candle[];
    technicals: Technicals;
    chartConfig: ChartConfig;
    scannedPatterns: string[];
    dismissedPatterns: string[];
    showSignals: boolean;
    newsData: NewsData | null;
    macroData: MacroData | null;
    macroCorrelations: MacroCorrelationData | null;
    darkPoolLevels: DarkPoolData | null;

    // Drawings
    trendlines: TrendlineData[];
    zones: BoxData[];

    externalData: any; // Keep any for now as structure is dynamic
    lastDataUpdate: number;
    priceDir: 'up' | 'down' | 'neutral';
    searchInput: string;
    marketStatus: MarketStatus | null;
    searchSuggestions: SearchResult[];
    showSuggestions: boolean;
    dataSource: string;

    // Elliott Wave Visualization
    elliottWaveData: ElliottWave[];
    showElliottWaves: boolean;

    // Playbook
    playbookSetup: PlaybookSetup | null;

    // Actions
    setActiveSymbol: (symbol: string) => void;
    setTimeframe: (tf: string) => void;
    setMarketData: (data: Candle[]) => void;
    setTechnicals: (techs: Technicals) => void;
    setPriceDir: (dir: 'up' | 'down' | 'neutral') => void;
    setChartConfig: (config: ChartConfig) => void;
    setScannedPatterns: (patterns: string[]) => void;
    setDismissedPatterns: (patterns: string[] | ((prev: string[]) => string[])) => void;
    setShowSignals: (show: boolean) => void;
    setNewsData: (data: NewsData | null) => void;
    setMacroData: (data: MacroData | null) => void;
    setMacroCorrelations: (data: MacroCorrelationData | null) => void;
    setDarkPoolLevels: (data: DarkPoolData | null) => void;
    setExternalData: (data: any) => void;
    setLastDataUpdate: (timestamp: number) => void;
    setMarketStatus: (status: MarketStatus | null) => void;
    setSearchInput: (input: string) => void;
    setSearchSuggestions: (suggestions: SearchResult[]) => void;
    setShowSuggestions: (show: boolean) => void;
    handleSearch: (e: React.FormEvent) => void;
    setDataSource: (source: string) => void;
    searchSymbols: (query: string) => Promise<void>;

    // Elliott Wave Actions
    setElliottWaveData: (data: ElliottWave[]) => void;
    setShowElliottWaves: (show: boolean) => void;

    // Playbook Actions
    setPlaybookSetup: (setup: PlaybookSetup | null) => void;

    // Ext Hours
    showPrePost: boolean;
    setShowPrePost: (show: boolean) => void;
}

export const useMarketStore = create<MarketState>()(
    persist(
        (set, get) => ({
            activeSymbol: 'SPY',
            timeframe: '1d',
            marketData: [],
            technicals: { lastPrice: 0, rsi: 0, sma: 0, atr: 0, regime: 'Neutral', avgVolume: 0, lastVolume: 0, vwap: 0 },
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
            marketStatus: null,
            searchSuggestions: [],
            showSuggestions: false,
            dataSource: 'Initializing...',

            elliottWaveData: [],
            showElliottWaves: false,
            playbookSetup: null,

            // Drawings
            trendlines: [],
            zones: [],

            showPrePost: false,

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
            setMarketStatus: (status) => set({ marketStatus: status }),
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
            setDataSource: (source) => set({ dataSource: source }),
            searchSymbols: async (query) => {
                if (!query.trim()) {
                    set({ searchSuggestions: [], showSuggestions: false });
                    return;
                }
                try {
                    const results = await marketDataService.searchSymbols(query);
                    set({ searchSuggestions: results, showSuggestions: true });
                } catch (e) {
                    console.error("Search failed", e);
                    set({ searchSuggestions: [], showSuggestions: false });
                }
            },

            setElliottWaveData: (data) => set({ elliottWaveData: data }),
            setShowElliottWaves: (show) => set({ showElliottWaves: show }),
            setPlaybookSetup: (setup) => set({ playbookSetup: setup }),

            setTrendlines: (lines) => set((state) => ({
                trendlines: typeof lines === 'function' ? lines(state.trendlines) : lines
            })),
            setZones: (zones) => set((state) => ({
                zones: typeof zones === 'function' ? zones(state.zones) : zones
            })),
            clearDrawings: () => set({ trendlines: [], zones: [] }),

            setShowPrePost: (show) => set({ showPrePost: show })
        }),
        {
            name: 'market-storage',
            partialize: (state) => ({
                timeframe: state.timeframe,
                chartConfig: state.chartConfig,
                macroData: state.macroData,
                marketStatus: state.marketStatus,
                activeSymbol: state.activeSymbol,
                trendlines: state.trendlines,
                zones: state.zones
            }),
        }
    )
);
