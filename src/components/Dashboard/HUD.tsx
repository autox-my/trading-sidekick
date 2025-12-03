import React from 'react';
import { useMarketStore } from '../../store/useMarketStore';
import {
    Activity,
    BarChart2,
    Zap,
    Globe,
    TrendingUp,
    TrendingDown,
    Wifi
} from 'lucide-react';

const StatCard = ({ label, value, subValue, icon: Icon, trend, color = "indigo" }: any) => (
    <div className={`relative group overflow-hidden rounded-xl border border-[rgba(var(--glass-border),0.2)] bg-secondary/40 p-3 flex flex-col justify-between transition-all hover:bg-secondary/60 hover:border-[rgba(var(--glass-border),0.4)]`}>
        <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary group-hover:text-text-primary transition-colors">{label}</span>
            <Icon size={14} className={`text-${color}-500/70 group-hover:text-${color}-400 transition-colors`} />
        </div>
        <div className="flex items-baseline justify-between">
            <span className="text-lg font-mono font-bold text-text-primary tracking-tight">{value}</span>
            {subValue && <span className={`text-[10px] font-medium ${trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-text-secondary'}`}>{subValue}</span>}
        </div>
    </div>
);

export const HUD: React.FC = () => {
    const {
        technicals,
        marketData,
        newsData,
        macroData
    } = useMarketStore();

    const lastPrice = technicals.lastPrice || 0;
    const prevPrice = marketData.length > 1 ? marketData[marketData.length - 2].close : lastPrice;
    const priceChange = lastPrice - prevPrice;
    const isUp = priceChange >= 0;

    return (
        <div className="flex flex-col gap-3 p-4 h-full overflow-y-auto">
            <h2 className="text-lg font-bold text-text-primary mb-2 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-400" /> Market Data
            </h2>

            {/* Macro Context */}
            <div className="rounded-xl border border-[rgba(var(--glass-border),0.2)] bg-secondary/40 p-3">
                <div className="flex items-center gap-2 mb-3">
                    <Globe size={14} className="text-indigo-400" />
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Macro Context</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="flex flex-col">
                        <span className="text-text-secondary text-[10px]">CPI</span>
                        <span className="text-text-primary font-bold">{macroData?.cpi || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-text-secondary text-[10px]">GDP</span>
                        <span className="text-text-primary font-bold">{macroData?.gdp || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-text-secondary text-[10px]">Unemp</span>
                        <span className="text-text-primary font-bold">{macroData?.unemployment || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-text-secondary text-[10px]">10Y Yield</span>
                        <span className={`font-bold ${macroData?.tnx_yield ? 'text-emerald-400' : 'text-text-secondary'}`}>{macroData?.tnx_yield || 'N/A'}</span>
                    </div>
                </div>
            </div>

            {/* Price */}
            <StatCard
                label="Price"
                value={lastPrice.toFixed(2)}
                subValue={`${isUp ? '+' : ''}${priceChange.toFixed(2)}`}
                icon={isUp ? TrendingUp : TrendingDown}
                trend={isUp ? 'up' : 'down'}
                color={isUp ? 'emerald' : 'rose'}
            />

            {/* RSI */}
            <StatCard
                label="RSI (14)"
                value={technicals.rsi.toFixed(1)}
                subValue={technicals.rsi > 70 ? 'Overbought' : technicals.rsi < 30 ? 'Oversold' : 'Neutral'}
                icon={Activity}
                color="purple"
            />

            {/* Liquidity (Volume & VWAP) */}
            <StatCard
                label="Liquidity"
                value={technicals.lastVolume > 0 ? (technicals.lastVolume / 1000000).toFixed(2) + 'M' : 'Vol: N/A'}
                subValue={`VWAP: ${technicals.vwap ? technicals.vwap.toFixed(2) : 'N/A'}`}
                icon={BarChart2}
                color="blue"
            />

            {/* Volatility */}
            <StatCard
                label="Volatility"
                value={technicals.atr.toFixed(2)}
                subValue={technicals.regime}
                icon={Zap}
                color="amber"
            />

            {/* Sentiment */}
            <div className="rounded-xl border border-[rgba(var(--glass-border),0.2)] bg-secondary/40 p-3">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Sentiment</span>
                    <Wifi size={14} className="text-sky-500/70" />
                </div>
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-text-primary">{(newsData?.totalScore || 0) > 0 ? 'Bullish' : (newsData?.totalScore || 0) < 0 ? 'Bearish' : 'Neutral'}</span>
                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${(newsData?.totalScore || 0) > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-text-secondary/20 text-text-secondary'}`}>Score: {newsData?.totalScore || 0}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ${(newsData?.totalScore || 0) > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                            style={{ width: `${Math.min(Math.abs(newsData?.totalScore || 0) * 100, 100)}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
