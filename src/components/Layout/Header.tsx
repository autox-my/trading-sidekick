import React, { useRef, useEffect } from 'react';
import {
    Activity,
    Search,
    ChevronRight,
    ChevronLeft,
    UploadCloud,
    MonitorPlay
} from 'lucide-react';
import { TIMEFRAMES, POPULAR_SYMBOLS } from '../../utils/constants';
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
        setIsSidebarOpen
    } = useUIStore();

    const activeSymbol = useMarketStore(state => state.activeSymbol);
    const setActiveSymbol = useMarketStore(state => state.setActiveSymbol);
    const searchInput = useMarketStore(state => state.searchInput);
    const setSearchInput = useMarketStore(state => state.setSearchInput);
    const searchSuggestions = useMarketStore(state => state.searchSuggestions);
    const setSearchSuggestions = useMarketStore(state => state.setSearchSuggestions);
    const showSuggestions = useMarketStore(state => state.showSuggestions);
    const setShowSuggestions = useMarketStore(state => state.setShowSuggestions);
    const timeframe = useMarketStore(state => state.timeframe);
    const setTimeframe = useMarketStore(state => state.setTimeframe);
    const darkPoolLevels = useMarketStore(state => state.darkPoolLevels);
    const setDarkPoolLevels = useMarketStore(state => state.setDarkPoolLevels);

    const { addMessage } = useChatStore();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);

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

    const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchInput(value);
        if (value.length > 0) {
            const filtered = POPULAR_SYMBOLS.filter((item: any) =>
                item.symbol.toLowerCase().includes(value.toLowerCase()) ||
                item.name.toLowerCase().includes(value.toLowerCase())
            ).slice(0, 6);
            setSearchSuggestions(filtered);
            setShowSuggestions(true);
        } else {
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
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur-md relative shrink-0 z-20">
            <div className="flex items-center gap-6 flex-1 min-w-0">
                <div className="flex items-center gap-2 text-indigo-400/90 shrink-0 mr-2">
                    <Activity className="w-5 h-5" />
                    <span className="font-bold text-base tracking-tight hidden sm:inline text-indigo-100">AI Trading Analyst</span>
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
                        className="w-full bg-slate-950/50 text-white placeholder-slate-500 text-sm rounded-xl py-2.5 pl-11 pr-4 border border-white/5 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner"
                    />
                    <Search className="w-4 h-4 text-slate-500 absolute left-4 top-3" />
                    {showSuggestions && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 max-h-60 overflow-y-auto">
                            {searchSuggestions.map((item: any, i: number) => (
                                <button key={i} onClick={() => selectSymbol(item.symbol)} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-800 flex justify-between items-center group">
                                    <span className="font-bold text-white">{item.symbol}</span>
                                    <span className="text-slate-500 group-hover:text-slate-300 truncate max-w-[120px]">{item.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center bg-slate-800/40 border border-white/5 rounded-lg p-0.5 ml-2">
                    <button onClick={() => setViewMode('chart')} className={`p-1.5 rounded-md transition-all ${viewMode === 'chart' ? 'bg-slate-700/80 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`} title="Price Chart"><Activity size={14} /></button>
                    <button onClick={() => setViewMode('options_flow')} className={`p-1.5 rounded-md transition-all ${viewMode === 'options_flow' ? 'bg-slate-700/80 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`} title="Options Flow Analyzer"><MonitorPlay size={14} /></button>
                </div>

                <div className="relative group">
                    <input type="file" accept=".csv" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" ref={fileInputRef} onChange={handleFileUpload} />
                    <button className={`p-2 rounded-lg transition-all border border-white/10 ${darkPoolLevels ? 'bg-indigo-900/20 text-indigo-300 border-indigo-500/30' : 'bg-slate-800/40 text-slate-400 hover:text-white'}`} title="Upload Dark Pool CSV"><UploadCloud size={16} /></button>
                </div>

                <div className="hidden sm:flex bg-slate-950/50 border border-white/5 rounded-xl p-1 ml-auto shrink-0">
                    {TIMEFRAMES.map(tf => (
                        <button key={tf} onClick={() => setTimeframe(tf)} className={`px-4 py-1.5 rounded-lg text-[11px] font-medium transition-all ${timeframe === tf ? 'bg-slate-800 text-white shadow-sm border border-white/5' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>{tf}</button>
                    ))}
                </div>
            </div>
            <div className="flex items-center gap-4 ml-6 shrink-0">
                <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-950/50 border border-white/5 rounded-full ${connectionStatus === 'live' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'live' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-amber-500'}`}></div>
                    <span className="text-[10px] font-bold uppercase tracking-wider">{connectionStatus === 'live' ? 'Live Feed' : 'Simulated'}</span>
                </div>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors">
                    {isSidebarOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                </button>
            </div>
        </header>
    );
};
