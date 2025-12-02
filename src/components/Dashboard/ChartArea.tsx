import React, { useRef } from 'react';
import {
    HelpCircle,
    Sparkles,
    Settings,
    Bell
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useMarketStore } from '../../store/useMarketStore';
import { useChatStore } from '../../store/useChatStore';
import { useChart } from '../../hooks/useChart';

export const ChartArea: React.FC = () => {
    const {
        viewMode,
        // avKeyStatus, // Unused
        showChartSettings,
        setShowChartSettings,
        activeAnnotation,
        setContextMenu,
        contextMenu
    } = useUIStore();

    const {
        scannedPatterns,
        dismissedPatterns,
        setDismissedPatterns,
        showSignals,
        setShowSignals
    } = useMarketStore();

    const { sendMessage } = useChatStore();

    const chartContainerRef = useRef<HTMLDivElement>(null);
    useChart(chartContainerRef);
    // const prevSymbolTimeframe = useRef<string>(''); // Unused


    // Chart logic is now handled by useChart hook
    // We only keep the pattern click handler here

    const handlePatternClick = (pattern: string) => {
        sendMessage(`Explain the ${pattern} pattern detected on the chart.`);
        if (!dismissedPatterns.includes(pattern)) setDismissedPatterns((prev: string[]) => [...prev, pattern]);
    };

    return (
        <div className={`w-full h-full absolute inset-0 ${viewMode === 'chart' ? 'z-10 opacity-100 pointer-events-auto' : 'z-0 opacity-0 pointer-events-none'}`}>

            {/* Interactive "Why?" Annotation Tooltip */}
            {activeAnnotation && (
                <div
                    className="absolute z-50 bg-secondary/90 backdrop-blur-xl border border-indigo-500/30 text-text-primary px-4 py-3 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 pointer-events-none"
                    style={{ top: activeAnnotation.y - 50, left: '50%', transform: 'translateX(-50%)' }}
                >
                    <div className="text-[10px] uppercase font-bold text-indigo-300 flex items-center gap-1.5 mb-1 tracking-wider">
                        <HelpCircle size={12} /> Level Info
                    </div>
                    <div className="text-sm font-bold text-text-primary mb-1">{activeAnnotation.type}</div>
                    <div className="text-xs font-mono text-text-secondary bg-secondary/50 px-2.5 py-1 rounded-md inline-block border border-white/5">
                        ${activeAnnotation.price.toFixed(2)}
                    </div>
                </div>
            )}

            {/* Context Menu */}
            {contextMenu.visible && (
                <div
                    className="fixed z-50 bg-secondary/95 backdrop-blur-xl border border-[rgba(var(--glass-border),0.3)] rounded-xl shadow-2xl overflow-hidden min-w-[200px] animate-in fade-in zoom-in-95 duration-200"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <div className="px-4 py-2.5 text-[10px] uppercase font-bold text-text-secondary border-b border-white/5 bg-white/5 tracking-wider">Context Actions</div>
                    <button className="w-full text-left px-4 py-3 text-xs font-medium text-text-primary hover:bg-indigo-600/20 hover:text-indigo-300 flex items-center gap-3 transition-colors" onClick={(e) => {
                        e.stopPropagation();
                        setContextMenu({ ...contextMenu, visible: false });
                        if (contextMenu.data) {
                            const c = contextMenu.data;
                            const dateStr = new Date(c.time * 1000).toLocaleString();
                            sendMessage(`Analyze this specific candle from ${dateStr}:\nOpen: ${c.open}\nHigh: ${c.high}\nLow: ${c.low}\nClose: ${c.close}\nVolume: ${c.volume}\n\nWhat does this price action indicate in the context of the trend?`);
                        }
                    }}>
                        <Sparkles size={16} className="text-indigo-400" /> Ask Sidekick
                    </button>
                </div>
            )}

            <div className="absolute bottom-8 left-8 z-[60] flex gap-2">
                <div className="relative">
                    <button onClick={() => setShowChartSettings(!showChartSettings)} className={`p-3 backdrop-blur-xl border rounded-2xl transition-all shadow-lg group ${showChartSettings ? 'bg-indigo-600/90 border-indigo-500/50 text-white ring-2 ring-indigo-500/20' : 'bg-secondary/40 border-[rgba(var(--glass-border),0.3)] text-text-secondary hover:bg-secondary/60 hover:text-text-primary'}`}><Settings size={20} className="group-hover:rotate-90 transition-transform duration-500" /></button>
                </div>
                <div className="relative">
                    <button onClick={() => setShowSignals(!showSignals)} className={`p-3 backdrop-blur-xl border rounded-2xl transition-all shadow-lg ${scannedPatterns.length > 0 ? 'bg-indigo-600/90 border-indigo-500/50 text-white ring-2 ring-indigo-500/20' : 'bg-secondary/40 border-[rgba(var(--glass-border),0.3)] text-text-secondary hover:bg-secondary/60 hover:text-text-primary'}`}><Bell size={20} />{scannedPatterns.length > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-rose-500 rounded-full border-2 border-slate-900"></span>}</button>
                    {showSignals && (
                        <div className="absolute bottom-full left-0 mb-4 z-50 bg-secondary/95 backdrop-blur-xl border border-[rgba(var(--glass-border),0.3)] rounded-3xl shadow-2xl w-72 p-4 animate-in fade-in slide-in-from-bottom-4">
                            <h3 className="text-[10px] font-bold text-text-secondary uppercase px-2 py-1.5 mb-2 tracking-widest">Active Signals</h3>
                            {scannedPatterns.length === 0 ? (
                                <div className="text-xs text-text-secondary px-3 py-2 italic text-center bg-white/5 rounded-xl">No patterns detected yet.</div>
                            ) : (
                                <div className="space-y-1.5">
                                    {scannedPatterns.map((pat, i) => (
                                        <button key={i} onClick={() => { handlePatternClick(pat); setShowSignals(false); }} className="w-full text-left px-4 py-3 text-xs text-text-primary hover:bg-white/5 rounded-xl flex items-center gap-3 group transition-colors">
                                            <div className={`w-2 h-2 rounded-full ${dismissedPatterns.includes(pat) ? 'bg-slate-600' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'}`}></div>
                                            <span className={`font-medium ${dismissedPatterns.includes(pat) ? 'text-slate-500 line-through' : ''}`}>{pat}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Ensure pointer events are enabled for the chart container */}
            <div ref={chartContainerRef} className="w-full h-full relative z-10">
            </div>
        </div>
    );
};
