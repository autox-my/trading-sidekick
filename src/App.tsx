import React from 'react';
import { Header } from './components/Layout/Header';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ChartArea } from './components/Dashboard/ChartArea';
import { HUD } from './components/Dashboard/HUD';
import { ScannerChips } from './components/Dashboard/ScannerChips';
import { OptionsFlow } from './components/Dashboard/OptionsFlow';
import { SidekickPanel } from './components/Dashboard/SidekickPanel';
import { ChartSettings } from './components/Dashboard/ChartSettings';

import { useUIStore } from './store/useUIStore';
import { useMarketData } from './hooks/useMarketData';
// import { marketDataService } from './services/MarketDataService'; // Removed unused import

// --- CUSTOM ANIMATION STYLES MOVED TO index.css ---

export default function TradingSidekickApp() {
  const {
    isSidebarOpen,
    viewMode,
    theme
  } = useUIStore();

  // Use custom hook for all market data fetching
  useMarketData();

  // --- EFFECTS ---

  return (
    <>

      <div className={`flex h-screen w-full font-sans overflow-hidden tracking-wide selection:bg-indigo-500/30 ${theme.mode === 'light' ? 'light bg-slate-50 text-slate-900' : 'bg-[#0a0e17] text-slate-300'}`}>
        <div className={`flex flex-col flex-1 min-w-0 transition-all duration-0 ${isSidebarOpen ? 'mr-0' : ''}`}>
          <Header />

          <main className={`flex-1 relative group h-full overflow-hidden ${theme.mode === 'light' ? 'bg-gradient-to-b from-slate-50 to-white' : 'bg-gradient-to-b from-[#0a0e17] to-[#0f172a]'}`}>
            <div className={`w-full h-full flex flex-col ${viewMode === 'chart' ? 'visible' : 'hidden'}`}>
              <HUD />
              <ScannerChips />
              <ErrorBoundary>
                <ChartArea />
              </ErrorBoundary>
              <ChartSettings />
            </div>
            <OptionsFlow />
          </main>
        </div>

        <SidekickPanel />
      </div>
    </>
  );
}