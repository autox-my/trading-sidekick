import { useState, useEffect, useRef } from 'react';
import type { IChartApi, ISeriesApi, Time, MouseEventParams } from 'lightweight-charts';
import { TrendlinePrimitive, type TrendlineData } from '../components/Chart/plugins/TrendlinePrimitive';
import { BoxPrimitive, type BoxData } from '../components/Chart/plugins/BoxPrimitive';
import { useUIStore } from '../store/useUIStore';
import { useMarketStore } from '../store/useMarketStore';

export const useDrawings = (
    chart: IChartApi | null,
    series: ISeriesApi<"Candlestick"> | null,
    onAnchorSelect?: (time: Time) => void
) => {
    const { activeTool, setActiveTool } = useUIStore();
    const {
        trendlines: drawings,
        setTrendlines: setDrawings,
        zones: boxes,
        setZones: setBoxes
    } = useMarketStore();

    const trendlinePrimitiveRef = useRef<TrendlinePrimitive | null>(null);
    const boxPrimitiveRef = useRef<BoxPrimitive | null>(null);
    const tempPointRef = useRef<{ time: Time, price: number } | null>(null);

    // Initialize Primitives
    useEffect(() => {
        if (!chart || !series) return;

        const trendlinePrimitive = new TrendlinePrimitive(chart, series, drawings);
        series.attachPrimitive(trendlinePrimitive);
        trendlinePrimitiveRef.current = trendlinePrimitive;

        const boxPrimitive = new BoxPrimitive(chart, series, boxes);
        series.attachPrimitive(boxPrimitive);
        boxPrimitiveRef.current = boxPrimitive;

        return () => {
            if (series) {
                try {
                    series.detachPrimitive(trendlinePrimitive);
                    series.detachPrimitive(boxPrimitive);
                } catch (e) { }
            }
        };
    }, [chart, series]);

    // Update Data
    useEffect(() => {
        if (trendlinePrimitiveRef.current) {
            trendlinePrimitiveRef.current.setData(drawings);
        }
    }, [drawings]);

    useEffect(() => {
        if (boxPrimitiveRef.current) {
            boxPrimitiveRef.current.setData(boxes);
        }
    }, [boxes]);

    // Click Handler
    useEffect(() => {
        if (!chart || !series) return;

        const handleClick = (param: MouseEventParams) => {
            if (!activeTool) return;
            if (!param.time || !param.point) return;

            const price = series.coordinateToPrice(param.point.y);
            if (price === null) return;

            const clickedPoint = { time: param.time, price };

            if (!tempPointRef.current) {
                // Start drawing
                tempPointRef.current = clickedPoint;
            } else {
                // Finish drawing
                if (activeTool === 'trendline') {
                    const newDrawing: TrendlineData = {
                        p1: tempPointRef.current,
                        p2: clickedPoint,
                        color: '#3b82f6', // blue-500
                        width: 2
                    };
                    setDrawings(d => [...d, newDrawing]);
                } else if (activeTool === 'box') {
                    const newBox: BoxData = {
                        p1: tempPointRef.current,
                        p2: clickedPoint,
                        color: '#3b82f6',
                        fillColor: 'rgba(59, 130, 246, 0.2)', // blue-500 with opacity
                        width: 1
                    };
                    setBoxes(b => [...b, newBox]);
                } else if (activeTool === 'avwap') {
                    if (onAnchorSelect) {
                        onAnchorSelect(clickedPoint.time);
                    }
                    setActiveTool(null);
                    tempPointRef.current = null;
                    return; // Early return for avwap as it's not a drawing primitive
                }

                tempPointRef.current = null;
                setActiveTool(null); // Reset tool
            }
        };

        const handleMove = (param: MouseEventParams) => {
            if (!activeTool || !tempPointRef.current) return;
            if (!param.time || !param.point) return;

            const price = series.coordinateToPrice(param.point.y);
            if (price === null) return;

            const currentPoint = { time: param.time, price };

            if (activeTool === 'trendline' && trendlinePrimitiveRef.current) {
                const previewLine: TrendlineData = {
                    p1: tempPointRef.current,
                    p2: currentPoint,
                    color: '#3b82f6',
                    width: 2
                };
                trendlinePrimitiveRef.current.setData([...drawings, previewLine]);
            } else if (activeTool === 'box' && boxPrimitiveRef.current) {
                const previewBox: BoxData = {
                    p1: tempPointRef.current,
                    p2: currentPoint,
                    color: '#3b82f6',
                    fillColor: 'rgba(59, 130, 246, 0.2)',
                    width: 1
                };
                boxPrimitiveRef.current.setData([...boxes, previewBox]);
            }
        };

        chart.subscribeClick(handleClick);
        chart.subscribeCrosshairMove(handleMove);

        return () => {
            chart.unsubscribeClick(handleClick);
            chart.unsubscribeCrosshairMove(handleMove);
        };

    }, [chart, series, activeTool, drawings, boxes, setActiveTool]);

    return {};
};
