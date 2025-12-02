import React from 'react';
import { useMarketStore } from '../../store/useMarketStore';

export const ChartHeader: React.FC = () => {
    const {
        activeSymbol,
        technicals,
        marketData
    } = useMarketStore();

    const lastPrice = technicals.lastPrice || 0;
    const prevPrice = marketData.length > 1 ? marketData[marketData.length - 2].close : lastPrice;
    const priceChange = lastPrice - prevPrice;
    const percentChange = prevPrice !== 0 ? ((priceChange / prevPrice) * 100).toFixed(2) : '0.00';
    const isUp = priceChange >= 0;

    return (
        <div className="absolute top-4 left-4 z-40 pointer-events-none">
            <div className="inline-flex items-center justify-between pointer-events-auto bg-secondary/60 backdrop-blur-md border border-[rgba(var(--glass-border),0.2)] p-3 rounded-2xl shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-black tracking-tighter text-text-primary drop-shadow-sm flex items-center gap-3">
                            {activeSymbol}
                            <span className={`text-sm px-2 py-0.5 rounded-md font-bold border ${isUp ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-rose-500/10 border-rose-500/20 text-rose-600'}`}>
                                {isUp ? '+' : ''}{percentChange}%
                            </span>
                        </h1>
                    </div>
                </div>
            </div>
        </div>
    );
};
