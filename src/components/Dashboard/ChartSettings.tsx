import React from 'react';
import { Settings, Key, Check, BarChart2, AlignJustify, Activity, X, PenTool, Trash2, Layers, Monitor, Droplet, Grid, Magnet } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useMarketStore } from '../../store/useMarketStore';

export const ChartSettings: React.FC = () => {
    const { avKeyStatus, theme, setThemeMode, activeTool, setActiveTool } = useUIStore();
    const { chartConfig, setChartConfig, clearDrawings } = useMarketStore();

    const SectionHeader: React.FC<{ icon: React.ReactNode, title: string }> = ({ icon, title }) => (
        <div className="flex items-center gap-2 mb-3 text-xs font-bold text-indigo-400 uppercase tracking-wider">
            {icon}
            <span>{title}</span>
        </div>
    );

    return (
        <div className="flex flex-col h-full overflow-y-auto bg-background/50 backdrop-blur-sm">

            {/* Header */}
            <div className="p-4 border-b border-white/5 sticky top-0 bg-background/95 z-10 backdrop-blur-md">
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                    <Settings className="w-5 h-5 text-indigo-500" /> Settings
                </h2>
            </div>

            <div className="p-4 space-y-8">

                {/* 1. Chart Style */}
                <section>
                    <SectionHeader icon={<Activity size={12} />} title="Chart Style" />
                    <div className="flex bg-secondary/30 p-1 rounded-xl border border-white/5 gap-1">
                        {[
                            { id: 'candle', icon: <BarChart2 size={14} />, label: 'Candle' },
                            { id: 'bar', icon: <AlignJustify size={14} className="rotate-90" />, label: 'Bar' },
                            { id: 'line', icon: <Activity size={14} />, label: 'Line' }
                        ].map((type) => (
                            <button
                                key={type.id}
                                onClick={() => setChartConfig({ ...chartConfig, chartType: type.id as any })}
                                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${chartConfig.chartType === type.id
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                        : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                                    }`}
                            >
                                {type.icon} {type.label}
                            </button>
                        ))}
                    </div>
                </section>

                {/* 2. Drawing Tools */}
                <section>
                    <SectionHeader icon={<PenTool size={12} />} title="Drawing Tools" />
                    <div className="grid grid-cols-3 gap-2 mb-2">
                        {[
                            { id: 'trendline', label: 'Trendline' },
                            { id: 'box', label: 'Zones' },
                            { id: 'avwap', label: 'AVWAP' }
                        ].map((tool) => (
                            <button
                                key={tool.id}
                                onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id as any)}
                                className={`py-2 px-3 rounded-lg text-xs font-medium transition-all border ${activeTool === tool.id
                                        ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                                        : 'bg-secondary/30 border-white/5 text-text-secondary hover:bg-white/5 hover:text-text-primary'
                                    }`}
                            >
                                {tool.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={clearDrawings}
                        className="w-full py-2 rounded-lg text-xs font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all flex items-center justify-center gap-2"
                    >
                        <Trash2 size={14} /> Clear All Drawings
                    </button>
                </section>

                {/* 3. Layers & Overlays */}
                <section>
                    <SectionHeader icon={<Layers size={12} />} title="Layers" />
                    <div className="space-y-3 bg-secondary/20 p-3 rounded-xl border border-white/5">

                        {/* Toggles */}
                        {[
                            { label: 'Volume Pane', prop: 'volumeVisible' },
                            { label: 'Grid Lines', prop: 'gridVisible' },
                            { label: 'Key Levels', prop: 'annotationVisible' },
                            { label: 'SMA Overlay', prop: 'smaVisible' }
                        ].map((item) => (
                            <div key={item.prop} className="flex items-center justify-between">
                                <span className="text-xs text-text-secondary font-medium">{item.label}</span>
                                <button
                                    onClick={() => setChartConfig({ ...chartConfig, [item.prop]: !chartConfig[item.prop as keyof typeof chartConfig] })}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${chartConfig[item.prop as keyof typeof chartConfig] ? 'bg-indigo-600' : 'bg-slate-700/50'
                                        }`}
                                >
                                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${chartConfig[item.prop as keyof typeof chartConfig] ? 'translate-x-5' : 'translate-x-1'
                                        }`} />
                                </button>
                            </div>
                        ))}

                        <div className="h-px bg-white/5 my-2" />

                        {/* SMA Config */}
                        {chartConfig.smaVisible && (
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-text-secondary font-medium flex items-center gap-1.5">SMA Length</span>
                                <input
                                    type="number"
                                    value={chartConfig.smaPeriod}
                                    onChange={(e) => setChartConfig({ ...chartConfig, smaPeriod: parseInt(e.target.value) || 20 })}
                                    className="w-16 bg-background/50 border border-white/10 rounded px-2 py-1 text-xs text-right text-text-primary outline-none focus:border-indigo-500"
                                />
                            </div>
                        )}

                        {/* Magnet Mode */}
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-text-secondary font-medium flex items-center gap-1.5"><Magnet size={12} /> Magnet Mode</span>
                            <select
                                value={chartConfig.magnetMode || 'magnetOHLC'}
                                onChange={(e) => setChartConfig({ ...chartConfig, magnetMode: e.target.value as any })}
                                className="bg-background/50 border border-white/10 text-xs text-text-primary rounded px-2 py-1 outline-none focus:border-indigo-500"
                            >
                                <option value="normal">Off</option>
                                <option value="magnet">Close</option>
                                <option value="magnetOHLC">OHLC</option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* 4. Appearance */}
                <section>
                    <SectionHeader icon={<Droplet size={12} />} title="Appearance" />

                    {/* Theme Toggle */}
                    <div className="flex bg-secondary/30 p-1 rounded-lg border border-white/5 mb-4">
                        <button
                            onClick={() => setThemeMode('dark')}
                            className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${theme.mode === 'dark' ? 'bg-slate-700 text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
                                }`}
                        >
                            Dark
                        </button>
                        <button
                            onClick={() => setThemeMode('light')}
                            className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${theme.mode === 'light' ? 'bg-slate-200 text-slate-900 shadow-sm' : 'text-text-secondary hover:text-text-primary'
                                }`}
                        >
                            Light
                        </button>
                    </div>

                    <div className="space-y-2">
                        {/* Opacity Sliders */}
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-text-secondary">Line Opacity</span>
                            <input type="range" min="0" max="1" step="0.1"
                                value={chartConfig.annotationOpacity}
                                onChange={(e) => setChartConfig({ ...chartConfig, annotationOpacity: parseFloat(e.target.value) })}
                                className="w-24 h-1.5 bg-slate-700/50 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                        </div>
                    </div>
                </section>

                {/* 5. Configuration (API) */}
                <section>
                    <SectionHeader icon={<Key size={12} />} title="Data Access" />
                    <div className="p-3 bg-secondary/20 rounded-xl border border-white/5">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-[10px] uppercase font-bold text-text-secondary block">Alpha Vantage Key</label>
                            <div className="flex items-center gap-1.5">
                                {avKeyStatus === 'valid' && <span className="text-[10px] text-emerald-400 flex items-center gap-1"><Check size={10} /> Active</span>}
                                {avKeyStatus === 'invalid' && <span className="text-[10px] text-rose-400 flex items-center gap-1"><X size={10} /> Invalid</span>}
                            </div>
                        </div>
                        <input
                            type="password"
                            placeholder="Paste API Key..."
                            value={chartConfig.avKey || ''}
                            onChange={(e) => setChartConfig({ ...chartConfig, avKey: e.target.value })}
                            className="w-full bg-background/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-text-primary focus:border-indigo-500 outline-none transition-all placeholder:text-text-secondary/50"
                        />
                    </div>
                </section>

            </div>
        </div>
    );
};
