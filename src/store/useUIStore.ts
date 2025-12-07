import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ContextMenu {
    visible: boolean;
    x: number;
    y: number;
    data: any | null;
}

interface ActiveAnnotation {
    type: string;
    price: number;
    y: number;
}

interface WidgetState {
    id: string;
    x: number;
    y: number;
    visible: boolean;
}

interface ThemeState {
    mode: 'dark' | 'light';
    accentColor: string;
}

interface UIState {
    isSidebarOpen: boolean;
    sidebarWidth: number;
    viewMode: 'chart' | 'options_flow';
    showChartSettings: boolean;
    activeAnnotation: ActiveAnnotation | null;
    contextMenu: ContextMenu;
    isLoading: boolean;
    connectionStatus: 'live' | 'mock';
    avKeyStatus: 'valid' | 'invalid' | 'checking' | 'idle';
    externalToolUrl: string;
    isEditingUrl: boolean;
    autoFitTrigger: number;
    widgets: Record<string, WidgetState>;
    theme: ThemeState;

    sidekickPosition: { x: number; y: number };
    sidekickSize: { width: number; height: number };

    // Actions
    setIsSidebarOpen: (open: boolean) => void;
    setSidebarWidth: (width: number) => void;
    setViewMode: (mode: 'chart' | 'options_flow') => void;
    setShowChartSettings: (show: boolean) => void;
    setActiveAnnotation: (annotation: ActiveAnnotation | null) => void;
    setContextMenu: (menu: ContextMenu) => void;
    activeTool: 'trendline' | 'box' | 'avwap' | null;
    setActiveTool: (tool: 'trendline' | 'box' | 'avwap' | null) => void;
    setIsLoading: (loading: boolean) => void;
    setConnectionStatus: (status: 'live' | 'mock') => void;
    setAvKeyStatus: (status: 'valid' | 'invalid' | 'checking' | 'idle') => void;
    setExternalToolUrl: (url: string) => void;
    setIsEditingUrl: (editing: boolean) => void;
    triggerAutoFit: () => void;
    setWidgetPosition: (id: string, x: number, y: number) => void;
    toggleWidgetVisibility: (id: string) => void;
    setThemeMode: (mode: 'dark' | 'light') => void;
    setThemeColor: (color: string) => void;
    setSidekickPosition: (x: number, y: number) => void;
    setSidekickSize: (width: number, height: number) => void;
}

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            isSidebarOpen: true,
            sidebarWidth: 384,
            viewMode: 'chart',
            showChartSettings: false,
            activeAnnotation: null,
            contextMenu: { visible: false, x: 0, y: 0, data: null },
            isLoading: false,
            connectionStatus: 'live',
            avKeyStatus: 'idle',
            externalToolUrl: 'http://localhost:5173',
            isEditingUrl: false,
            activeTool: null,
            autoFitTrigger: 0,
            widgets: {
                'price': { id: 'price', x: 0, y: 0, visible: true },
                'rsi': { id: 'rsi', x: 0, y: 0, visible: true },
                'volume': { id: 'volume', x: 0, y: 0, visible: true },
                'volatility': { id: 'volatility', x: 0, y: 0, visible: true },
                'sentiment': { id: 'sentiment', x: 0, y: 0, visible: true },
                'macro': { id: 'macro', x: 0, y: 0, visible: true },
            },
            theme: {
                mode: 'dark',
                accentColor: '#4f46e5' // Indigo-600
            },
            sidekickPosition: { x: window.innerWidth - 420, y: 80 },
            sidekickSize: { width: 400, height: 600 },

            setIsSidebarOpen: (open) => set({ isSidebarOpen: open }),
            setSidebarWidth: (width) => {
                set({ sidebarWidth: width });
            },
            setViewMode: (mode) => set({ viewMode: mode }),
            setShowChartSettings: (show) => set({ showChartSettings: show }),
            setActiveAnnotation: (annotation) => set({ activeAnnotation: annotation }),
            setContextMenu: (menu) => set({ contextMenu: menu }),
            setActiveTool: (tool) => set({ activeTool: tool }),
            setIsLoading: (loading) => set({ isLoading: loading }),
            setConnectionStatus: (status) => set({ connectionStatus: status }),
            setAvKeyStatus: (status) => set({ avKeyStatus: status }),
            setExternalToolUrl: (url) => {
                set({ externalToolUrl: url });
            },
            setIsEditingUrl: (editing) => set({ isEditingUrl: editing }),
            triggerAutoFit: () => set((state) => ({ autoFitTrigger: state.autoFitTrigger + 1 })),
            setWidgetPosition: (id, x, y) => set((state) => ({
                widgets: {
                    ...state.widgets,
                    [id]: { ...state.widgets[id], x, y }
                }
            })),
            toggleWidgetVisibility: (id) => set((state) => ({
                widgets: {
                    ...state.widgets,
                    [id]: { ...state.widgets[id], visible: !state.widgets[id].visible }
                }
            })),
            setThemeMode: (mode) => set((state) => ({ theme: { ...state.theme, mode } })),
            setThemeColor: (color) => set((state) => ({ theme: { ...state.theme, accentColor: color } })),
            setSidekickPosition: (x, y) => set({ sidekickPosition: { x, y } }),
            setSidekickSize: (width, height) => set({ sidekickSize: { width, height } }),
        }),
        {
            name: 'ui-storage',
            partialize: (state) => ({
                widgets: state.widgets,
                theme: state.theme,
                sidekickPosition: state.sidekickPosition,
                sidekickSize: state.sidekickSize
            }),
        }
    )
);
