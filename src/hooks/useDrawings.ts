import { useState, useEffect, useRef } from 'react';
import type { IChartApi, ISeriesApi, Time, MouseEventParams } from 'lightweight-charts';
import { TrendlinePrimitive, type TrendlineData } from '../components/Chart/plugins/TrendlinePrimitive';
import { BoxPrimitive, type BoxData } from '../components/Chart/plugins/BoxPrimitive';
import { AnchorPrimitive } from '../components/Chart/plugins/AnchorPrimitive';
import { useUIStore } from '../store/useUIStore';
import { useMarketStore } from '../store/useMarketStore';

export const useDrawings = (
    chart: IChartApi | null,
    series: ISeriesApi<"Candlestick"> | null,
    anchorTime: Time | null,
    onAnchorSelect: (time: Time | null) => void
) => {
    const { activeTool, setActiveTool } = useUIStore();
    const { trendlines, setTrendlines, zones, setZones } = useMarketStore();

    // Primitives Refs
    const trendlinePrimRef = useRef<TrendlinePrimitive | null>(null);
    const boxPrimRef = useRef<BoxPrimitive | null>(null);
    const anchorPrimRef = useRef<AnchorPrimitive | null>(null);

    // Interaction State
    const [selected, setSelected] = useState<{ type: 'trendline' | 'box' | 'anchor', id?: number } | null>(null);
    const [dragState, setDragState] = useState<{ type: 'trendline' | 'box' | 'anchor', index?: number, pointIndex?: 1 | 2 } | null>(null);

    const isDrawingRef = useRef(false);
    const tempPointRef = useRef<{ time: Time, price: number, x: number, y: number } | null>(null);

    // 1. Initialize Primitives
    useEffect(() => {
        if (!chart || !series) return;

        const tPrim = new TrendlinePrimitive(chart, series, trendlines);
        const bPrim = new BoxPrimitive(chart, series, zones);
        const aPrim = new AnchorPrimitive(chart, series, anchorTime);

        series.attachPrimitive(tPrim);
        series.attachPrimitive(bPrim);
        series.attachPrimitive(aPrim);

        trendlinePrimRef.current = tPrim;
        boxPrimRef.current = bPrim;
        anchorPrimRef.current = aPrim;

        return () => {
            // Cleanup check
            if ((series as any).detachPrimitive) {
                (series as any).detachPrimitive(tPrim);
                (series as any).detachPrimitive(bPrim);
                (series as any).detachPrimitive(aPrim);
            }
        };
    }, [chart, series]);

    // 2. Sync Store Changes -> Primitives
    // This ensures that when store updates (Delete All, Add New), the chart updates.
    useEffect(() => {
        if (trendlinePrimRef.current) {
            const tData = trendlines.map((t, i) => ({
                ...t,
                selected: selected?.type === 'trendline' && selected.id === i
            }));
            trendlinePrimRef.current.setData(tData);
        }
    }, [trendlines, selected]);

    useEffect(() => {
        if (boxPrimRef.current) {
            const bData = zones.map((z, i) => ({
                ...z,
                selected: selected?.type === 'box' && selected.id === i
            }));
            boxPrimRef.current.setData(bData);
        }
    }, [zones, selected]);

    useEffect(() => {
        if (anchorPrimRef.current) {
            anchorPrimRef.current.setData(anchorTime, selected?.type === 'anchor');
        }
    }, [anchorTime, selected]);

    // 3. Delete Logic (Keyboard)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
                if (selected.type === 'trendline' && selected.id !== undefined) {
                    setTrendlines(prev => prev.filter((_, i) => i !== selected.id));
                } else if (selected.type === 'box' && selected.id !== undefined) {
                    setZones(prev => prev.filter((_, i) => i !== selected.id));
                } else if (selected.type === 'anchor') {
                    onAnchorSelect(null); // Delete AVWAP
                }
                setSelected(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selected, setTrendlines, setZones, onAnchorSelect]);

    // 4. Mouse Interactions
    useEffect(() => {
        if (!chart || !series) return;

        const handleMouseDown = (param: MouseEventParams) => {
            if (!param.point) {
                setSelected(null);
                return;
            }
            const x = param.point.x;
            const y = param.point.y;
            const time = chart.timeScale().coordinateToTime(x) as Time;
            const price = series.coordinateToPrice(y);

            if (!time || price === null) return;

            // A. DRAWING MODE (New)
            if (activeTool) {
                if (activeTool === 'avwap') {
                    onAnchorSelect(time);
                    setActiveTool(null);
                    return;
                }

                isDrawingRef.current = true;
                tempPointRef.current = { time, price, x, y };
                setSelected(null);
                return;
            }

            // B. SELECTION & DRAG MODE (Hit Tests)

            // 1. Check Anchor (AVWAP)
            if (anchorPrimRef.current) {
                const hit = anchorPrimRef.current.hitTest(x, y);
                if (hit) {
                    setSelected({ type: 'anchor' });
                    setDragState({ type: 'anchor' });
                    chart.timeScale().applyOptions({ shiftVisibleRangeOnNewBar: false });
                    return;
                }
            }

            // 2. Check Trendlines
            if (trendlinePrimRef.current) {
                const hit = trendlinePrimRef.current.hitTest(x, y);
                if (hit && hit.externalId) {
                    const id = parseInt(hit.externalId.split('-')[1]);
                    setSelected({ type: 'trendline', id });
                    setDragState({ type: 'trendline', index: id, pointIndex: 2 });
                    chart.timeScale().applyOptions({ shiftVisibleRangeOnNewBar: false });
                    return;
                }
            }

            // 3. Check Zones
            if (boxPrimRef.current) {
                const hit = boxPrimRef.current.hitTest(x, y);
                if (hit && hit.externalId) {
                    const id = parseInt(hit.externalId.split('-')[1]);
                    setSelected({ type: 'box', id });
                    setDragState({ type: 'box', index: id, pointIndex: 2 });
                    chart.timeScale().applyOptions({ shiftVisibleRangeOnNewBar: false });
                    return;
                }
            }

            // Clicked Empty Space -> Deselect
            setSelected(null);
        };

        const handleMouseMove = (param: MouseEventParams) => {
            const x = param.point?.x;
            const y = param.point?.y;
            if (!x || !y) return;

            const time = chart.timeScale().coordinateToTime(x) as Time;
            const price = series.coordinateToPrice(y);
            if (!time || price === null) return;

            const currentPoint = { time, price };

            // A. DRAWING PREVIEW
            if (isDrawingRef.current && activeTool && tempPointRef.current) {
                const p1 = {
                    time: tempPointRef.current.time,
                    price: tempPointRef.current.price
                };

                if (activeTool === 'trendline' && trendlinePrimRef.current) {
                    // Update Primitive directly for smooth 60fps preview
                    trendlinePrimRef.current.setData([...trendlines, { p1, p2: currentPoint, color: '#3b82f6', width: 2, selected: true }]);
                } else if (activeTool === 'box' && boxPrimRef.current) {
                    boxPrimRef.current.setData([...zones, { p1, p2: currentPoint, color: '#3b82f6', fillColor: 'rgba(59,130,246,0.2)', width: 1, selected: true }]);
                }
                return;
            }

            // B. DRAGGING EXISTING
            if (dragState) {
                if (dragState.type === 'anchor') {
                    // Dragging AVWAP Anchor
                    onAnchorSelect(time); // Live update anchor time
                }
                else if (dragState.type === 'trendline' && dragState.index !== undefined) {
                    // Update Trendline in Store (triggers effect -> primitive update)
                    setTrendlines(prev => {
                        const next = [...prev];
                        if (next[dragState.index!]) {
                            // Only update P2 for now (resize)
                            next[dragState.index!].p2 = currentPoint;
                        }
                        return next;
                    });
                }
                else if (dragState.type === 'box' && dragState.index !== undefined) {
                    setZones(prev => {
                        const next = [...prev];
                        if (next[dragState.index!]) {
                            next[dragState.index!].p2 = currentPoint;
                        }
                        return next;
                    });
                }
            }
        };

        const handleMouseUp = (param: MouseEventParams) => {
            // A. FINISH DRAWING
            if (isDrawingRef.current && activeTool && tempPointRef.current && param.point) {
                const time = chart.timeScale().coordinateToTime(param.point.x) as Time;
                const price = series.coordinateToPrice(param.point.y);

                if (time && price !== null) {
                    const p1 = { time: tempPointRef.current.time, price: tempPointRef.current.price };
                    const p2 = { time, price };

                    // Capture the tool type before resetting
                    const toolType = activeTool;

                    // Reset Drawing State FIRST to clear preview
                    isDrawingRef.current = false;
                    tempPointRef.current = null;
                    setActiveTool(null);

                    // Then add to store - this will trigger the sync effect
                    if (toolType === 'trendline') {
                        setTrendlines(prev => [...prev, { p1, p2, color: '#3b82f6', width: 2 }]);
                    } else if (toolType === 'box') {
                        setZones(prev => [...prev, { p1, p2, color: '#3b82f6', fillColor: 'rgba(59,130,246,0.2)', width: 1 }]);
                    }
                }
            }

            // B. FINISH DRAG
            if (dragState) {
                setDragState(null);
                chart.timeScale().applyOptions({ shiftVisibleRangeOnNewBar: true });
            }
        };

        chart.subscribeClick(handleMouseDown);
        chart.subscribeCrosshairMove(handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            chart.unsubscribeClick(handleMouseDown);
            chart.unsubscribeCrosshairMove(handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [chart, series, activeTool, trendlines, zones, selected, anchorTime, dragState]);

    return {};
};