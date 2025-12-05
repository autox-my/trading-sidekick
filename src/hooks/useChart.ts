import { useEffect, useRef } from 'react';
import {
    createChart,
    ColorType,
    LineStyle,
    CandlestickSeries,
    LineSeries,
    BarSeries,
    HistogramSeries,
    createSeriesMarkers, // Import new V5 API
    CrosshairMode, // Import CrosshairMode
    type IChartApi,
    type ISeriesApi,
    type Time,
    type LineWidth,
    type SeriesMarker,
    type ISeriesMarkersPluginApi // Import Plugin Type
} from 'lightweight-charts';
import { useMarketStore } from '../store/useMarketStore';
import { useUIStore } from '../store/useUIStore';
import { calculateSMASeries, calculatePivotPoints } from '../utils/calculations';
import { mergePriceLevels, hexToRgba } from '../utils/helpers';
import type { Candle } from '../types';

interface UseChartProps {
    containerRef: React.RefObject<HTMLDivElement | null>;
    onCrosshairMove?: (data: any) => void;
}

export const useChart = ({ containerRef, onCrosshairMove }: UseChartProps) => {
    const { theme, setActiveAnnotation, setContextMenu, autoFitTrigger } = useUIStore();
    const {
        marketData,
        chartConfig,
        darkPoolLevels,
        showElliottWaves,
        elliottWaveData,
        playbookSetup
    } = useMarketStore();

    const chartInstance = useRef<IChartApi | null>(null);
    const mainSeries = useRef<ISeriesApi<"Candlestick" | "Bar" | "Line"> | null>(null);
    const volumeSeries = useRef<ISeriesApi<"Histogram"> | null>(null);
    const smaSeries = useRef<ISeriesApi<"Line"> | null>(null);
    const waveSeries = useRef<ISeriesApi<"Line"> | null>(null);
    const projectionSeries = useRef<ISeriesApi<"Line"> | null>(null);
    const seriesMarkersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null); // Ref for Markers Plugin

    // Store latest market data ref to access inside callbacks without re-subscribing
    const marketDataRef = useRef(marketData);
    marketDataRef.current = marketData;

    const annotationLinesRef = useRef<any[]>([]);
    const hoveredCandleRef = useRef<any>(null);
    const levelsRef = useRef<{ support: number | null, resistance: number | null, darkPools: any[] }>({ support: null, resistance: null, darkPools: [] });

    // Initialize Chart
    useEffect(() => {
        if (!containerRef.current) return;

        // Cleanup previous instance if it exists
        if (chartInstance.current) {
            chartInstance.current.remove();
            chartInstance.current = null;
        }

        try {
            const isDark = theme.mode === 'dark';
            const bgColor = isDark ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0)';
            const textColor = isDark ? '#94a3b8' : '#475569';
            const gridColor = isDark ? '#1e293b' : '#e2e8f0';

            // Chart Creation
            chartInstance.current = createChart(containerRef.current, {
                layout: {
                    background: { type: ColorType.Solid, color: bgColor },
                    textColor: textColor,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                },
                grid: {
                    vertLines: { visible: chartConfig.gridVisible, color: gridColor },
                    horzLines: { visible: chartConfig.gridVisible, color: gridColor }
                },
                width: containerRef.current.clientWidth,
                height: containerRef.current.clientHeight,
                rightPriceScale: {
                    visible: true,
                    autoScale: true,
                    scaleMargins: {
                        top: 0.05,
                        bottom: 0.2,
                    }
                },
                overlayPriceScales: {
                    scaleMargins: {
                        top: 0.8,
                        bottom: 0,
                    }
                },
                timeScale: {
                    timeVisible: true,
                    secondsVisible: false,
                    rightOffset: 15,
                    barSpacing: 6,
                    minBarSpacing: 0.5,
                },
                crosshair: {
                    mode: 1, // Magnet
                }
            });

            // Configure separate Volume Scale (Pane 1, 20% height) OR hidden
            const volVisible = chartConfig.volumeVisible ?? false;

            if (volVisible) {
                // Price Scale compressed to top 80%
                chartInstance.current.priceScale('right').applyOptions({
                    scaleMargins: {
                        top: 0.05,
                        bottom: 0.25, // Leave space for volume
                    }
                });

                chartInstance.current.priceScale('volume').applyOptions({
                    scaleMargins: {
                        top: 0.8, // Start at 80%
                        bottom: 0,
                    },
                    visible: false // No axis labels usually for volume
                });
            } else {
                // Full height for price
                chartInstance.current.priceScale('right').applyOptions({
                    scaleMargins: {
                        top: 0.05,
                        bottom: 0.05,
                    }
                });
            }

            // Crosshair Handler
            chartInstance.current.subscribeCrosshairMove((param) => {
                if (param.time && mainSeries.current) {
                    const data = param.seriesData.get(mainSeries.current);
                    const volData = volumeSeries.current ? param.seriesData.get(volumeSeries.current) : undefined;

                    if (data) {
                        const candleData = data as any;
                        const volValue = volData ? (volData as any).value : undefined;

                        const combined: Partial<Candle> = {
                            time: param.time as number,
                            open: candleData.open,
                            high: candleData.high,
                            low: candleData.low,
                            close: candleData.close,
                            volume: volValue
                        };

                        if (onCrosshairMove) onCrosshairMove(combined);

                        hoveredCandleRef.current = { ...combined };

                        const price = mainSeries.current?.coordinateToPrice(param.point?.y ?? 0);
                        const threshold = 0.50;

                        let found = null;
                        if (price !== null) {
                            const mergedLevels = mergePriceLevels(levelsRef.current.support, levelsRef.current.resistance, levelsRef.current.darkPools, threshold);
                            mergedLevels.forEach((lvl: any) => {
                                if (Math.abs(price - lvl.price) < threshold) {
                                    found = { type: lvl.label, price: lvl.price, y: param.point?.y };
                                }
                            });
                        }
                        setActiveAnnotation(found);
                    } else {
                        if (onCrosshairMove) onCrosshairMove(null);
                        setActiveAnnotation(null);
                    }
                } else {
                    setActiveAnnotation(null);
                    if (onCrosshairMove) onCrosshairMove(null);
                }
            });

            // Context Menu
            containerRef.current.addEventListener('contextmenu', (e: MouseEvent) => {
                e.preventDefault();
                if (hoveredCandleRef.current) {
                    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, data: hoveredCandleRef.current });
                }
            });

            // Init Volume Series
            volumeSeries.current = chartInstance.current.addSeries(HistogramSeries, {
                color: '#26a69a',
                priceFormat: {
                    type: 'volume',
                },
                priceScaleId: 'volume',
                visible: chartConfig.volumeVisible ?? false
            });

            // Init Indicators
            smaSeries.current = chartInstance.current.addSeries(LineSeries, {
                color: hexToRgba(chartConfig.smaColor, chartConfig.smaOpacity),
                lineWidth: 2,
                visible: chartConfig.smaVisible,
                lastValueVisible: false,
                priceLineVisible: false
            });

            waveSeries.current = chartInstance.current.addSeries(LineSeries, {
                color: '#3b82f6',
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                visible: true,
                lastValueVisible: false,
                priceLineVisible: false,
                crosshairMarkerVisible: false
            });

            projectionSeries.current = chartInstance.current.addSeries(LineSeries, {
                color: '#f97316',
                lineWidth: 1,
                lineStyle: LineStyle.Dotted,
                visible: true,
                lastValueVisible: false,
                priceLineVisible: false,
                crosshairMarkerVisible: false
            });

            if (marketDataRef.current.length > 0) {
                // Defer to next effect
            }

        } catch (e) {
            console.error("Chart initialization failed:", e);
        }

        return () => {
            if (chartInstance.current) {
                chartInstance.current.remove();
                chartInstance.current = null;
                mainSeries.current = null;
                volumeSeries.current = null;
                smaSeries.current = null;
                waveSeries.current = null;
                projectionSeries.current = null;
                seriesMarkersRef.current = null;
            }
        };
    }, []);

    // Manage Main Series
    useEffect(() => {
        if (!chartInstance.current) return;

        if (mainSeries.current) {
            chartInstance.current.removeSeries(mainSeries.current);
            mainSeries.current = null;
            seriesMarkersRef.current = null; // Clear markers plugin ref
        }

        try {
            if (chartConfig.chartType === 'line') {
                mainSeries.current = chartInstance.current.addSeries(LineSeries, {
                    color: hexToRgba(chartConfig.annotationColor, chartConfig.annotationOpacity),
                    lineWidth: 2
                });
            } else if (chartConfig.chartType === 'bar') {
                mainSeries.current = chartInstance.current.addSeries(BarSeries, {
                    upColor: hexToRgba(chartConfig.upColor, chartConfig.upOpacity),
                    downColor: hexToRgba(chartConfig.downColor, chartConfig.downOpacity),
                    thinBars: false
                });
            } else {
                mainSeries.current = chartInstance.current.addSeries(CandlestickSeries, {
                    upColor: hexToRgba(chartConfig.upColor, chartConfig.upOpacity),
                    downColor: hexToRgba(chartConfig.downColor, chartConfig.downOpacity),
                    borderVisible: true,
                    borderUpColor: hexToRgba(chartConfig.upColor, chartConfig.upOpacity),
                    borderDownColor: hexToRgba(chartConfig.downColor, chartConfig.downOpacity),
                    wickUpColor: hexToRgba(chartConfig.upColor, chartConfig.upOpacity),
                    wickDownColor: hexToRgba(chartConfig.downColor, chartConfig.downOpacity)
                });
            }

            // Initialize Markers Plugin for the new series
            seriesMarkersRef.current = createSeriesMarkers(mainSeries.current, [], {
                // Plugin defaults
            });


            if (marketData.length > 0) {
                updateData();
            }

        } catch (e) { console.error("Main series creation failed:", e); }

    }, [chartConfig.chartType]);

    // Update Data Helper
    const updateData = () => {
        if (!mainSeries.current || !volumeSeries.current || marketData.length === 0) return;

        // Price Data
        if (chartConfig.chartType === 'line') {
            mainSeries.current.setData(marketData.map((d) => ({ time: d.time as Time, value: d.close })));
        } else {
            mainSeries.current.setData(marketData.map(d => ({
                time: d.time as Time,
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close
            })));
        }

        // Volume Data
        volumeSeries.current.setData(marketData.map((d) => ({
            time: d.time as Time,
            value: d.volume,
            color: d.close >= d.open ? hexToRgba('#26a69a', 0.5) : hexToRgba('#ef5350', 0.5)
        })));

        // SMA
        if (smaSeries.current) {
            const smaData = calculateSMASeries(marketData, chartConfig.smaPeriod);
            smaSeries.current.setData(smaData.map(d => ({ time: d.time as Time, value: d.value })));
        }
    };

    // Effect: Handle Data Updates & Visuals
    useEffect(() => {
        if (!chartInstance.current || !mainSeries.current) return;

        updateData();

        // Annotations
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
                const lineOps = {
                    title: level.label,
                    color: level.price === support ? '#22c55e' : (level.price === resistance ? '#ef4444' : '#a855f7'),
                    lineWidth: 1 as LineWidth, // Cast explicitly
                    lineStyle: 2 as LineStyle,
                    axisLabelVisible: true
                };

                if (mainSeries.current) {
                    if (isZone) {
                        const line1 = mainSeries.current.createPriceLine({
                            ...lineOps,
                            price: level.maxPrice,
                            color: '#fbbf24',
                            lineStyle: 0
                        });
                        annotationLinesRef.current.push(line1);

                        const line2 = mainSeries.current.createPriceLine({
                            ...lineOps,
                            price: level.minPrice,
                            color: '#fbbf24',
                            axisLabelVisible: false,
                            title: '',
                            lineStyle: 0
                        });
                        annotationLinesRef.current.push(line2);
                    } else {
                        const line = mainSeries.current.createPriceLine({ ...lineOps, price: level.price });
                        annotationLinesRef.current.push(line);
                    }
                }
            });
        }

        // Playbook Lines
        if (playbookSetup && marketData.length > 0) {
            const { entry, stopLoss, target, direction } = playbookSetup;
            const entryLine = mainSeries.current.createPriceLine({ price: entry, title: `ENTRY ${direction}`, color: '#3b82f6', lineWidth: 2 as LineWidth, lineStyle: 0, axisLabelVisible: true });
            annotationLinesRef.current.push(entryLine);

            const slLine = mainSeries.current.createPriceLine({ price: stopLoss, title: 'STOP', color: '#ef4444', lineWidth: 2 as LineWidth, lineStyle: 2, axisLabelVisible: true });
            annotationLinesRef.current.push(slLine);

            const tpLine = mainSeries.current.createPriceLine({ price: target, title: 'TARGET', color: '#22c55e', lineWidth: 2 as LineWidth, lineStyle: 2, axisLabelVisible: true });
            annotationLinesRef.current.push(tpLine);
        }

        // Elliott Wave Visualization
        if (showElliottWaves && elliottWaveData && elliottWaveData.length > 0 && waveSeries.current && projectionSeries.current) {
            const markers: SeriesMarker<Time>[] = [];
            const confirmedData: any[] = [];

            const findTime = (ts: string | number) => {
                const target = typeof ts === 'string' ? new Date(ts).getTime() / 1000 : ts;
                // Market data is in seconds
                return marketData.find(d => d.time === target)?.time || target;
            };

            const confirmedWaves = elliottWaveData.filter(w => !w.isProjection);
            const projection = elliottWaveData.find(w => w.isProjection);

            confirmedWaves.forEach(w => {
                const t = findTime(w.time);
                confirmedData.push({ time: t as Time, value: w.price });

                markers.push({
                    time: t as Time,
                    position: w.type === 'low' ? 'belowBar' : 'aboveBar',
                    color: w.degree === 'minor' ? '#9333ea' : '#3b82f6',
                    shape: w.type === 'low' ? 'arrowUp' : 'arrowDown',
                    text: w.label
                });
            });

            confirmedData.sort((a, b) => (a.time as number) - (b.time as number));
            waveSeries.current.setData(confirmedData);

            if (projection && confirmedData.length > 0) {
                const last = confirmedData[confirmedData.length - 1];
                const projTime = findTime(projection.time);
                projectionSeries.current.setData([
                    last,
                    { time: projTime as Time, value: projection.price }
                ]);
                markers.push({
                    time: projTime as Time,
                    position: projection.type === 'low' ? 'belowBar' : 'aboveBar',
                    color: '#f97316',
                    shape: 'circle',
                    text: projection.label
                });
            }

            markers.sort((a, b) => (a.time as number) - (b.time as number));

            // Use the Markers Plugin API
            if (seriesMarkersRef.current) {
                seriesMarkersRef.current.setMarkers(markers);
            }

        } else {
            if (seriesMarkersRef.current) {
                seriesMarkersRef.current.setMarkers([]);
            }
            waveSeries.current?.setData([]);
            projectionSeries.current?.setData([]);
        }

    }, [marketData, chartConfig, showElliottWaves, elliottWaveData, playbookSetup]);

    // Appearance Updates
    useEffect(() => {
        if (!chartInstance.current) return;
        const isDark = theme.mode === 'dark';
        const bgColor = isDark ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0)';
        const textColor = isDark ? '#94a3b8' : '#475569';
        const gridColor = isDark ? '#1e293b' : '#e2e8f0';

        chartInstance.current.applyOptions({
            layout: { background: { color: bgColor }, textColor: textColor },
            grid: {
                vertLines: { color: gridColor, visible: chartConfig.gridVisible },
                horzLines: { color: gridColor, visible: chartConfig.gridVisible }
            },
            crosshair: {
                mode: chartConfig.magnetMode === 'magnetOHLC' ? CrosshairMode.MagnetOHLC : (chartConfig.magnetMode === 'magnet' ? CrosshairMode.Magnet : CrosshairMode.Normal)
            }
        });

        if (mainSeries.current && chartConfig.chartType === 'candle') {
            mainSeries.current.applyOptions({
                upColor: hexToRgba(chartConfig.upColor, chartConfig.upOpacity),
                downColor: hexToRgba(chartConfig.downColor, chartConfig.downOpacity),
                borderUpColor: chartConfig.borderUpColor,
                borderDownColor: chartConfig.borderDownColor,
                wickUpColor: chartConfig.borderUpColor,
                wickDownColor: chartConfig.borderDownColor
            });
        }

        if (smaSeries.current) {
            smaSeries.current.applyOptions({
                visible: chartConfig.smaVisible,
                color: hexToRgba(chartConfig.smaColor, chartConfig.smaOpacity)
            });
        }

        // Update Layout/Volume Visibility
        const volVisible = chartConfig.volumeVisible ?? false;
        if (volumeSeries.current) {
            volumeSeries.current.applyOptions({ visible: volVisible });

            if (volVisible) {
                chartInstance.current.priceScale('right').applyOptions({
                    scaleMargins: { top: 0.05, bottom: 0.25 }
                });
                chartInstance.current.priceScale('volume').applyOptions({
                    scaleMargins: { top: 0.8, bottom: 0 }
                });
            } else {
                chartInstance.current.priceScale('right').applyOptions({
                    scaleMargins: { top: 0.05, bottom: 0.05 }
                });
            }
        }

    }, [chartConfig, theme.mode, chartConfig.magnetMode]);

    // Resizing
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

    // Auto-Fit Trigger
    useEffect(() => {
        if (chartInstance.current && autoFitTrigger > 0 && marketData.length > 1) {
            chartInstance.current.timeScale().fitContent();
            chartInstance.current.priceScale('right').applyOptions({ autoScale: true });
        }
    }, [autoFitTrigger]);

    return { chartInstance, mainSeries, hoveredCandleRef };
};
