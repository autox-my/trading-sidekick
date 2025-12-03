
export const calculateRSI = (prices: number[], period = 14) => {
    if (prices.length < period + 1) return 50;
    let gains = 0; let losses = 0;
    for (let i = 1; i <= period; i++) {
        const diff = prices[prices.length - i] - prices[prices.length - i - 1];
        if (diff >= 0) gains += diff; else losses -= diff;
    }
    let avgGain = gains / period; let avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
};

export const calculateSMA = (prices: number[], period = 20) => {
    if (prices.length < period) return null;
    const slice = prices.slice(-period);
    const sum = slice.reduce((a, b) => a + b, 0);
    return sum / period;
};

export const calculateATR = (candles: any[], period = 14) => {
    if (candles.length <= period) return 0;
    const trs = [];
    for (let i = 1; i < candles.length; i++) {
        const high = candles[i].high;
        const low = candles[i].low;
        const prevClose = candles[i - 1].close;
        const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
        trs.push(tr);
    }
    if (trs.length < period) return 0;
    const recentTRs = trs.slice(-period);
    const atr = recentTRs.reduce((a, b) => a + b, 0) / period;
    return atr;
};

export const getVolatilityRegime = (currentATR: number, candles: any[]) => {
    const baselineATR = calculateATR(candles, 40);
    if (!baselineATR || baselineATR === 0) return "Normal";
    const ratio = currentATR / baselineATR;
    if (ratio < 0.8) return "Compressed";
    if (ratio > 1.5) return "Expanded";
    return "Normal";
};

export const calculateSMASeries = (candles: any[], period = 20) => {
    const smaData = [];
    for (let i = 0; i < candles.length; i++) {
        if (i < period - 1) continue;
        const sum = candles.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val.close, 0);
        smaData.push({ time: candles[i].time, value: sum / period });
    }
    return smaData;
};

export const calculateAvgVolume = (volumes: number[], period = 20) => {
    if (volumes.length < period) return 0;
    const slice = volumes.slice(-period);
    const sum = slice.reduce((a, b) => a + b, 0);
    return sum / period;
};

export const calculateVolumeProfile = (candles: any[], buckets = 50) => {
    if (candles.length === 0) return null;
    let min = Infinity, max = -Infinity;
    candles.forEach(c => { if (c.low < min) min = c.low; if (c.high > max) max = c.high; });
    const range = max - min;
    const bucketSize = range / buckets;
    const profile: { price: number, volume: number }[] = [];
    for (let i = 0; i < buckets; i++) { profile.push({ price: min + (i * bucketSize), volume: 0 }); }
    candles.forEach(c => {
        const startBucket = Math.max(0, Math.floor((c.low - min) / bucketSize));
        const endBucket = Math.min(buckets - 1, Math.floor((c.high - min) / bucketSize));
        const numBuckets = Math.max(1, endBucket - startBucket + 1);
        const volPerBucket = c.volume / numBuckets;
        for (let i = startBucket; i <= endBucket; i++) { if (profile[i]) profile[i].volume += volPerBucket; }
    });
    const pocNode = profile.reduce((prev, current) => (prev.volume > current.volume) ? prev : current);
    const sortedNodes = [...profile].sort((a, b) => b.volume - a.volume);
    const hvns = sortedNodes.slice(0, 5).map(n => n.price);
    return { poc: pocNode.price, hvns, profile };
};

export const getVolumeDensityAtPrice = (targetPrice: number, volProfile: any) => {
    if (!volProfile || !volProfile.profile) return "Unknown";
    const bucket = volProfile.profile.reduce((prev: any, curr: any) => {
        return (Math.abs(curr.price - targetPrice) < Math.abs(prev.price - targetPrice) ? curr : prev);
    });
    const maxVol = volProfile.profile.reduce((max: number, p: any) => Math.max(max, p.volume), 0);
    const ratio = bucket.volume / maxVol;
    if (ratio > 0.8) return "Very High";
    if (ratio > 0.5) return "High";
    if (ratio > 0.2) return "Moderate";
    return "Low";
};

export const calculateRSIArray = (closes: number[], period = 14) => {
    if (closes.length < period) return [];
    const rsiArray = [];
    let avgGain = 0; let avgLoss = 0;
    for (let i = 1; i <= period; i++) {
        const change = closes[i] - closes[i - 1];
        if (change > 0) avgGain += change; else avgLoss += Math.abs(change);
    }
    avgGain /= period; avgLoss /= period;
    rsiArray.push(100 - (100 / (1 + (avgGain / avgLoss))));
    for (let i = period + 1; i < closes.length; i++) {
        const change = closes[i] - closes[i - 1];
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? Math.abs(change) : 0;
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
        rsiArray.push(100 - (100 / (1 + (avgGain / avgLoss))));
    }
    return rsiArray;
};

export const calculatePivotPoints = (candles: any[]) => {
    if (candles.length === 0) return { support: null, resistance: null };
    const slice = candles.slice(-20);
    const highs = slice.map(c => c.high);
    const lows = slice.map(c => c.low);
    const resistance = Math.max(...highs);
    const support = Math.min(...lows);
    return { support, resistance };
};

export const calculateVWAP = (candles: any[]) => {
    if (!candles || candles.length === 0) return 0;

    let cumulativeTPV = 0;
    let cumulativeVolume = 0;

    // Calculate for the visible range or a reasonable intraday period (e.g., last 50 candles if not specified)
    // For a true intraday VWAP, we should reset at the start of the day, but for this context, 
    // a rolling VWAP over the loaded candles is a good approximation if the dataset is intraday.
    for (const candle of candles) {
        const typicalPrice = (candle.high + candle.low + candle.close) / 3;
        const volume = candle.volume;

        cumulativeTPV += typicalPrice * volume;
        cumulativeVolume += volume;
    }

    return cumulativeVolume === 0 ? 0 : cumulativeTPV / cumulativeVolume;
};
