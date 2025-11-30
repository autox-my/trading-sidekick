import { SENTIMENT_DICT } from './constants';
import { calculateRSIArray } from './calculations';

export const hexToRgba = (hex: string, alpha: number) => {
    if (!hex) return `rgba(0,0,0,${alpha ?? 1})`;
    const safeAlpha = alpha ?? 1;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return hex;
    return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
};

export const generateMockData = () => {
    const data = [];
    let price = 450;
    const now = Math.floor(Date.now() / 1000);
    for (let i = 0; i < 100; i++) {
        const time = now - (100 - i) * 3600;
        const volatility = 2;
        const change = (Math.random() - 0.5) * volatility;
        const open = price;
        const close = price + change;
        const high = Math.max(open, close) + Math.random();
        const low = Math.min(open, close) - Math.random();
        data.push({ time, open, high, low, close, volume: Math.random() * 10000 });
        price = close;
    }
    return data;
};

export const detectPatterns = (candles: any[]) => {
    if (candles.length < 30) return [];
    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    const patterns = [];
    const bodySize = Math.abs(last.close - last.open);
    const wickSize = last.high - last.low;
    if (bodySize <= wickSize * 0.1) patterns.push("Doji");
    const lowerWick = Math.min(last.open, last.close) - last.low;
    const upperWick = last.high - Math.max(last.open, last.close);
    if (lowerWick > bodySize * 2 && upperWick < bodySize * 0.5) patterns.push("Hammer");
    if (prev.close < prev.open && last.close > last.open && last.close > prev.open && last.open < prev.close) patterns.push("Bullish Engulfing");
    if (prev.close > prev.open && last.close < last.open && last.close < prev.open && last.open > prev.close) patterns.push("Bearish Engulfing");
    const closes = candles.map(c => c.close);
    const rsiValues = calculateRSIArray(closes);
    if (rsiValues.length > 20) {
        const lookback = 20;
        const recentCloses = closes.slice(-lookback);
        const recentRSI = rsiValues.slice(-lookback);
        const maxPrice = Math.max(...recentCloses);
        const maxRSI = Math.max(...recentRSI);
        const currentPrice = recentCloses[recentCloses.length - 1];
        const currentRSIVal = recentRSI[recentRSI.length - 1];
        if (currentPrice >= maxPrice * 0.999 && currentRSIVal < maxRSI - 5 && currentRSIVal > 60) patterns.push("Bearish RSI Div");
        const minPrice = Math.min(...recentCloses);
        const minRSI = Math.min(...recentRSI);
        if (currentPrice <= minPrice * 1.001 && currentRSIVal > minRSI + 5 && currentRSIVal < 40) patterns.push("Bullish RSI Div");
    }
    return patterns;
};

export const detectMacroDivergences = (candles: any[], correlations: any) => {
    const divergences = [];
    if (!correlations || candles.length < 2) return [];
    const open = candles[0].open;
    const close = candles[candles.length - 1].close;
    const assetChange = ((close - open) / open) * 100;
    if (assetChange > 0.2 && correlations.tnx?.change > 0.5) divergences.push("⚠️ Rate Risk");
    if (assetChange > 0.2 && correlations.dxy?.change > 0.3) divergences.push("⚠️ FX Risk");
    return divergences;
};

export const detectGaps = (candles: any[]) => {
    const gaps = [];
    const start = Math.max(1, candles.length - 50);
    for (let i = start; i < candles.length; i++) {
        const curr = candles[i];
        const prev = candles[i - 1];
        if (curr.low > prev.high) {
            let isFilled = false;
            for (let j = i + 1; j < candles.length; j++) { if (candles[j].low <= prev.high) { isFilled = true; break; } }
            if (!isFilled) gaps.push({ type: "Unfilled Gap UP", top: curr.low, bottom: prev.high });
        }
        if (curr.high < prev.low) {
            let isFilled = false;
            for (let j = i + 1; j < candles.length; j++) { if (candles[j].high >= prev.low) { isFilled = true; break; } }
            if (!isFilled) gaps.push({ type: "Unfilled Gap DOWN", top: prev.low, bottom: curr.high });
        }
    }
    return gaps;
};

export const createMergedLevel = (group: any[]) => {
    const totalWeight = group.reduce((sum, item) => sum + item.weight, 0);
    const weightedPriceSum = group.reduce((sum, item) => sum + (item.price * item.weight), 0);
    const avgPrice = weightedPriceSum / totalWeight;
    const prices = group.map(i => i.price);
    const labels = group.map(g => g.type).join(' + ');
    const label = group.length > 1 ? `${labels}` : labels;
    return { price: avgPrice, minPrice: Math.min(...prices), maxPrice: Math.max(...prices), label, count: group.length };
};

export const mergePriceLevels = (support: number | null, resistance: number | null, darkPools: any[], threshold = 0.50) => {
    let levels = [];
    if (support) levels.push({ price: support, type: "Support", weight: 1 });
    if (resistance) levels.push({ price: resistance, type: "Resistance", weight: 1 });
    if (darkPools) {
        darkPools.forEach((dp: any) => {
            levels.push({ price: dp.price, type: `DP $${(dp.totalPremium / 1000000).toFixed(0)}M`, weight: 2 });
        });
    }
    levels.sort((a, b) => a.price - b.price);

    const merged = [];
    if (levels.length === 0) return [];
    let currentGroup = [levels[0]];

    for (let i = 1; i < levels.length; i++) {
        if (Math.abs(levels[i].price - currentGroup[currentGroup.length - 1].price) <= threshold) {
            currentGroup.push(levels[i]);
        } else {
            merged.push(createMergedLevel(currentGroup));
            currentGroup = [levels[i]];
        }
    }
    merged.push(createMergedLevel(currentGroup));
    return merged;
};

export const analyzeLocalSentiment = (text: string) => {
    const words = text.toLowerCase().split(/\W+/);
    let score = 0;
    words.forEach(w => {
        if (SENTIMENT_DICT.positive.includes(w)) score += 1;
        if (SENTIMENT_DICT.negative.includes(w)) score -= 1;
    });
    return score;
};
