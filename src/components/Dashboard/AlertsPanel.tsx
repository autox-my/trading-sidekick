import React from 'react';
import { Bell, AlertTriangle, CheckCircle, X, Zap } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useMarketStore } from '../../store/useMarketStore';
import { useChatStore } from '../../store/useChatStore';

export const AlertsPanel: React.FC = () => {
    const { avKeyStatus, connectionStatus } = useUIStore();
    const { marketStatus, scannedPatterns, dismissedPatterns, setDismissedPatterns } = useMarketStore();
    const { sendMessage } = useChatStore();

    const handlePatternClick = (pattern: string) => {
        sendMessage(`Explain the ${pattern} pattern detected on the chart.`);
        if (!dismissedPatterns.includes(pattern)) {
            setDismissedPatterns((prev: string[]) => [...prev, pattern]);
        }
    };

    const activePatterns = scannedPatterns.filter(p => !dismissedPatterns.includes(p));

    return (
        <div className="flex flex-col h-full p-4 overflow-y-auto">
            <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-400" /> Alerts & Status
            </h2>

            <div className="space-y-4">
                {/* Active Signals Section */}
                <div className="bg-secondary/40 rounded-xl p-4 border border-[rgba(var(--glass-border),0.2)]">
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Zap size={12} className="text-indigo-400" /> Active Signals
                    </h3>

                    {activePatterns.length === 0 ? (
                        <div className="text-xs text-text-secondary italic text-center py-2 bg-white/5 rounded-lg">
                            No active patterns detected
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {activePatterns.map((pat, i) => (
                                <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg p-2 border border-white/5 hover:bg-white/10 transition-colors group">
                                    <button onClick={() => handlePatternClick(pat)} className="text-xs font-bold text-text-primary flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                                        {pat}
                                    </button>
                                    <button
                                        onClick={() => setDismissedPatterns((prev: string[]) => [...prev, pat])}
                                        className="text-text-secondary hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* System Status */}
                <div className="bg-secondary/40 rounded-xl p-4 border border-[rgba(var(--glass-border),0.2)]">
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">System Status</h3>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-text-primary">API Connection</span>
                            <span className={`text-xs px-2 py-1 rounded-full border ${avKeyStatus === 'valid' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                                {avKeyStatus === 'valid' ? 'Connected' : 'Disconnected'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-text-primary">Data Feed</span>
                            <span className={`text-xs px-2 py-1 rounded-full border ${connectionStatus === 'live' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                                {connectionStatus === 'live' ? 'Live' : 'Simulated'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Market Status */}
                <div className="bg-secondary/40 rounded-xl p-4 border border-[rgba(var(--glass-border),0.2)]">
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">Market Status</h3>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${marketStatus?.current_status === 'open' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                            {marketStatus?.current_status === 'open' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                        </div>
                        <div>
                            <div className="text-sm font-bold text-text-primary">{marketStatus?.current_status === 'open' ? 'Market Open' : 'Market Closed'}</div>
                            <div className="text-xs text-text-secondary">{marketStatus?.notes || 'Regular trading hours'}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
