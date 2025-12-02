import React, { useRef } from 'react';
import {
    HelpCircle,
    Sparkles
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useChatStore } from '../../store/useChatStore';
import { useChart } from '../../hooks/useChart';

export const ChartArea: React.FC = () => {
    const {
        viewMode,
        activeAnnotation,
        setContextMenu,
        contextMenu
    } = useUIStore();

    const { sendMessage } = useChatStore();

    const chartContainerRef = useRef<HTMLDivElement>(null);
    useChart(chartContainerRef);

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



            {/* Ensure pointer events are enabled for the chart container */}
            <div ref={chartContainerRef} className="w-full h-full relative z-10">
            </div>
        </div>
    );
};
