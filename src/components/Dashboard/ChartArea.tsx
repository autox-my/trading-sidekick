import React, { useEffect, useRef, useState } from 'react';
import {
    HelpCircle,
    Sparkles,
    Settings,
    Bell
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useMarketStore } from '../../store/useMarketStore';
import { useChatStore } from '../../store/useChatStore';
import { calculateSMASeries, calculatePivotPoints } from '../../utils/calculations';
import { mergePriceLevels, hexToRgba } from '../../utils/helpers';

export const ChartArea: React.FC = () => {
    const {
        viewMode,
        avKeyStatus,
        showChartSettings,
        setShowChartSettings,
        activeAnnotation,
        setActiveAnnotation,
        setContextMenu,
        contextMenu,
        autoFitTrigger,
        theme
    } = useUIStore();

    const {
        activeSymbol,
        timeframe,
        marketData,
        scannedPatterns,
        dismissedPatterns,
        setDismissedPatterns,
        showSignals,
        setShowSignals,
        darkPoolLevels,
        chartConfig,
        setChartConfig,
        elliottWaveData,
        showElliottWaves
    } = useMarketStore();

    const { sendMessage } = useChatStore();

    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<any>(null);
    const mainSeries = useRef<any>(null);
    const smaSeries = useRef<any>(null);
    const annotationLinesRef = useRef<any[]>([]);
    const hoveredCandleRef = useRef<any>(null);
    const levelsRef = useRef<{ support: number | null, resistance: number | null, darkPools: any[] }>({ support: null, resistance: null, darkPools: [] });
    const prevSymbolTimeframe = useRef<string>('');

    const [isChartLibLoaded, setIsChartLibLoaded] = useState(false);

    // Load Chart Library
    useEffect(() => {
        if ((window as any).LightweightCharts) {
            setIsChartLibLoaded(true);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/lightweight-charts@4.1.1/dist/lightweight-charts.standalone.production.js';
        script.async = true;
        script.onload = () => setIsChartLibLoaded(true);
        document.body.appendChild(script);
    }, []);

    // Initialize Chart
    useEffect(() => {
        if (!isChartLibLoaded || !chartContainerRef.current) return;
        const LightweightCharts = (window as any).LightweightCharts;
        if (!LightweightCharts) return;

        if (!chartInstance.current) {
            try {
                // Validate config values - allow 0 for margins
                const safeMarginTop = Math.max(0, Math.min(0.5, chartConfig.marginTop));
                const safeMarginBottom = Math.max(0, Math.min(0.5, chartConfig.marginBottom));
                const safeMarginRight = Math.max(0, Math.min(0.5, chartConfig.marginRight));
                const rightOffset = Math.max(0, safeMarginRight * 100);

                const isDark = theme.mode === 'dark';
                const bgColor = isDark ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0)';
                const textColor = isDark ? '#94a3b8' : '#475569';
                const gridColor = isDark ? '#1e293b' : '#e2e8f0';

                chartInstance.current = LightweightCharts.createChart(chartContainerRef.current, {
                    layout: {
                        background: { type: 'solid', color: bgColor },
                        textColor: textColor,
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                    },
                    grid: { vertLines: { visible: chartConfig.gridVisible, color: gridColor }, horzLines: { visible: chartConfig.gridVisible, color: gridColor } },
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight,
                    rightPriceScale: {
                        autoScale: true,
                        scaleMargins: {
                            top: safeMarginTop,
                            bottom: safeMarginBottom,
                        }
                    },
                    timeScale: {
                        timeVisible: true,
                        secondsVisible: false,
                        rightOffset: rightOffset,
                        barSpacing: 6,
                        minBarSpacing: 0.5,
                        fixLeftEdge: false,
                        fixRightEdge: false
                    },
                    handleScroll: {
                        mouseWheel: true,
                        pressedMouseMove: true,
                        horzTouchDrag: true,
                        vertTouchDrag: true
                    },
                    handleScale: {
                        axisPressedMouseMove: true,
                        mouseWheel: true,
                        pinch: true
                    }
                });

                chartInstance.current.subscribeCrosshairMove((param: any) => {
                    if (param.time && param.seriesData.size > 0) {
                        const data = param.seriesData.get(mainSeries.current);
                        if (data) {
                            hoveredCandleRef.current = data;
                            const price = mainSeries.current.coordinateToPrice(param.point.y);
                            const threshold = 0.50;
                            const mergedLevels = mergePriceLevels(levelsRef.current.support, levelsRef.current.resistance, levelsRef.current.darkPools, threshold);
                            let found = null;
                            mergedLevels.forEach((lvl: any) => {
                                if (Math.abs(price - lvl.price) < threshold) {
                                    found = { type: lvl.label, price: lvl.price, y: param.point.y };
                                }
                            });
                            setActiveAnnotation(found);
                        }
                    } else { setActiveAnnotation(null); }
                });

                chartContainerRef.current.addEventListener('contextmenu', (e: MouseEvent) => {
                    e.preventDefault();
                    if (hoveredCandleRef.current) {
                        setContextMenu({ visible: true, x: e.clientX, y: e.clientY, data: hoveredCandleRef.current });
                    }
                });

                smaSeries.current = chartInstance.current.addLineSeries({
                    color: hexToRgba(chartConfig.smaColor, chartConfig.smaOpacity),
                    lineWidth: 2,
                    visible: chartConfig.smaVisible,
                    lastValueVisible: false,
                    priceLineVisible: false
                });
            } catch (e) {
                console.error("Chart initialization failed:", e);
            }

            return () => {
                if (chartInstance.current) {
                    chartInstance.current.remove();
                    chartInstance.current = null;
                    mainSeries.current = null;
                    smaSeries.current = null;
                }
            }
        }
    }, [isChartLibLoaded]);

    // Manage Main Series (Candle/Bar/Line)
    useEffect(() => {
        if (!chartInstance.current) return;

        // Remove existing series if it exists
        if (mainSeries.current) {
            chartInstance.current.removeSeries(mainSeries.current);
        }

        try {
            if (chartConfig.chartType === 'line') {
                mainSeries.current = chartInstance.current.addLineSeries({
                    color: hexToRgba(chartConfig.annotationColor, chartConfig.annotationOpacity),
                    lineWidth: 2
                });
            } else if (chartConfig.chartType === 'bar') {
                mainSeries.current = chartInstance.current.addBarSeries({
                    upColor: hexToRgba(chartConfig.upColor, chartConfig.upOpacity),
                    downColor: hexToRgba(chartConfig.downColor, chartConfig.downOpacity),
                    thinBars: false
                });
            } else {
                // Default to Candle
                mainSeries.current = chartInstance.current.addCandlestickSeries({
                    upColor: hexToRgba(chartConfig.upColor, chartConfig.upOpacity),
                    downColor: hexToRgba(chartConfig.downColor, chartConfig.downOpacity),
                    borderVisible: true,
                    borderUpColor: hexToRgba(chartConfig.upColor, chartConfig.upOpacity),
                    borderDownColor: hexToRgba(chartConfig.downColor, chartConfig.downOpacity),
                    wickUpColor: hexToRgba(chartConfig.upColor, chartConfig.upOpacity),
                    wickDownColor: hexToRgba(chartConfig.downColor, chartConfig.downOpacity)
                });
            }
        } catch (e) {
            console.error("Main series creation failed:", e);
        }

        // Re-add data if available
        if (marketData.length > 0) {
            if (chartConfig.chartType === 'line') {
                mainSeries.current.setData(marketData.map((d: any) => ({ time: d.time, value: d.close })));
            } else {
                mainSeries.current.setData(marketData);
            }
        }

    }, [chartConfig.chartType, isChartLibLoaded]); // Re-run when chart type changes

    // Apply Config Updates
    useEffect(() => {
        if (!chartInstance.current) return;

        try {
            // Validate config values - allow 0 for margins
            const safeMarginTop = Math.max(0, Math.min(0.5, chartConfig.marginTop));
            const safeMarginBottom = Math.max(0, Math.min(0.5, chartConfig.marginBottom));
            const safeMarginRight = Math.max(0, Math.min(0.5, chartConfig.marginRight));
            const rightOffset = Math.max(0, safeMarginRight * 100);

            const isDark = theme.mode === 'dark';
            const bgColor = isDark ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0)';
            const textColor = isDark ? '#94a3b8' : '#475569';
            const gridColor = isDark ? '#1e293b' : '#e2e8f0';

            chartInstance.current.applyOptions({
                layout: { background: { color: bgColor }, textColor: textColor },
                grid: { vertLines: { visible: chartConfig.gridVisible, color: gridColor }, horzLines: { visible: chartConfig.gridVisible, color: gridColor } },
                rightPriceScale: {
                    scaleMargins: {
                        top: safeMarginTop,
                        bottom: safeMarginBottom,
                    }
                },
                timeScale: {
                    rightOffset: rightOffset,
                    fixLeftEdge: false,
                    fixRightEdge: false
                }
            });

            if (mainSeries.current) {
                const commonOptions = {
                    upColor: hexToRgba(chartConfig.upColor, chartConfig.upOpacity),
                    downColor: hexToRgba(chartConfig.downColor, chartConfig.downOpacity),
                };

                if (chartConfig.chartType === 'candle') {
                    mainSeries.current.applyOptions({
                        ...commonOptions,
                        borderVisible: true,
                        wickVisible: true,
                        borderUpColor: chartConfig.borderUpColor,
                        borderDownColor: chartConfig.borderDownColor,
                        wickUpColor: chartConfig.borderUpColor,
                        wickDownColor: chartConfig.borderDownColor
                    });
                } else if (chartConfig.chartType === 'bar') {
                    mainSeries.current.applyOptions(commonOptions);
                } else if (chartConfig.chartType === 'line') {
                    mainSeries.current.applyOptions({ color: chartConfig.upColor });
                }
            }

            if (smaSeries.current) {
                smaSeries.current.applyOptions({ visible: chartConfig.smaVisible, color: hexToRgba(chartConfig.smaColor, chartConfig.smaOpacity) });
            }
        } catch (e) {
            console.warn("Chart config update failed:", e);
        }
    }, [chartConfig, theme.mode]);

    // Resize Chart
    useEffect(() => {
        if (chartInstance.current && chartContainerRef.current) {
            try {
                chartInstance.current.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight
                });
            } catch (e) {
                console.warn("Chart resize failed:", e);
            }
        }
    }, [viewMode, showChartSettings]);

    // Use ResizeObserver for robust resizing
    useEffect(() => {
        if (!chartContainerRef.current || !chartInstance.current) return;
        const resizeObserver = new ResizeObserver(entries => {
            if (entries.length === 0 || !entries[0].contentRect || !chartInstance.current) return;
            const { width, height } = entries[0].contentRect;
            try {
                chartInstance.current.applyOptions({ width, height });
            } catch (e) {
                console.warn("ResizeObserver error:", e);
            }
        });
        resizeObserver.observe(chartContainerRef.current);
        return () => resizeObserver.disconnect();
    }, [isChartLibLoaded]);

    // Update Data & Smart Auto-Fit
    useEffect(() => {
        if (!chartInstance.current || !mainSeries.current || !smaSeries.current) return;

        if (marketData.length > 0) {
            if (chartConfig.chartType === 'line') {
                mainSeries.current.setData(marketData.map((d: any) => ({ time: d.time, value: d.close })));
            } else {
                mainSeries.current.setData(marketData);
            }
            smaSeries.current.setData(calculateSMASeries(marketData, chartConfig.smaPeriod));
        }

        annotationLinesRef.current.forEach(line => mainSeries.current.removePriceLine(line));
        annotationLinesRef.current = [];

        if (chartConfig.annotationVisible && marketData.length > 0) {
            const { support, resistance } = calculatePivotPoints(marketData);
            levelsRef.current.support = support;
            levelsRef.current.resistance = resistance;
            levelsRef.current.darkPools = darkPoolLevels ? darkPoolLevels.levels : [];

            const mergedLevels = mergePriceLevels(support, resistance, levelsRef.current.darkPools);

            mergedLevels.forEach((level: any) => {
                const isZone = level.count > 1;
                if (isZone) {
                    const topLine = mainSeries.current.createPriceLine({ price: level.maxPrice, title: level.label, color: '#fbbf24', lineWidth: 1, lineStyle: 0, axisLabelVisible: true });
                    const bottomLine = mainSeries.current.createPriceLine({ price: level.minPrice, title: '', color: '#fbbf24', lineWidth: 1, lineStyle: 0, axisLabelVisible: false });
                    annotationLinesRef.current.push(topLine, bottomLine);
                } else {
                    const color = level.price === support ? '#22c55e' : (level.price === resistance ? '#ef4444' : '#a855f7');
                    const line = mainSeries.current.createPriceLine({ price: level.price, title: level.label, color, lineWidth: 1, lineStyle: 2, axisLabelVisible: true });
                    annotationLinesRef.current.push(line);
                }
            });
        }

        // Render Elliott Wave Markers
        if (showElliottWaves && elliottWaveData && elliottWaveData.length > 0 && marketData.length > 0) {
            console.log("Rendering Elliott Wave Markers. Data:", elliottWaveData);
            const markers = elliottWaveData.map((wave: any) => {
                // Snap to nearest bar time
                // Handle various date formats from AI (YYYY-MM-DD, etc.)
                const waveDate = new Date(wave.time);
                const waveTime = waveDate.getTime();

                if (isNaN(waveTime)) {
                    console.warn(`Invalid wave time: ${wave.time}`);
                    return null;
                }

                let nearestTime = marketData[0].time;
                let minDiff = Infinity;

                for (const d of marketData) {
                    // Handle both string dates and UNIX timestamps in marketData
                    // MarketData time is usually UNIX timestamp (seconds) or ISO string
                    let dTime: number;
                    if (typeof d.time === 'string') {
                        dTime = new Date(d.time).getTime();
                    } else {
                        // Assume seconds if small number, milliseconds if large? 
                        // Lightweight charts usually uses seconds.
                        dTime = d.time * 1000;
                    }

                    const diff = Math.abs(dTime - waveTime);
                    if (diff < minDiff) {
                        minDiff = diff;
                        nearestTime = d.time;
                    }
                }
                console.log(`Wave ${wave.label}: Target=${wave.time} (${waveTime}), Snapped=${nearestTime}, Diff=${minDiff}`);

                return {
                    time: nearestTime,
                    position: 'aboveBar',
                    color: '#3b82f6',
                    shape: 'arrowDown',
                    text: wave.label,
                    size: 2
                };
            }).filter(m => m !== null);

            // Deduplicate markers at the same time (keep the last one or stack them?)
            // Lightweight charts doesn't like multiple markers at exact same time for same series? 
            // Actually it allows it, but let's sort them.
            markers.sort((a: any, b: any) => {
                const tA = typeof a.time === 'string' ? new Date(a.time).getTime() : a.time;
                const tB = typeof b.time === 'string' ? new Date(b.time).getTime() : b.time;
                return tA - tB;
            });

            mainSeries.current.setMarkers(markers);
        } else {
            // Clear markers if disabled or no data
            mainSeries.current.setMarkers([]);
        }

    }, [chartConfig.annotationVisible, marketData, darkPoolLevels, viewMode, activeSymbol, timeframe, chartConfig.chartType, showElliottWaves, elliottWaveData]);

    // Handle Auto Fit Trigger
    useEffect(() => {
        if (chartInstance.current && autoFitTrigger > 0) {
            try {
                if (marketData && marketData.length > 1) {
                    chartInstance.current.priceScale('right').applyOptions({ autoScale: true });
                    chartInstance.current.timeScale().fitContent();
                }
            } catch (e) {
                console.warn("AutoFit error:", e);
            }
        }
    }, [autoFitTrigger]);

    const handlePatternClick = (pattern: string) => {
        sendMessage(`Explain the ${pattern} pattern detected on the chart.`);
        if (!dismissedPatterns.includes(pattern)) setDismissedPatterns((prev: string[]) => [...prev, pattern]);
    };

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

            <div className="absolute bottom-8 left-8 z-[60] flex gap-2">
                <div className="relative">
                    <button onClick={() => setShowChartSettings(!showChartSettings)} className={`p-3 backdrop-blur-xl border rounded-2xl transition-all shadow-lg group ${showChartSettings ? 'bg-indigo-600/90 border-indigo-500/50 text-white ring-2 ring-indigo-500/20' : 'bg-secondary/40 border-[rgba(var(--glass-border),0.3)] text-text-secondary hover:bg-secondary/60 hover:text-text-primary'}`}><Settings size={20} className="group-hover:rotate-90 transition-transform duration-500" /></button>
                </div>
                <div className="relative">
                    <button onClick={() => setShowSignals(!showSignals)} className={`p-3 backdrop-blur-xl border rounded-2xl transition-all shadow-lg ${scannedPatterns.length > 0 ? 'bg-indigo-600/90 border-indigo-500/50 text-white ring-2 ring-indigo-500/20' : 'bg-secondary/40 border-[rgba(var(--glass-border),0.3)] text-text-secondary hover:bg-secondary/60 hover:text-text-primary'}`}><Bell size={20} />{scannedPatterns.length > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-rose-500 rounded-full border-2 border-slate-900"></span>}</button>
                    {showSignals && (
                        <div className="absolute bottom-full left-0 mb-4 z-50 bg-secondary/95 backdrop-blur-xl border border-[rgba(var(--glass-border),0.3)] rounded-3xl shadow-2xl w-72 p-4 animate-in fade-in slide-in-from-bottom-4">
                            <h3 className="text-[10px] font-bold text-text-secondary uppercase px-2 py-1.5 mb-2 tracking-widest">Active Signals</h3>
                            {scannedPatterns.length === 0 ? (
                                <div className="text-xs text-text-secondary px-3 py-2 italic text-center bg-white/5 rounded-xl">No patterns detected yet.</div>
                            ) : (
                                <div className="space-y-1.5">
                                    {scannedPatterns.map((pat, i) => (
                                        <button key={i} onClick={() => { handlePatternClick(pat); setShowSignals(false); }} className="w-full text-left px-4 py-3 text-xs text-text-primary hover:bg-white/5 rounded-xl flex items-center gap-3 group transition-colors">
                                            <div className={`w-2 h-2 rounded-full ${dismissedPatterns.includes(pat) ? 'bg-slate-600' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'}`}></div>
                                            <span className={`font-medium ${dismissedPatterns.includes(pat) ? 'text-slate-500 line-through' : ''}`}>{pat}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Ensure pointer events are enabled for the chart container */}
            <div ref={chartContainerRef} className="w-full h-full relative z-10">
                {!isChartLibLoaded && <div className="flex items-center justify-center h-full text-slate-500 text-sm animate-pulse font-medium tracking-wide">Initializing Chart Engine...</div>}
            </div>
        </div>
    );
};
