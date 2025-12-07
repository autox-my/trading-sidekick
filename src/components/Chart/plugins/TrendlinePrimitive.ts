import type { ISeriesPrimitive, IPrimitivePaneView, IPrimitivePaneRenderer, IChartApi, ISeriesApi, Time, SeriesAttachedParameter, Coordinate } from 'lightweight-charts';
import { CanvasRenderingTarget2D } from 'fancy-canvas';

export interface Point { time: Time; price: number; }
export interface TrendlineData { p1: Point; p2: Point; color: string; width: number; selected?: boolean; }

interface ViewPoint {
    x: Coordinate | null;
    y: Coordinate | null;
}

class TrendlineRenderer implements IPrimitivePaneRenderer {
    private _data: TrendlineData;
    private _p1: ViewPoint;
    private _p2: ViewPoint;

    constructor(data: TrendlineData, p1: ViewPoint, p2: ViewPoint) {
        this._data = data;
        this._p1 = p1;
        this._p2 = p2;
    }

    draw(target: CanvasRenderingTarget2D) {
        target.useBitmapCoordinateSpace(scope => {
            if (this._p1.x === null || this._p1.y === null || this._p2.x === null || this._p2.y === null) return;

            const ctx = scope.context;
            const x1Scaled = Math.round(this._p1.x * scope.horizontalPixelRatio);
            const y1Scaled = Math.round(this._p1.y * scope.verticalPixelRatio);
            const x2Scaled = Math.round(this._p2.x * scope.horizontalPixelRatio);
            const y2Scaled = Math.round(this._p2.y * scope.verticalPixelRatio);

            ctx.lineWidth = this._data.width;
            ctx.strokeStyle = this._data.selected ? '#2962FF' : this._data.color;
            ctx.beginPath();
            ctx.moveTo(x1Scaled, y1Scaled);
            ctx.lineTo(x2Scaled, y2Scaled);
            ctx.stroke();

            if (this._data.selected) {
                ctx.fillStyle = '#fff';
                ctx.strokeStyle = '#2962FF';
                ctx.lineWidth = 2;
                [{ x: x1Scaled, y: y1Scaled }, { x: x2Scaled, y: y2Scaled }].forEach(p => {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 4 * scope.horizontalPixelRatio, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.stroke();
                });
            }
        });
    }
}

class TrendlineView implements IPrimitivePaneView {
    private _p1: ViewPoint = { x: null, y: null };
    private _p2: ViewPoint = { x: null, y: null };
    private _source: TrendlinePrimitive;
    private _data: TrendlineData;

    constructor(source: TrendlinePrimitive, data: TrendlineData) {
        this._source = source;
        this._data = data;
    }

    update() {
        const series = this._source._series;
        const timeScale = this._source._chart.timeScale();
        this._p1 = {
            x: timeScale.timeToCoordinate(this._data.p1.time),
            y: series.priceToCoordinate(this._data.p1.price)
        };
        this._p2 = {
            x: timeScale.timeToCoordinate(this._data.p2.time),
            y: series.priceToCoordinate(this._data.p2.price)
        };
    }

    renderer() {
        return new TrendlineRenderer(this._data, this._p1, this._p2);
    }
}

export class TrendlinePrimitive implements ISeriesPrimitive<Time> {
    private _views: TrendlineView[] = [];
    private _requestUpdate?: () => void;
    public _chart: IChartApi;
    public _series: ISeriesApi<"Candlestick">;

    constructor(chart: IChartApi, series: ISeriesApi<"Candlestick">, private _data: TrendlineData[]) {
        this._chart = chart;
        this._series = series;
        this._updateViews();
    }

    attached({ requestUpdate }: SeriesAttachedParameter<Time>) {
        this._requestUpdate = requestUpdate;
        this._requestUpdate();
    }

    detached() { this._requestUpdate = undefined; }

    paneViews() { return this._views; }

    updateAllViews() {
        this._views.forEach(view => view.update());
        this._requestUpdate?.();
    }

    hitTest(x: number, y: number) {
        for (let i = 0; i < this._data.length; i++) {
            const view = this._views[i];
            view.update();
            const p1 = (view as any)._p1;
            const p2 = (view as any)._p2;

            if (!p1 || !p2 || p1.x === null || p1.y === null || p2.x === null || p2.y === null) continue;

            // Distance to line segment
            const l2 = Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
            let t = ((x - p1.x) * (p2.x - p1.x) + (y - p1.y) * (p2.y - p1.y)) / (l2 || 1);
            t = Math.max(0, Math.min(1, t));
            const dist = Math.sqrt(Math.pow(x - (p1.x + t * (p2.x - p1.x)), 2) + Math.pow(y - (p1.y + t * (p2.y - p1.y)), 2));

            if (dist < 8) {
                // Return simplified hit test - we'll handle selection via click events in useDrawings
                return { cursor: 'pointer', zOrder: 'top' as const, externalId: `trendline-${i}` };
            }
        }
        return null;
    }

    setData(data: TrendlineData[]) {
        this._data = data;
        this._updateViews();
        this.updateAllViews();
    }

    private _updateViews() {
        this._views = this._data.map(d => new TrendlineView(this, d));
    }
}