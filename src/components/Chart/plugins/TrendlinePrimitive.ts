import type {
    ISeriesPrimitive,
    IPrimitivePaneView,
    IPrimitivePaneRenderer,
    IChartApi,
    ISeriesApi,
    Time,
    SeriesAttachedParameter
} from 'lightweight-charts';
import { CanvasRenderingTarget2D } from 'fancy-canvas';

interface Point {
    time: Time;
    price: number;
}

export interface TrendlineData {
    p1: Point;
    p2: Point;
    color: string;
    width: number;
}

class TrendlinePaneRenderer implements IPrimitivePaneRenderer {
    private _data: TrendlineData;
    private _p1: { x: number; y: number } | null = null;
    private _p2: { x: number; y: number } | null = null;

    constructor(data: TrendlineData, p1: { x: number; y: number } | null, p2: { x: number; y: number } | null) {
        this._data = data;
        this._p1 = p1;
        this._p2 = p2;
    }

    draw(target: CanvasRenderingTarget2D) {
        target.useBitmapCoordinateSpace((scope) => {
            if (this._p1 === null || this._p2 === null) return;

            const ctx = scope.context;
            ctx.beginPath();
            ctx.strokeStyle = this._data.color;
            ctx.lineWidth = this._data.width;
            ctx.moveTo(this._p1.x, this._p1.y);
            ctx.lineTo(this._p2.x, this._p2.y);
            ctx.stroke();
        });
    }
}

class TrendlinePaneView implements IPrimitivePaneView {
    private _source: TrendlinePrimitive;
    private _data: TrendlineData;

    constructor(source: TrendlinePrimitive, data: TrendlineData) {
        this._source = source;
        this._data = data;
    }

    renderer(): IPrimitivePaneRenderer | null {
        const p1 = this._source.getCoordinate(this._data.p1);
        const p2 = this._source.getCoordinate(this._data.p2);
        return new TrendlinePaneRenderer(this._data, p1, p2);
    }
}

export class TrendlinePrimitive implements ISeriesPrimitive<Time> {
    private _chart: IChartApi;
    private _series: ISeriesApi<"Candlestick">;
    private _data: TrendlineData[];
    private _views: TrendlinePaneView[] = [];
    private _requestUpdate?: () => void;

    constructor(chart: IChartApi, series: ISeriesApi<"Candlestick">, data: TrendlineData[]) {
        this._chart = chart;
        this._series = series;
        this._data = data;
        this._updateViews();
    }

    attached({ requestUpdate }: SeriesAttachedParameter<Time>) {
        this._requestUpdate = requestUpdate;
    }

    detached() {
        this._requestUpdate = undefined;
    }

    updateAllViews() {
        // No-op
    }

    paneViews() {
        return this._views;
    }

    getCoordinate(point: Point): { x: number, y: number } | null {
        const timeScale = this._chart.timeScale();
        const y = this._series.priceToCoordinate(point.price);
        const x = timeScale.timeToCoordinate(point.time as Time);

        if (x === null || y === null) return null;
        return { x, y };
    }

    setData(data: TrendlineData[]) {
        this._data = data;
        this._updateViews();
        this._requestUpdate?.();
    }

    private _updateViews() {
        this._views = this._data.map(d => new TrendlinePaneView(this, d));
    }
}
