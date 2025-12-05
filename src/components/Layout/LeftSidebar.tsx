import React, { useState } from 'react';
import { Activity, Settings, Bell } from 'lucide-react';
import { useMarketStore } from '../../store/useMarketStore';
import { HUD } from '../Dashboard/HUD';
import { ChartSettings } from '../Dashboard/ChartSettings';
import { AlertsPanel } from '../Dashboard/AlertsPanel';
import { ErrorBoundary } from '../ErrorBoundary';
import { useUIStore } from '../../store/useUIStore';

type Tab = 'data' | 'settings' | 'alerts';

export const LeftSidebar: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('data');
    const dataSource = useMarketStore(state => state.dataSource);
    const { theme } = useUIStore();
    const isDark = theme.mode === 'dark';

    const tabs = [
        { id: 'data' as Tab, icon: Activity, label: 'Data' },
        { id: 'settings' as Tab, icon: Settings, label: 'Settings' },
        { id: 'alerts' as Tab, icon: Bell, label: 'Alerts' },
    ];

    return (
        <div className={`flex flex-col h-full shrink-0 w-80 border-r relative z-[100] transition-colors duration-300 ${isDark ? 'bg-[#0a0e17] border-white/5' : 'bg-white border-slate-200'}`}>
            {/* Top Tab Switcher */}
            <div className={`h-16 flex items-center px-3 border-b backdrop-blur-md transition-colors duration-300 ${isDark ? 'border-white/5 bg-slate-900/50' : 'border-slate-200 bg-white/80'}`}>
                <div className={`flex-1 flex p-1 rounded-xl border transition-colors duration-300 ${isDark ? 'bg-slate-950/50 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                aria-label={tab.label}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${isActive
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                                    : isDark
                                        ? 'text-slate-400 hover:text-white hover:bg-white/5'
                                        : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                                    }`}
                            >
                                <Icon size={14} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className={`flex-1 overflow-hidden relative backdrop-blur-sm transition-colors duration-300 ${isDark ? 'bg-slate-900/20' : 'bg-slate-50/50'}`}>
                <ErrorBoundary>
                    {activeTab === 'data' && <HUD />}
                    {activeTab === 'settings' && <ChartSettings />}
                    {activeTab === 'alerts' && <AlertsPanel />}
                </ErrorBoundary>
            </div>

            {/* Footer: Data Source Info */}
            <div className={`p-3 border-t backdrop-blur-md transition-colors duration-300 ${isDark ? 'border-white/5 bg-slate-900/50' : 'border-slate-200 bg-slate-50/80'}`}>
                <div className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-colors duration-300 ${isDark ? 'bg-slate-950/50 border-white/5' : 'bg-white border-slate-200'}`}>
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Data Source</span>
                    <span className="text-xs font-bold text-indigo-400 font-mono uppercase tracking-wider">
                        {dataSource === 'Alpha Vantage' ? 'ALPHA VANTAGE' : 'TIINGO'}
                    </span>
                </div>
            </div>
        </div>
    );
};
