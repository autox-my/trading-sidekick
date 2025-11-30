import React from 'react';
import { Bell, X } from 'lucide-react';
import { useMarketStore } from '../../store/useMarketStore';
import { useChatStore } from '../../store/useChatStore';

export const ScannerChips: React.FC = () => {
    const { scannedPatterns, dismissedPatterns, setDismissedPatterns } = useMarketStore();
    const { sendMessage } = useChatStore();

    const handlePatternClick = (pattern: string) => {
        sendMessage(`Explain the ${pattern} pattern detected on the chart.`);
        if (!dismissedPatterns.includes(pattern)) {
            setDismissedPatterns((prev: string[]) => [...prev, pattern]);
        }
    };

    // Helper to categorize patterns for visual chips
    const getPatternType = (pattern: string) => {
        const p = pattern.toLowerCase();
        if (p.includes('bull') || p.includes('hammer')) return 'bullish';
        if (p.includes('bear')) return 'bearish';
        return 'neutral';
    };

    const activePatterns = scannedPatterns.filter(p => !dismissedPatterns.includes(p));

    if (activePatterns.length === 0) return null;

    return (
        <div className="absolute bottom-24 left-8 z-20 flex gap-3 animate-in fade-in slide-in-from-bottom-4">
            {activePatterns.map((pat, i) => {
                const type = getPatternType(pat);
                let chipClass = "bg-slate-800/60 text-slate-300 border-white/10 hover:bg-slate-800";
                if (type === 'bullish') chipClass = "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]";
                if (type === 'bearish') chipClass = "bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.2)]";

                return (
                    <div key={i} className={`group flex items-center gap-0 backdrop-blur-xl border rounded-full transition-all hover:scale-105 cursor-pointer ${chipClass}`}>
                        <button onClick={() => handlePatternClick(pat)} className="flex items-center gap-2.5 pl-4 pr-3 py-2 font-bold text-[11px] tracking-wide uppercase">
                            <Bell size={14} className={type === 'neutral' ? '' : 'animate-pulse'} />
                            <span>{pat}</span>
                        </button>
                        <div className="w-px h-4 bg-white/10 mx-1"></div>
                        <button
                            onClick={(e) => { e.stopPropagation(); setDismissedPatterns((prev: string[]) => [...prev, pat]); }}
                            className="pr-3 pl-2 py-2 hover:text-white transition-colors opacity-60 hover:opacity-100"
                        >
                            <X size={14} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
};
