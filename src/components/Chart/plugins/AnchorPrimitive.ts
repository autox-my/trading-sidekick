import type {
    ISeriesPrimitive,
    IPrimitivePaneRenderer,
    IPrimitivePaneView,
    SeriesAttachedParameter,
    Time,
    IChartApi,
    ISeriesApi
} from 'lightweight-charts';
import { CanvasRenderingTarget2D } from 'fancy-canvas';

class AnchorRenderer implements IPrimitivePaneRenderer {
    constructor(private _x: number | null, private _y: number | null, private _color: string, private _selected: boolean) { }

    draw(target: CanvasRenderingTarget2D) {
        target.useBitmapCoordinateSpace((scope) => {
            if (this._x === null || this._y === null) return;
            const ctx = scope.context;

            // Draw Anchor Dot
            ctx.beginPath();
            ctx.arc(this._x, this._y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = this._color;
            ctx.fill();

            // Draw Selection Ring
            if (this._selected) {
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#ffffff';
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(this._x, this._y, 8, 0, 2 * Math.PI);
                ctx.strokeStyle = this._color;
                ctx.stroke();
            }
        });
    }
}

class AnchorView implements IPrimitivePaneView {
    constructor(private _source: AnchorPrimitive) { }
    renderer() {
        return new AnchorRenderer(
            this._source.x,
            this._source.y,
            this._source.color,
            this._source.selected
        );
    }
}

export class AnchorPrimitive implements ISeriesPrimitive<Time> {
    private _requestUpdate?: () => void;
    private _view = new AnchorView(this);

    public x: number | null = null;
    public y: number | null = null;

    constructor(
        private _chart: IChartApi,
        private _series: ISeriesApi<"Candlestick" | "Line" | "Bar">,
        private _time: Time | null,
        public color: string = '#f59e0b',
        public selected: boolean = false
    ) { }

    attached({ requestUpdate }: SeriesAttachedParameter<Time>) {
        this._requestUpdate = requestUpdate;
        this.update();
    }

    detached() { this._requestUpdate = undefined; }
    paneViews() { return [this._view]; }
    updateAllViews() { this.update(); }

    update() {
        if (!this._time) {
            this.x = null;
            this.y = null;
        } else {
            this.x = this._chart.timeScale().timeToCoordinate(this._time);

            // Try to anchor Y to the series price at that time, or default to center if data missing
            const timeIndex = this._chart.timeScale().timeToIndex(this._time, false);
            const seriesData = timeIndex !== null ? this._series.dataByIndex(timeIndex) : null;

            // @ts-ignore - Handle different series data types
            const price = seriesData ? (seriesData.close || seriesData.value || seriesData.high) : null;

            if (price !== null) {
                this.y = this._series.priceToCoordinate(price);
            } else {
                // If no price data (e.g. future), stick to middle or do not render
                this.y = this._series.priceScale().height() / 2;
            }
        }
        this._requestUpdate?.();
    }

    setData(time: Time | null, selected: boolean) {
        this._time = time;
        this.selected = selected;
        this.update();
    }

    // HIT TEST
    hitTest(x: number, y: number) {
        if (this.x === null || this.y === null) return null;
        const dist = Math.sqrt(Math.pow(x - this.x, 2) + Math.pow(y - this.y, 2));

        // 10px radius hit target
        if (dist <= 10) {
            return {
                cursor: 'move',
                zOrder: 'top',
                data: { type: 'anchor' }
            };
        }
        return null;
    }
}