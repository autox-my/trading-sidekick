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

export interface BoxData {
    p1: Point;
    p2: Point;
    color: string;
    fillColor: string;
    width: number;
}

class BoxPaneRenderer implements IPrimitivePaneRenderer {
    private _data: BoxData;
    private _p1: { x: number; y: number } | null = null;
    private _p2: { x: number; y: number } | null = null;

    constructor(data: BoxData, p1: { x: number; y: number } | null, p2: { x: number; y: number } | null) {
        this._data = data;
        this._p1 = p1;
        this._p2 = p2;
    }

    draw(target: CanvasRenderingTarget2D) {
        target.useBitmapCoordinateSpace((scope) => {
            if (this._p1 === null || this._p2 === null) return;

            const ctx = scope.context;
            const x = Math.min(this._p1.x, this._p2.x);
            const y = Math.min(this._p1.y, this._p2.y);
            const w = Math.abs(this._p2.x - this._p1.x);
            const h = Math.abs(this._p2.y - this._p1.y);

            ctx.fillStyle = this._data.fillColor;
            ctx.fillRect(x, y, w, h);

            ctx.beginPath();
            ctx.strokeStyle = this._data.color;
            ctx.lineWidth = this._data.width;
            ctx.rect(x, y, w, h);
            ctx.stroke();
        });
    }
}

class BoxPaneView implements IPrimitivePaneView {
    private _source: BoxPrimitive;
    private _data: BoxData;

    constructor(source: BoxPrimitive, data: BoxData) {
        this._source = source;
        this._data = data;
    }

    renderer(): IPrimitivePaneRenderer | null {
        const p1 = this._source.getCoordinate(this._data.p1);
        const p2 = this._source.getCoordinate(this._data.p2);
        return new BoxPaneRenderer(this._data, p1, p2);
    }
}

export class BoxPrimitive implements ISeriesPrimitive<Time> {
    private _chart: IChartApi;
    private _series: ISeriesApi<"Candlestick">;
    private _data: BoxData[];
    private _views: BoxPaneView[] = [];
    private _requestUpdate?: () => void;

    constructor(chart: IChartApi, series: ISeriesApi<"Candlestick">, data: BoxData[]) {
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

    setData(data: BoxData[]) {
        this._data = data;
        this._updateViews();
        this._requestUpdate?.();
    }

    private _updateViews() {
        this._views = this._data.map(d => new BoxPaneView(this, d));
    }
}
