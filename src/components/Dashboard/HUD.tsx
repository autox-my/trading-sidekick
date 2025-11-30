import React from 'react';
import { useMarketStore } from '../../store/useMarketStore';
import { useUIStore } from '../../store/useUIStore';
import {
    Activity,
    BarChart2,
    Zap,
    Globe,
    TrendingUp,
    TrendingDown,
    Clock,
    Wifi,
    GripHorizontal
} from 'lucide-react';
import { motion } from 'framer-motion';

const DraggableWidget = ({ id, children, className = "" }: any) => {
    const { widgets, setWidgetPosition } = useUIStore();
    const widget = widgets[id];

    if (!widget?.visible) return null;

    return (
        <motion.div
            drag
            dragMomentum={false}
            initial={{ x: widget.x, y: widget.y }}
            animate={{ x: widget.x, y: widget.y }}
            onDragEnd={(_, info) => {
                setWidgetPosition(id, widget.x + info.offset.x, widget.y + info.offset.y);
            }}
            className={`pointer-events-auto cursor-grab active:cursor-grabbing ${className}`}
        >
            {children}
        </motion.div>
    );
};

const StatCard = ({ label, value, subValue, icon: Icon, trend, color = "indigo" }: any) => (
    <div className={`relative group overflow-hidden rounded-2xl border border-[rgba(var(--glass-border),0.2)] bg-secondary/60 backdrop-blur-md p-3 flex flex-col justify-between transition-all hover:bg-secondary/80 hover:border-[rgba(var(--glass-border),0.4)] hover:shadow-lg hover:shadow-${color}-500/10 h-full`}>
        <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary group-hover:text-text-primary transition-colors">{label}</span>
            <div className="flex items-center gap-2">
                <GripHorizontal size={12} className="text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Icon size={14} className={`text-${color}-500/70 group-hover:text-${color}-400 transition-colors`} />
            </div>
        </div>
        <div className="flex items-baseline gap-2">
            <span className="text-lg font-mono font-bold text-text-primary tracking-tight">{value}</span>
            {subValue && <span className={`text-[10px] font-medium ${trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-text-secondary'}`}>{subValue}</span>}
        </div>
        {/* Glow Effect */}
        <div className={`absolute -bottom-4 -right-4 w-12 h-12 bg-${color}-500/20 blur-xl rounded-full group-hover:bg-${color}-500/30 transition-all`} />
    </div>
);

export const HUD: React.FC = () => {
    const {
        activeSymbol,
        technicals,
        marketData,
        newsData,
        macroData,
        macroCorrelations
    } = useMarketStore();

    const { connectionStatus } = useUIStore();

    const lastPrice = technicals.lastPrice || 0;
    const prevPrice = marketData.length > 1 ? marketData[marketData.length - 2].close : lastPrice;
    const priceChange = lastPrice - prevPrice;
    const percentChange = ((priceChange / prevPrice) * 100).toFixed(2);
    const isUp = priceChange >= 0;

    return (
        <div className="absolute top-4 left-4 right-4 z-40 flex flex-col gap-2 pointer-events-none">
            {/* Top Bar: Symbol & Status */}
            <div className="inline-flex items-center justify-between pointer-events-auto bg-secondary/60 backdrop-blur-md border border-[rgba(var(--glass-border),0.2)] p-3 rounded-2xl shadow-sm mb-2 w-fit">
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

            {/* Macro Ticker (Moved) */}
            <DraggableWidget id="macro" className="flex items-center gap-4 mb-2 w-fit">
                <div className="flex items-center gap-6 px-4 py-2 rounded-2xl border border-[rgba(var(--glass-border),0.2)] bg-secondary/60 backdrop-blur-md hover:bg-secondary/80 transition-all group">
                    <div className="flex items-center gap-2">
                        <GripHorizontal size={12} className="text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Globe size={12} className="text-indigo-400" />
                        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Macro Context</span>
                    </div>
                    <div className="flex gap-4 text-xs font-mono">
                        <span className="text-text-secondary">CPI: <span className="text-text-primary font-bold">{macroData?.cpi || 'N/A'}</span></span>
                        <div className="w-px h-3 bg-white/10"></div>
                        <span className="text-text-secondary">DXY: <span className={`font-bold ${macroCorrelations?.dxy?.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{macroCorrelations?.dxy?.price.toFixed(2) || 'N/A'}</span></span>
                        <div className="w-px h-3 bg-white/10"></div>
                        <span className="text-text-secondary">TNX: <span className={`font-bold ${macroCorrelations?.tnx?.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{macroCorrelations?.tnx?.price.toFixed(2) || 'N/A'}</span></span>
                    </div>
                </div>
            </DraggableWidget>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pointer-events-none w-full max-w-5xl">
                <DraggableWidget id="price">
                    <StatCard
                        label="Price"
                        value={lastPrice.toFixed(2)}
                        subValue={`${isUp ? '+' : ''}${priceChange.toFixed(2)}`}
                        icon={isUp ? TrendingUp : TrendingDown}
                        trend={isUp ? 'up' : 'down'}
                        color={isUp ? 'emerald' : 'rose'}
                    />
                </DraggableWidget>
                <DraggableWidget id="rsi">
                    <StatCard
                        label="RSI (14)"
                        value={technicals.rsi.toFixed(1)}
                        subValue={technicals.rsi > 70 ? 'Overbought' : technicals.rsi < 30 ? 'Oversold' : 'Neutral'}
                        icon={Activity}
                        color="purple"
                    />
                </DraggableWidget>
                <DraggableWidget id="volume">
                    <StatCard
                        label="Volume"
                        value={(technicals.lastVolume / 1000000).toFixed(2) + 'M'}
                        subValue={`Avg: ${(technicals.avgVolume / 1000000).toFixed(2)}M`}
                        icon={BarChart2}
                        color="blue"
                    />
                </DraggableWidget>
                <DraggableWidget id="volatility">
                    <StatCard
                        label="Volatility"
                        value={technicals.atr.toFixed(2)}
                        subValue={technicals.regime}
                        icon={Zap}
                        color="amber"
                    />
                </DraggableWidget>
                {/* News Sentiment Widget */}
                <DraggableWidget id="sentiment" className="col-span-2">
                    <div className="relative group overflow-hidden rounded-2xl border border-[rgba(var(--glass-border),0.2)] bg-secondary/60 backdrop-blur-md p-3 flex flex-col justify-between hover:bg-secondary/80 transition-all h-full">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Market Sentiment</span>
                            <div className="flex items-center gap-2">
                                <GripHorizontal size={12} className="text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                                <Wifi size={14} className="text-sky-500/70" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-text-primary">{newsData?.totalScore > 0 ? 'Bullish' : newsData?.totalScore < 0 ? 'Bearish' : 'Neutral'} Bias</span>
                                <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${newsData?.totalScore > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-text-secondary/20 text-text-secondary'}`}>Score: {newsData?.totalScore || 0}</span>
                            </div>
                            <div className="w-full h-1 bg-slate-700/50 rounded-full overflow-hidden mt-1">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ${newsData?.totalScore > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                    style={{ width: `${Math.min(Math.abs(newsData?.totalScore || 0) * 10, 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </DraggableWidget>
            </div>
        </div>
    );
};
