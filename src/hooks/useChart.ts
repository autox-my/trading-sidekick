import { useEffect, useRef } from 'react';
import { createChart, ColorType, LineStyle, type IChartApi, type ISeriesApi } from 'lightweight-charts';
import { useMarketStore } from '../store/useMarketStore';
import { useUIStore } from '../store/useUIStore';
import { calculateSMASeries, calculatePivotPoints } from '../utils/calculations';
import { mergePriceLevels, hexToRgba } from '../utils/helpers';

export const useChart = (containerRef: React.RefObject<HTMLDivElement | null>) => {
    const { theme, viewMode, setActiveAnnotation, setContextMenu, autoFitTrigger } = useUIStore();
    const {
        marketData,
        chartConfig,
        setChartConfig,
        darkPoolLevels,
        activeSymbol,
        timeframe,
        showElliottWaves,
        elliottWaveData,
        playbookSetup
    } = useMarketStore();

    const chartInstance = useRef<IChartApi | null>(null);
    const mainSeries = useRef<ISeriesApi<"Candlestick" | "Bar" | "Line"> | null>(null);
    const smaSeries = useRef<ISeriesApi<"Line"> | null>(null);
    const waveSeries = useRef<ISeriesApi<"Line"> | null>(null);
    const projectionSeries = useRef<ISeriesApi<"Line"> | null>(null);
    const annotationLinesRef = useRef<any[]>([]);
    const hoveredCandleRef = useRef<any>(null);
    const levelsRef = useRef<{ support: number | null, resistance: number | null, darkPools: any[] }>({ support: null, resistance: null, darkPools: [] });

    // Initialize Chart
    useEffect(() => {
        if (!containerRef.current) return;

        if (!chartInstance.current) {
            try {
                const safeMarginTop = Math.max(0, Math.min(0.5, chartConfig.marginTop ?? 0.05));
                const safeMarginBottom = Math.max(0, Math.min(0.5, chartConfig.marginBottom ?? 0.05));
                const safeMarginRight = Math.max(0, Math.min(0.5, chartConfig.marginRight ?? 0.1));
                const rightOffset = Math.max(0, safeMarginRight * 100);

                const isDark = theme.mode === 'dark';
                const bgColor = isDark ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0)';
                const textColor = isDark ? '#94a3b8' : '#475569';
                const gridColor = isDark ? '#1e293b' : '#e2e8f0';

                chartInstance.current = createChart(containerRef.current, {
                    layout: {
                        background: { type: ColorType.Solid, color: bgColor },
                        textColor: textColor,
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                    },
                    grid: { vertLines: { visible: chartConfig.gridVisible, color: gridColor }, horzLines: { visible: chartConfig.gridVisible, color: gridColor } },
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight,
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
                    if (param.time && param.seriesData.size > 0 && mainSeries.current) {
                        const data = param.seriesData.get(mainSeries.current);
                        if (data) {
                            hoveredCandleRef.current = data;
                            const price = mainSeries.current.coordinateToPrice(param.point.y);
                            const threshold = 0.50;
                            const mergedLevels = mergePriceLevels(levelsRef.current.support, levelsRef.current.resistance, levelsRef.current.darkPools, threshold);
                            let found = null;
                            if (price !== null) {
                                mergedLevels.forEach((lvl: any) => {
                                    if (Math.abs(price - lvl.price) < threshold) {
                                        found = { type: lvl.label, price: lvl.price, y: param.point.y };
                                    }
                                });
                            }
                            setActiveAnnotation(found);
                        }
                    } else { setActiveAnnotation(null); }
                });

                containerRef.current.addEventListener('contextmenu', (e: MouseEvent) => {
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

                waveSeries.current = chartInstance.current.addLineSeries({
                    color: '#3b82f6',
                    lineWidth: 1,
                    lineStyle: LineStyle.Dashed,
                    visible: true,
                    lastValueVisible: false,
                    priceLineVisible: false,
                    crosshairMarkerVisible: false
                });

                projectionSeries.current = chartInstance.current.addLineSeries({
                    color: '#f97316',
                    lineWidth: 1,
                    lineStyle: LineStyle.Dotted,
                    visible: true,
                    lastValueVisible: false,
                    priceLineVisible: false,
                    crosshairMarkerVisible: false
                });
            } catch (e) {
                console.error("Chart initialization failed:", e);
                setChartConfig({
                    ...chartConfig,
                    marginTop: 0.05,
                    marginBottom: 0.05,
                    marginRight: 0.1,
                    smaPeriod: 20,
                    smaVisible: true
                });
            }
        }

        return () => {
            if (chartInstance.current) {
                chartInstance.current.remove();
                chartInstance.current = null;
                mainSeries.current = null;
                smaSeries.current = null;
                waveSeries.current = null;
                projectionSeries.current = null;
            }
        };
    }, []);

    // Manage Main Series
    useEffect(() => {
        if (!chartInstance.current) return;
        if (mainSeries.current) chartInstance.current.removeSeries(mainSeries.current);

        try {
            if (chartConfig.chartType === 'line') {
                mainSeries.current = chartInstance.current.addLineSeries({
                    color: hexToRgba(chartConfig.annotationColor, chartConfig.annotationOpacity),
                    lineWidth: 2
                }) as any;
            } else if (chartConfig.chartType === 'bar') {
                mainSeries.current = chartInstance.current.addBarSeries({
                    upColor: hexToRgba(chartConfig.upColor, chartConfig.upOpacity),
                    downColor: hexToRgba(chartConfig.downColor, chartConfig.downOpacity),
                    thinBars: false
                }) as any;
            } else {
                mainSeries.current = chartInstance.current.addCandlestickSeries({
                    upColor: hexToRgba(chartConfig.upColor, chartConfig.upOpacity),
                    downColor: hexToRgba(chartConfig.downColor, chartConfig.downOpacity),
                    borderVisible: true,
                    borderUpColor: hexToRgba(chartConfig.upColor, chartConfig.upOpacity),
                    borderDownColor: hexToRgba(chartConfig.downColor, chartConfig.downOpacity),
                    wickUpColor: hexToRgba(chartConfig.upColor, chartConfig.upOpacity),
                    wickDownColor: hexToRgba(chartConfig.downColor, chartConfig.downOpacity)
                }) as any;
            }
        } catch (e) { console.error("Main series creation failed:", e); }

        if (marketData.length > 0 && mainSeries.current) {
            if (chartConfig.chartType === 'line') {
                mainSeries.current.setData(marketData.map((d: any) => ({ time: d.time, value: d.close })));
            } else {
                mainSeries.current.setData(marketData as any);
            }
        }
    }, [chartConfig.chartType]);

    // Apply Config Updates
    useEffect(() => {
        if (!chartInstance.current) return;
        try {
            const safeMarginTop = Math.max(0, Math.min(0.5, chartConfig.marginTop ?? 0.05));
            const safeMarginBottom = Math.max(0, Math.min(0.5, chartConfig.marginBottom ?? 0.05));
            const safeMarginRight = Math.max(0, Math.min(0.5, chartConfig.marginRight ?? 0.1));
            const rightOffset = Math.max(0, safeMarginRight * 100);
            const isDark = theme.mode === 'dark';
            const bgColor = isDark ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0)';
            const textColor = isDark ? '#94a3b8' : '#475569';
            const gridColor = isDark ? '#1e293b' : '#e2e8f0';

            chartInstance.current.applyOptions({
                layout: { background: { color: bgColor }, textColor: textColor },
                grid: { vertLines: { visible: chartConfig.gridVisible, color: gridColor }, horzLines: { visible: chartConfig.gridVisible, color: gridColor } },
                rightPriceScale: { scaleMargins: { top: safeMarginTop, bottom: safeMarginBottom } },
                timeScale: { rightOffset: rightOffset }
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
        } catch (e) { console.warn("Chart config update failed:", e); }
    }, [chartConfig, theme.mode]);

    // Resize
    useEffect(() => {
        if (!containerRef.current || !chartInstance.current) return;
        const resizeObserver = new ResizeObserver(entries => {
            if (entries.length === 0 || !entries[0].contentRect || !chartInstance.current) return;
            const { width, height } = entries[0].contentRect;
            chartInstance.current.applyOptions({ width, height });
        });
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // Update Data & Auto-Fit
    useEffect(() => {
        if (!chartInstance.current || !mainSeries.current || !smaSeries.current) return;

        if (marketData.length > 0) {
            if (chartConfig.chartType === 'line') {
                mainSeries.current.setData(marketData.map((d: any) => ({ time: d.time, value: d.close })));
            } else {
                mainSeries.current.setData(marketData as any);
            }
            smaSeries.current.setData(calculateSMASeries(marketData, chartConfig.smaPeriod) as any);
        }

        annotationLinesRef.current.forEach(line => mainSeries.current?.removePriceLine(line));
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
                    const topLine = mainSeries.current?.createPriceLine({ price: level.maxPrice, title: level.label, color: '#fbbf24', lineWidth: 1, lineStyle: 0, axisLabelVisible: true });
                    const bottomLine = mainSeries.current?.createPriceLine({ price: level.minPrice, title: '', color: '#fbbf24', lineWidth: 1, lineStyle: 0, axisLabelVisible: false });
                    if (topLine) annotationLinesRef.current.push(topLine);
                    if (bottomLine) annotationLinesRef.current.push(bottomLine);
                } else {
                    const color = level.price === support ? '#22c55e' : (level.price === resistance ? '#ef4444' : '#a855f7');
                    const line = mainSeries.current?.createPriceLine({ price: level.price, title: level.label, color, lineWidth: 1, lineStyle: 2, axisLabelVisible: true });
                    if (line) annotationLinesRef.current.push(line);
                }
            });
        }

        // Elliott Wave Markers
        if (showElliottWaves && elliottWaveData && elliottWaveData.length > 0 && marketData.length > 0) {
            const markers = elliottWaveData.map((wave: any) => {
                const waveDate = new Date(wave.time);
                const waveTime = waveDate.getTime();
                if (isNaN(waveTime)) return null;

                let nearestTime = marketData[0].time;
                let minDiff = Infinity;

                for (const d of marketData) {
                    let dTime = typeof d.time === 'string' ? new Date(d.time).getTime() : d.time * 1000;
                    const diff = Math.abs(dTime - waveTime);
                    if (diff < minDiff) {
                        minDiff = diff;
                        nearestTime = d.time;
                    }
                }
                return {
                    time: nearestTime,
                    position: 'aboveBar',
                    color: '#3b82f6',
                    shape: 'arrowDown',
                    text: wave.label,
                    size: 2
                };
            }).filter(m => m !== null);

            markers.sort((a: any, b: any) => {
                const tA = typeof a.time === 'string' ? new Date(a.time).getTime() : a.time;
                const tB = typeof b.time === 'string' ? new Date(b.time).getTime() : b.time;
                return tA - tB;
            });
            mainSeries.current.setMarkers(markers as any);

            // Update Wave Line Series
            if (waveSeries.current && projectionSeries.current) {
                // Separate confirmed waves and projections
                const confirmedWaves = elliottWaveData.filter(w => !w.isProjection);
                const projection = elliottWaveData.find(w => w.isProjection);

                // Confirmed Waves Data
                const lineData = confirmedWaves.map((wave: any) => ({
                    time: wave.time,
                    value: wave.price
                })).sort((a: any, b: any) => {
                    const tA = typeof a.time === 'string' ? new Date(a.time).getTime() : a.time;
                    const tB = typeof b.time === 'string' ? new Date(b.time).getTime() : b.time;
                    return tA - tB;
                });

                waveSeries.current.setData(lineData as any);
                waveSeries.current.applyOptions({ visible: true });

                // Projection Data
                const projectionData = [];
                if (projection && lineData.length > 0) {
                    // Connect last confirmed point to projection
                    const lastConfirmed = lineData[lineData.length - 1];
                    projectionData.push(lastConfirmed);
                    projectionData.push({
                        time: projection.time,
                        value: projection.price
                    });
                }
                projectionSeries.current.setData(projectionData as any);
                projectionSeries.current.applyOptions({ visible: true });

                // Update markers
                const getMarkerColor = (degree?: string) => {
                    switch (degree) {
                        case 'minor': return '#9333ea'; // Purple
                        case 'minute': return '#2563eb'; // Blue
                        case 'minuette': return '#16a34a'; // Green
                        case 'subminuette': return '#9ca3af'; // Gray
                        default: return '#3b82f6';
                    }
                };

                const getMarkerSize = (degree?: string) => {
                    switch (degree) {
                        case 'minor': return 2;
                        case 'minute': return 1;
                        case 'minuette': return 0; // Smallest
                        case 'subminuette': return 0;
                        default: return 1;
                    }
                };

                const markers = confirmedWaves.map((wave: any) => ({
                    time: wave.time,
                    position: wave.type === 'low' ? 'belowBar' : 'aboveBar',
                    color: getMarkerColor(wave.degree),
                    shape: 'circle',
                    text: wave.label,
                    size: getMarkerSize(wave.degree)
                }));

                const projectionMarkers = projection ? [{
                    time: projection.time,
                    position: projection.type === 'low' ? 'belowBar' : 'aboveBar',
                    color: '#f97316', // Orange for projection
                    shape: 'circle',
                    text: projection.label,
                    size: getMarkerSize(projection.degree)
                }] : [];

                const allMarkers = [...markers, ...projectionMarkers].sort((a: any, b: any) => {
                    const tA = typeof a.time === 'string' ? new Date(a.time).getTime() : a.time;
                    const tB = typeof b.time === 'string' ? new Date(b.time).getTime() : b.time;
                    return tA - tB;
                });

                mainSeries.current.setMarkers(allMarkers as any);
            }
        } else {
            mainSeries.current.setMarkers([]);
            if (waveSeries.current) waveSeries.current.setData([]);
            if (projectionSeries.current) projectionSeries.current.setData([]);
        }

        // Playbook Lines
        if (useMarketStore.getState().playbookSetup && marketData.length > 0) {
            const setup = useMarketStore.getState().playbookSetup;
            if (setup) {
                const entryLine = mainSeries.current.createPriceLine({
                    price: setup.entry,
                    title: `ENTRY (${setup.direction})`,
                    color: '#3b82f6', // Blue
                    lineWidth: 2,
                    lineStyle: LineStyle.Solid,
                    axisLabelVisible: true
                });
                const stopLine = mainSeries.current.createPriceLine({
                    price: setup.stopLoss,
                    title: 'STOP',
                    color: '#ef4444', // Red
                    lineWidth: 2,
                    lineStyle: LineStyle.Dashed,
                    axisLabelVisible: true
                });
                const targetLine = mainSeries.current.createPriceLine({
                    price: setup.target,
                    title: 'TARGET',
                    color: '#22c55e', // Green
                    lineWidth: 2,
                    lineStyle: LineStyle.Dashed,
                    axisLabelVisible: true
                });

                annotationLinesRef.current.push(entryLine);
                annotationLinesRef.current.push(stopLine);
                annotationLinesRef.current.push(targetLine);
            }
        }

    }, [chartConfig.annotationVisible, marketData, darkPoolLevels, viewMode, activeSymbol, timeframe, chartConfig.chartType, showElliottWaves, elliottWaveData, playbookSetup]);

    // Auto Fit
    useEffect(() => {
        if (chartInstance.current && autoFitTrigger > 0 && marketData.length > 1) {
            chartInstance.current.priceScale('right').applyOptions({ autoScale: true });
            chartInstance.current.timeScale().fitContent();
        }
    }, [autoFitTrigger]);

    return { chartInstance, mainSeries, hoveredCandleRef };
};
