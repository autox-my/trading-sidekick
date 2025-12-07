import type {
    ISeriesPrimitive,
    IPrimitivePaneView,
    IPrimitivePaneRenderer,
    IChartApi,
    ISeriesApi,
    Time,
    SeriesAttachedParameter,
    Coordinate
} from 'lightweight-charts';
import { CanvasRenderingTarget2D } from 'fancy-canvas';

export interface Point {
    time: Time;
    price: number;
}

export interface BoxData {
    p1: Point;
    p2: Point;
    color: string;
    fillColor: string;
    width: number;
    selected?: boolean;
}

interface ViewPoint {
    x: Coordinate | null;
    y: Coordinate | null;
}

class BoxPaneRenderer implements IPrimitivePaneRenderer {
    private _data: BoxData;
    private _p1: ViewPoint;
    private _p2: ViewPoint;

    constructor(data: BoxData, p1: ViewPoint, p2: ViewPoint) {
        this._data = data;
        this._p1 = p1;
        this._p2 = p2;
    }

    draw(target: CanvasRenderingTarget2D) {
        target.useBitmapCoordinateSpace((scope) => {
            if (this._p1.x === null || this._p1.y === null || this._p2.x === null || this._p2.y === null) return;

            const ctx = scope.context;
            const x1Scaled = Math.round(this._p1.x * scope.horizontalPixelRatio);
            const y1Scaled = Math.round(this._p1.y * scope.verticalPixelRatio);
            const x2Scaled = Math.round(this._p2.x * scope.horizontalPixelRatio);
            const y2Scaled = Math.round(this._p2.y * scope.verticalPixelRatio);

            const x = Math.min(x1Scaled, x2Scaled);
            const y = Math.min(y1Scaled, y2Scaled);
            const w = Math.abs(x2Scaled - x1Scaled);
            const h = Math.abs(y2Scaled - y1Scaled);

            ctx.fillStyle = this._data.fillColor;
            ctx.fillRect(x, y, w, h);

            ctx.lineWidth = this._data.width + (this._data.selected ? 1 : 0);
            ctx.strokeStyle = this._data.selected ? '#2962FF' : this._data.color;

            // Draw Dashed border for zones
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(x, y, w, h);
            ctx.setLineDash([]);

            // Draw selection handles (corners)
            if (this._data.selected) {
                ctx.fillStyle = '#FFFFFF';
                ctx.strokeStyle = '#2962FF';
                ctx.lineWidth = 2;
                const corners = [
                    { x, y }, { x: x + w, y }, { x, y: y + h }, { x: x + w, y: y + h }
                ];
                corners.forEach(p => {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 3 * scope.horizontalPixelRatio, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.stroke();
                });
            }
        });
    }
}

class BoxPaneView implements IPrimitivePaneView {
    private _p1: ViewPoint = { x: null, y: null };
    private _p2: ViewPoint = { x: null, y: null };
    private _source: BoxPrimitive;
    private _data: BoxData;

    constructor(source: BoxPrimitive, data: BoxData) {
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

    renderer(): IPrimitivePaneRenderer | null {
        return new BoxPaneRenderer(this._data, this._p1, this._p2);
    }
}

export class BoxPrimitive implements ISeriesPrimitive<Time> {
    private _data: BoxData[];
    private _views: BoxPaneView[] = [];
    private _requestUpdate?: () => void;
    public _chart: IChartApi;
    public _series: ISeriesApi<"Candlestick">;

    constructor(chart: IChartApi, series: ISeriesApi<"Candlestick">, data: BoxData[]) {
        this._chart = chart;
        this._series = series;
        this._data = data;
        this._updateViews();
    }

    attached({ requestUpdate }: SeriesAttachedParameter<Time>) {
        this._requestUpdate = requestUpdate;
        this._requestUpdate();
    }

    detached() { this._requestUpdate = undefined; }

    updateAllViews() {
        this._views.forEach(view => view.update());
        this._requestUpdate?.();
    }

    paneViews() { return this._views; }

    // Hit test for box body or edges
    hitTest(x: number, y: number) {
        for (let i = 0; i < this._data.length; i++) {
            const view = this._views[i];
            view.update();
            const p1 = (view as any)._p1;
            const p2 = (view as any)._p2;

            if (!p1 || !p2 || p1.x === null || p1.y === null || p2.x === null || p2.y === null) continue;

            const minX = Math.min(p1.x, p2.x);
            const maxX = Math.max(p1.x, p2.x);
            const minY = Math.min(p1.y, p2.y);
            const maxY = Math.max(p1.y, p2.y);

            if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
                return {
                    cursor: 'move',
                    zOrder: 'top' as const,
                    externalId: `box-${i}`
                };
            }
        }
        return null;
    }

    setData(data: BoxData[]) {
        this._data = data;
        this._updateViews();
        this.updateAllViews();
    }

    private _updateViews() {
        this._views = this._data.map(d => new BoxPaneView(this, d));
    }
}