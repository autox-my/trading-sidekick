import React from 'react';

interface ChartLegendProps {
    data: {
        time?: number;
        open?: number;
        high?: number;
        low?: number;
        close?: number;
        volume?: number;
        change?: number;
        changePercent?: number;
    } | null;
    symbol: string;
    interval: string;
}

export const ChartLegend: React.FC<ChartLegendProps> = ({ data, symbol, interval }) => {
    if (!data) return null;

    const { open, high, low, close, volume } = data;
    const isUp = (close || 0) >= (open || 0);
    const colorClass = isUp ? 'text-emerald-400' : 'text-rose-400';

    const formatPrice = (val?: number) => val?.toFixed(2) ?? '-';
    const formatVol = (val?: number) => {
        if (!val) return '-';
        if (val >= 1000000) return `${(val / 1000000).toFixed(2)}M`;
        if (val >= 1000) return `${(val / 1000).toFixed(2)}K`;
        return val.toString();
    };

    return (
        <div className="absolute left-3 top-3 z-20 flex flex-col gap-1 pointer-events-none select-none">
            <div className="flex items-center gap-3 text-xs font-mono backdrop-blur-sm bg-background/30 p-1.5 rounded-lg border border-white/5">
                <div className="flex gap-1">
                    <span className="text-text-secondary">O</span>
                    <span className={colorClass}>{formatPrice(open)}</span>
                </div>
                <div className="flex gap-1">
                    <span className="text-text-secondary">H</span>
                    <span className={colorClass}>{formatPrice(high)}</span>
                </div>
                <div className="flex gap-1">
                    <span className="text-text-secondary">L</span>
                    <span className={colorClass}>{formatPrice(low)}</span>
                </div>
                <div className="flex gap-1">
                    <span className="text-text-secondary">C</span>
                    <span className={colorClass}>{formatPrice(close)}</span>
                </div>
                {volume !== undefined && (
                    <div className="flex gap-1 border-l border-white/10 pl-3 ml-1">
                        <span className="text-text-secondary">Vol</span>
                        <span className="text-text-primary">{formatVol(volume)}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
