import React from 'react';
import { Settings, X, Key, Check, BarChart2, AlignJustify, Activity } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useMarketStore } from '../../store/useMarketStore';

export const ChartSettings: React.FC = () => {
    const { showChartSettings, setShowChartSettings, avKeyStatus } = useUIStore();
    const { chartConfig, setChartConfig } = useMarketStore();

    if (!showChartSettings) return null;

    return (
        <div className="absolute bottom-24 left-8 z-[100] bg-secondary/95 backdrop-blur-2xl border border-[rgba(var(--glass-border),0.3)] rounded-3xl shadow-2xl w-80 p-6 animate-in fade-in slide-in-from-bottom-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2"><Settings className="w-4 h-4 text-indigo-400" /> Display</h3>
                <button onClick={() => setShowChartSettings(false)}><X size={18} className="text-text-secondary hover:text-text-primary transition-colors" /></button>
            </div>

            {/* Chart Type Selector */}
            <div className="mb-6 p-1 bg-secondary/50 rounded-xl border border-[rgba(var(--glass-border),0.2)] flex gap-1">
                <button onClick={() => setChartConfig({ ...chartConfig, chartType: 'candle' })} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${chartConfig.chartType === 'candle' ? 'bg-indigo-600 text-white shadow-lg' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}>
                    <BarChart2 size={14} /> Candle
                </button>
                <button onClick={() => setChartConfig({ ...chartConfig, chartType: 'bar' })} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${chartConfig.chartType === 'bar' ? 'bg-indigo-600 text-white shadow-lg' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}>
                    <AlignJustify size={14} className="rotate-90" /> Bar
                </button>
                <button onClick={() => setChartConfig({ ...chartConfig, chartType: 'line' })} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${chartConfig.chartType === 'line' ? 'bg-indigo-600 text-white shadow-lg' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}>
                    <Activity size={14} /> Line
                </button>
            </div>

            <div className="mb-6 p-4 bg-secondary/50 rounded-2xl border border-[rgba(var(--glass-border),0.2)]">
                <label className="text-[10px] uppercase font-bold text-indigo-400 mb-2 block flex items-center gap-1.5 tracking-widest"><Key size={12} /> Alpha Vantage Key</label>
                <input type="password" placeholder="API Key..." value={chartConfig.avKey || ''} onChange={(e) => setChartConfig({ ...chartConfig, avKey: e.target.value })} className="w-full bg-secondary border border-[rgba(var(--glass-border),0.2)] rounded-xl px-3 py-2.5 text-xs text-text-primary focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all placeholder-text-secondary" />
                <div className="flex items-center gap-2 mt-3">
                    {avKeyStatus === 'valid' && <span className="text-[10px] text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20"><Check size={10} /> Active</span>}
                    {avKeyStatus === 'invalid' && <span className="text-[10px] text-rose-400 flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20"><X size={10} /> Invalid</span>}
                    {avKeyStatus === 'checking' && <span className="text-[10px] text-amber-400 animate-pulse bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">Checking...</span>}
                </div>
            </div>



            <div className="space-y-6">
                {/* Theme Section */}
                <div>
                    <label className="text-[10px] text-text-secondary font-bold uppercase mb-3 block tracking-widest">Theme</label>
                    <div className="flex items-center justify-between p-1 mb-3">
                        <span className="text-xs text-text-secondary font-medium">Mode</span>
                        <div className="flex bg-secondary/50 rounded-lg p-1 border border-[rgba(var(--glass-border),0.2)]">
                            <button
                                onClick={() => useUIStore.getState().setThemeMode('dark')}
                                className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${useUIStore.getState().theme.mode === 'dark' ? 'bg-slate-700 text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                            >
                                Dark
                            </button>
                            <button
                                onClick={() => useUIStore.getState().setThemeMode('light')}
                                className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${useUIStore.getState().theme.mode === 'light' ? 'bg-slate-200 text-slate-900 shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                            >
                                Light
                            </button>
                        </div>
                    </div>
                </div>
                <div className="h-px bg-[rgba(var(--glass-border),0.1)]"></div>
                {/* Widgets Section */}
                <div>
                    <label className="text-[10px] text-text-secondary font-bold uppercase mb-3 block tracking-widest">Widgets</label>
                    <div className="grid grid-cols-2 gap-2">
                        {['price', 'rsi', 'volume', 'volatility', 'sentiment', 'macro'].map((id) => {
                            const widget = useUIStore.getState().widgets[id];
                            if (!widget) return null;
                            return (
                                <button
                                    key={id}
                                    onClick={() => useUIStore.getState().toggleWidgetVisibility(id)}
                                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all flex items-center justify-between ${widget.visible ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-700' : 'bg-secondary/40 border-[rgba(var(--glass-border),0.2)] text-text-secondary hover:bg-white/5'}`}
                                >
                                    <span className="capitalize">{id}</span>
                                    <div className={`w-2 h-2 rounded-full ${widget.visible ? 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]' : 'bg-slate-700'}`} />
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="h-px bg-[rgba(var(--glass-border),0.1)]"></div>

                <div>
                    <label className="text-[10px] text-text-secondary font-bold uppercase mb-3 block tracking-widest">Layers</label>
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between p-1">
                            <span className="text-xs text-text-secondary font-medium">Grid Lines</span>
                            <button onClick={() => setChartConfig({ ...chartConfig, gridVisible: !chartConfig.gridVisible })} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${chartConfig.gridVisible ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${chartConfig.gridVisible ? 'translate-x-5' : 'translate-x-1'}`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between p-1">
                            <span className="text-xs text-text-secondary font-medium">Key Levels</span>
                            <button onClick={() => setChartConfig({ ...chartConfig, annotationVisible: !chartConfig.annotationVisible })} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${chartConfig.annotationVisible ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${chartConfig.annotationVisible ? 'translate-x-5' : 'translate-x-1'}`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between p-1">
                            <span className="text-xs text-text-secondary font-medium">Line Opacity</span>
                            <div className="flex items-center gap-2">
                                <input type="range" min="0" max="1" step="0.1" value={chartConfig.annotationOpacity} onChange={(e) => setChartConfig({ ...chartConfig, annotationOpacity: parseFloat(e.target.value) })} className="w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="h-px bg-[rgba(var(--glass-border),0.1)]"></div>
                <div>
                    <label className="text-[10px] text-text-secondary font-bold uppercase mb-3 block tracking-widest">Moving Avg</label>
                    <div className="flex items-center justify-between mb-3 p-1">
                        <span className="text-xs text-text-secondary font-medium">Show SMA</span>
                        <button onClick={() => setChartConfig({ ...chartConfig, smaVisible: !chartConfig.smaVisible })} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${chartConfig.smaVisible ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${chartConfig.smaVisible ? 'translate-x-5' : 'translate-x-1'}`} />
                        </button>
                    </div>
                    <div className="flex items-center justify-between p-1">
                        <span className="text-xs text-text-secondary font-medium">Length</span>
                        <input type="number" value={chartConfig.smaPeriod} onChange={(e) => setChartConfig({ ...chartConfig, smaPeriod: parseInt(e.target.value) })} className="w-16 bg-secondary/50 border border-[rgba(var(--glass-border),0.2)] rounded-lg px-2 py-1 text-xs text-center text-text-primary focus:border-indigo-500/50 outline-none" />
                    </div>
                    <div className="flex items-center justify-between p-1">
                        <span className="text-xs text-text-secondary font-medium">Opacity</span>
                        <input type="range" min="0" max="1" step="0.1" value={chartConfig.smaOpacity} onChange={(e) => setChartConfig({ ...chartConfig, smaOpacity: parseFloat(e.target.value) })} className="w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                    </div>
                </div>
                <div className="h-px bg-[rgba(var(--glass-border),0.1)]"></div>

                {/* Margins */}
                <div>
                    <label className="text-[10px] text-text-secondary font-bold uppercase mb-3 block tracking-widest">Margins</label>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-1">
                            <span className="text-xs text-text-secondary font-medium">Top</span>
                            <div className="flex items-center gap-2">
                                <input type="range" min="0" max="0.5" step="0.01" value={chartConfig.marginTop} onChange={(e) => setChartConfig({ ...chartConfig, marginTop: parseFloat(e.target.value) })} className="w-16 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                <span className="text-[10px] text-slate-500 w-6 text-right">{(chartConfig.marginTop * 100).toFixed(0)}%</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-1">
                            <span className="text-xs text-text-secondary font-medium">Bottom</span>
                            <div className="flex items-center gap-2">
                                <input type="range" min="0" max="0.5" step="0.01" value={chartConfig.marginBottom} onChange={(e) => setChartConfig({ ...chartConfig, marginBottom: parseFloat(e.target.value) })} className="w-16 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                <span className="text-[10px] text-slate-500 w-6 text-right">{(chartConfig.marginBottom * 100).toFixed(0)}%</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-1">
                            <span className="text-xs text-text-secondary font-medium">Right</span>
                            <div className="flex items-center gap-2">
                                <input type="range" min="0" max="0.5" step="0.01" value={chartConfig.marginRight} onChange={(e) => setChartConfig({ ...chartConfig, marginRight: parseFloat(e.target.value) })} className="w-16 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                <span className="text-[10px] text-slate-500 w-6 text-right">{(chartConfig.marginRight * 100).toFixed(0)}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-[rgba(var(--glass-border),0.1)]"></div>

                {/* Colors & Opacity */}
                <div>
                    <label className="text-[10px] text-text-secondary font-bold uppercase mb-3 block tracking-widest">Colors & Opacity</label>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-secondary/30 p-2 rounded-xl border border-[rgba(var(--glass-border),0.2)]">
                            <span className="text-[10px] text-text-secondary block mb-2 text-center">Bullish</span>
                            <input type="color" value={chartConfig.upColor} onChange={(e) => setChartConfig({ ...chartConfig, upColor: e.target.value })} className="w-full h-6 bg-transparent border-0 rounded cursor-pointer mb-2" />
                            <input type="range" min="0" max="1" step="0.1" value={chartConfig.upOpacity} onChange={(e) => setChartConfig({ ...chartConfig, upOpacity: parseFloat(e.target.value) })} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                        </div>
                        <div className="bg-secondary/30 p-2 rounded-xl border border-[rgba(var(--glass-border),0.2)]">
                            <span className="text-[10px] text-text-secondary block mb-2 text-center">Bearish</span>
                            <input type="color" value={chartConfig.downColor} onChange={(e) => setChartConfig({ ...chartConfig, downColor: e.target.value })} className="w-full h-6 bg-transparent border-0 rounded cursor-pointer mb-2" />
                            <input type="range" min="0" max="1" step="0.1" value={chartConfig.downOpacity} onChange={(e) => setChartConfig({ ...chartConfig, downOpacity: parseFloat(e.target.value) })} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
