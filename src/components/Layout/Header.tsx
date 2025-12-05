import React, { useRef, useEffect } from 'react';
import {
    Activity,
    Search,
    ChevronRight,
    ChevronLeft,
    UploadCloud,
    MonitorPlay
} from 'lucide-react';
import { TIMEFRAMES } from '../../utils/constants';
import { useUIStore } from '../../store/useUIStore';
import { useMarketStore } from '../../store/useMarketStore';
import { processDarkPoolData } from '../../utils/darkpool';
import { useChatStore } from '../../store/useChatStore';

export const Header: React.FC = () => {
    const {
        viewMode,
        setViewMode,
        connectionStatus,
        isSidebarOpen,
        setIsSidebarOpen,
        theme
    } = useUIStore();

    const activeSymbol = useMarketStore(state => state.activeSymbol);
    const setActiveSymbol = useMarketStore(state => state.setActiveSymbol);
    const searchInput = useMarketStore(state => state.searchInput);
    const setSearchInput = useMarketStore(state => state.setSearchInput);
    const searchSuggestions = useMarketStore(state => state.searchSuggestions);
    const showSuggestions = useMarketStore(state => state.showSuggestions);
    const setShowSuggestions = useMarketStore(state => state.setShowSuggestions);
    const searchSymbols = useMarketStore(state => state.searchSymbols);
    const timeframe = useMarketStore(state => state.timeframe);
    const setTimeframe = useMarketStore(state => state.setTimeframe);
    const darkPoolLevels = useMarketStore(state => state.darkPoolLevels);
    const setDarkPoolLevels = useMarketStore(state => state.setDarkPoolLevels);
    const marketStatus = useMarketStore(state => state.marketStatus);
    const dataSource = useMarketStore(state => state.dataSource);
    const showPrePost = useMarketStore(state => state.showPrePost);
    const setShowPrePost = useMarketStore(state => state.setShowPrePost);

    const { addMessage } = useChatStore();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);

    const isDark = theme.mode === 'dark';

    // Handle Click Outside for Search
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [setShowSuggestions]);

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchInput.length > 1) {
                searchSymbols(searchInput);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchInput, searchSymbols]);

    const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchInput(value);
        if (value.length === 0) {
            setShowSuggestions(false);
        }
    };

    const selectSymbol = (symbol: string) => {
        setActiveSymbol(symbol);
        setSearchInput('');
        setShowSuggestions(false);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target?.result as string;
            const data = processDarkPoolData(text);
            if (data) {
                setDarkPoolLevels(data);
                addMessage({
                    role: 'assistant',
                    text: `**Dark Pool Data Loaded**\nI've identified ${data.levels.length} major aggregation levels and ${data.signatures.length} signature prints. I will now incorporate these Institutional Walls into my analysis.`
                });
            }
        };
        reader.readAsText(file);
    };

    return (
        <header className={`h-16 border-b flex items-center justify-between px-6 backdrop-blur-md relative shrink-0 z-20 transition-colors duration-300 ${isDark ? 'bg-slate-900/50 border-white/5' : 'bg-white/80 border-slate-200'}`}>
            <div className="flex items-center gap-6 flex-1 min-w-0">
                <div className={`flex items-center gap-2 shrink-0 mr-2 transition-colors duration-300 ${isDark ? 'text-indigo-400/90' : 'text-indigo-600'}`}>
                    <Activity className="w-5 h-5" />
                    <span className={`font-bold text-base tracking-tight hidden sm:inline transition-colors duration-300 ${isDark ? 'text-indigo-100' : 'text-slate-900'}`}>AI Trading Analyst</span>
                </div>

                <div className="relative group w-full max-w-md" ref={searchRef}>
                    <input
                        type="text"
                        value={searchInput}
                        onChange={handleSearchInput}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && searchInput) {
                                selectSymbol(searchInput.toUpperCase());
                            }
                        }}
                        onClick={() => searchInput && setShowSuggestions(true)}
                        placeholder={activeSymbol}
                        className={`w-full text-sm rounded-xl py-2.5 pl-11 pr-4 border focus:ring-1 transition-all shadow-inner ${isDark ? 'bg-slate-950/50 text-white placeholder-slate-500 border-white/5 focus:border-indigo-500/50 focus:ring-indigo-500/50' : 'bg-slate-100 text-slate-900 placeholder-slate-400 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500'}`}
                    />
                    <Search className={`w-4 h-4 absolute left-4 top-3 transition-colors duration-300 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                    {showSuggestions && (
                        <div className={`absolute top-full left-0 right-0 mt-2 border rounded-xl shadow-2xl overflow-hidden z-50 max-h-60 overflow-y-auto ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                            {searchSuggestions.map((item: any, i: number) => (
                                <button key={i} onClick={() => selectSymbol(item.symbol)} className={`w-full text-left px-4 py-2.5 text-xs flex justify-between items-center group border-b last:border-0 ${isDark ? 'hover:bg-slate-800 border-white/5' : 'hover:bg-slate-50 border-slate-100'}`}>
                                    <div className="flex flex-col">
                                        <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.symbol}</span>
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">{item.exchange} • {item.type}</span>
                                    </div>
                                    <span className={`truncate max-w-[120px] text-right ${isDark ? 'text-slate-400 group-hover:text-slate-200' : 'text-slate-400 group-hover:text-slate-600'}`}>{item.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className={`flex items-center border rounded-lg p-0.5 ml-2 transition-colors duration-300 ${isDark ? 'bg-slate-800/40 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                    <button onClick={() => setViewMode('chart')} className={`p-1.5 rounded-md transition-all ${viewMode === 'chart' ? (isDark ? 'bg-slate-700/80 text-white shadow-sm' : 'bg-white text-indigo-600 shadow-sm') : 'text-slate-400 hover:text-slate-600'}`} title="Price Chart"><Activity size={14} /></button>
                    <button onClick={() => setViewMode('options_flow')} className={`p-1.5 rounded-md transition-all ${viewMode === 'options_flow' ? (isDark ? 'bg-slate-700/80 text-white shadow-sm' : 'bg-white text-indigo-600 shadow-sm') : 'text-slate-400 hover:text-slate-600'}`} title="Options Flow Analyzer"><MonitorPlay size={14} /></button>
                </div>

                <div className="relative group">
                    <input type="file" accept=".csv" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" ref={fileInputRef} onChange={handleFileUpload} />
                    <button className={`p-2 rounded-lg transition-all border ${darkPoolLevels ? 'bg-indigo-900/20 text-indigo-300 border-indigo-500/30' : (isDark ? 'bg-slate-800/40 text-slate-400 hover:text-white border-white/10' : 'bg-slate-100 text-slate-400 hover:text-slate-600 border-slate-200')}`} title="Upload Dark Pool CSV"><UploadCloud size={16} /></button>
                </div>

                <div className={`hidden sm:flex border rounded-xl p-1 ml-auto shrink-0 transition-colors duration-300 ${isDark ? 'bg-slate-950/50 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                    {TIMEFRAMES.map(tf => (
                        <button key={tf} onClick={() => setTimeframe(tf)} className={`px-4 py-1.5 rounded-lg text-[11px] font-medium transition-all ${timeframe === tf ? (isDark ? 'bg-slate-800 text-white shadow-sm border border-white/5' : 'bg-white text-indigo-600 shadow-sm border border-slate-200') : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>{tf}</button>
                    ))}
                </div>
            </div>
            <div className="flex items-center gap-4 ml-6 shrink-0">
                <button
                    onClick={() => setShowPrePost(!showPrePost)}
                    className={`hidden sm:flex items-center gap-2 px-3 py-1.5 border rounded-full transition-colors duration-300 hover:bg-black/5 dark:hover:bg-white/5 ${isDark ? 'bg-slate-950/50 border-white/5' : 'bg-slate-100 border-slate-200'} ${marketStatus?.current_status ? (marketStatus.current_status === 'open' ? 'text-emerald-400' : 'text-amber-400') : (connectionStatus === 'live' ? 'text-emerald-400' : 'text-amber-400')}`}
                    title="Toggle Extended Hours"
                >
                    <div className={`w-1.5 h-1.5 rounded-full ${marketStatus?.current_status ? (marketStatus.current_status === 'open' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-amber-500') : (connectionStatus === 'live' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-amber-500')}`}></div>
                    <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        {marketStatus?.current_status
                            ? (marketStatus.current_status === 'open' ? 'Market Open' : 'Market Closed')
                            : (connectionStatus === 'live' ? 'Live Feed' : 'Simulated')}
                        {showPrePost && <span className="opacity-75 font-normal ml-1">(Ext)</span>}
                    </span>
                </button>

                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-100'}`}>
                    {isSidebarOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                </button>
            </div>
        </header>
    );
};
