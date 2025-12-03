export interface WavePoint {
    time: number | string;
    price: number;
    label: string;
    waveLevel: number; // 1-5 for impulse, 1-3 for ABC
    isProjection?: boolean;
    type?: 'high' | 'low';
    degree?: 'subminuette' | 'minuette' | 'minute' | 'minor';
}

interface Pivot {
    index: number;
    price: number;
    type: 'high' | 'low';
    time: number | string;
}

export const calculateZigZag = (candles: any[], deviation: number = 5): Pivot[] => {
    const pivots: Pivot[] = [];
    let lastPivotPrice = candles[0].close;
    let lastPivotType: 'high' | 'low' | null = null;

    for (let i = 0; i < candles.length; i++) {
        const currentHigh = candles[i].high;
        const currentLow = candles[i].low;
        const currentTime = candles[i].time;

        if (lastPivotType === null) {
            if (currentHigh > lastPivotPrice * (1 + deviation / 100)) {
                lastPivotType = 'high';
                lastPivotPrice = currentHigh;
                pivots.push({ index: i, price: currentHigh, type: 'high', time: currentTime });
            } else if (currentLow < lastPivotPrice * (1 - deviation / 100)) {
                lastPivotType = 'low';
                lastPivotPrice = currentLow;
                pivots.push({ index: i, price: currentLow, type: 'low', time: currentTime });
            }
        } else if (lastPivotType === 'high') {
            if (currentHigh > lastPivotPrice) {
                lastPivotPrice = currentHigh;
                pivots[pivots.length - 1] = { index: i, price: currentHigh, type: 'high', time: currentTime };
            } else if (currentLow < lastPivotPrice * (1 - deviation / 100)) {
                lastPivotType = 'low';
                lastPivotPrice = currentLow;
                pivots.push({ index: i, price: currentLow, type: 'low', time: currentTime });
            }
        } else if (lastPivotType === 'low') {
            if (currentLow < lastPivotPrice) {
                lastPivotPrice = currentLow;
                pivots[pivots.length - 1] = { index: i, price: currentLow, type: 'low', time: currentTime };
            } else if (currentHigh > lastPivotPrice * (1 + deviation / 100)) {
                lastPivotType = 'high';
                lastPivotPrice = currentHigh;
                pivots.push({ index: i, price: currentHigh, type: 'high', time: currentTime });
            }
        }
    }
    return pivots;
};

// --- Scoring & Validation Logic ---

const validateImpulse = (pivots: Pivot[], isBullish: boolean): boolean => {
    if (pivots.length < 6) return false; // Need 0,1,2,3,4,5

    const p0 = pivots[0].price;
    const p1 = pivots[1].price;
    const p2 = pivots[2].price;
    const p3 = pivots[3].price;
    const p4 = pivots[4].price;
    const p5 = pivots[5].price;

    // Rule 1: Wave 2 cannot retrace > 100% of Wave 1
    if (isBullish && p2 <= p0) return false;
    if (!isBullish && p2 >= p0) return false;

    // Rule 2: Wave 3 cannot be shortest
    const w1 = Math.abs(p1 - p0);
    const w3 = Math.abs(p3 - p2);
    const w5 = Math.abs(p5 - p4);
    if (w3 < w1 && w3 < w5) return false;

    // Rule 3: Wave 4 cannot overlap Wave 1 (Impulse)
    // Note: Diagonals allow overlap, but we are strict for now
    if (isBullish && p4 <= p1) return false;
    if (!isBullish && p4 >= p1) return false;

    // Direction checks (ZigZag guarantees alternating, but check overall direction)
    if (isBullish) {
        if (p1 <= p0 || p3 <= p2 || p5 <= p4) return false; // Moves must be up
    } else {
        if (p1 >= p0 || p3 >= p2 || p5 >= p4) return false; // Moves must be down
    }

    return true;
};

const validateCorrection = (pivots: Pivot[], isBullish: boolean): boolean => {
    if (pivots.length < 4) return false; // Need 0, A, B, C

    const p0 = pivots[0].price;
    const pA = pivots[1].price;
    const pB = pivots[2].price;
    const pC = pivots[3].price;

    // Wave B vs A (Retracement)
    // B usually retraces A. In ZigZag, B < Start of A.
    // If B goes beyond Start of A, it's an Expanded Flat (valid but rare in simple logic)
    // Let's enforce standard ZigZag: B does not retrace 100% of A
    // Actually, correction is against the trend.
    // If "isBullish" means the larger trend is up, then Correction is DOWN.
    // So p0 -> pA is DOWN.

    // Direction Check
    // If trend is Bullish, Correction is Bearish (Down-Up-Down)
    if (isBullish) {
        if (pA >= p0) return false; // A must be down
        if (pB <= pA) return false; // B must be up
        if (pB >= p0) return false; // B usually doesn't exceed start of A (Regular ZigZag)
        if (pC >= pB) return false; // C must be down
    } else {
        if (pA <= p0) return false; // A must be up
        if (pB >= pA) return false; // B must be down
        if (pB <= p0) return false;
        if (pC <= pB) return false; // C must be up
    }

    return true;
};

const scoreImpulse = (pivots: Pivot[]): number => {
    let score = 0;
    const p0 = pivots[0].price;
    const p1 = pivots[1].price;
    const p2 = pivots[2].price;
    const p3 = pivots[3].price;
    const p4 = pivots[4].price;
    const p5 = pivots[5].price;

    const w1 = Math.abs(p1 - p0);
    const w3 = Math.abs(p3 - p2);
    const w5 = Math.abs(p5 - p4);

    // Guideline 1: Wave 3 is often the longest
    if (w3 > w1 && w3 > w5) score += 2;

    // Guideline 2: Equality (W5 ~ W1) if W3 extended
    if (w3 > w1 && w3 > w5) {
        const ratio = w5 / w1;
        if (ratio > 0.9 && ratio < 1.1) score += 1;
        if (ratio > 0.55 && ratio < 0.7) score += 1; // 0.618
    }

    // Guideline 3: Alternation (Time)
    // Wave 2 time vs Wave 4 time
    const t0 = typeof pivots[0].time === 'number' ? pivots[0].time : 0;
    const t2 = typeof pivots[2].time === 'number' ? pivots[2].time : 0;
    const t4 = typeof pivots[4].time === 'number' ? pivots[4].time : 0;
    // ... simplistic time check if available

    // Fibonacci Targets
    // W3 ~ 1.618 W1
    const w3Target = w1 * 1.618;
    if (w3 > w3Target * 0.9 && w3 < w3Target * 1.1) score += 1;

    return score;
};

// --- Partial Validation Logic ---

const validatePartialImpulse = (pivots: Pivot[], isBullish: boolean): number => {
    // Returns the number of valid waves found (0 if invalid start)
    if (pivots.length < 2) return 0;

    const p0 = pivots[0].price;
    const p1 = pivots[1].price;

    // Wave 1 Check
    // (Implicitly valid if direction matches, but we check direction in main loop)

    if (pivots.length < 3) return 1; // Just Wave 1

    const p2 = pivots[2].price;
    // Rule 1: Wave 2 vs Wave 1
    if (isBullish && p2 <= p0) return 0; // Invalid
    if (!isBullish && p2 >= p0) return 0; // Invalid

    if (pivots.length < 4) return 2; // Wave 1-2

    const p3 = pivots[3].price;
    // Wave 3 direction check (implicit in ZigZag)

    if (pivots.length < 5) return 3; // Wave 1-2-3

    const p4 = pivots[4].price;
    // Rule 3: Wave 4 Overlap
    if (isBullish && p4 <= p1) return 0; // Fail Impulse
    if (!isBullish && p4 >= p1) return 0;

    return 4; // Wave 1-2-3-4
};

// --- Main Search Logic ---

export const findElliottWaves = (candles: any[], startIndex: number): WavePoint[] => {
    // Multi-Degree Search
    const deviations = [1, 2, 3, 5];
    const degreeMap: Record<number, 'subminuette' | 'minuette' | 'minute' | 'minor'> = {
        1: 'subminuette',
        2: 'minuette',
        3: 'minute',
        5: 'minor'
    };

    let bestChain: WavePoint[] = [];
    let bestScore = -Infinity;

    for (const dev of deviations) {
        const pivots = calculateZigZag(candles, dev);
        const currentDegree = degreeMap[dev];

        // Find start pivot
        let startPivotIndex = -1;
        let minDist = Infinity;
        for (let i = 0; i < pivots.length; i++) {
            if (Math.abs(pivots[i].index - startIndex) < minDist) {
                minDist = Math.abs(pivots[i].index - startIndex);
                startPivotIndex = i;
            }
        }

        if (startPivotIndex === -1 || startPivotIndex >= pivots.length - 1) continue;

        // Build Chain
        let currentIdx = startPivotIndex;
        let chainWaves: WavePoint[] = [];
        let chainScore = 0;

        while (currentIdx < pivots.length - 1) {
            const remaining = pivots.slice(currentIdx);
            if (remaining.length < 2) break;

            const p0 = remaining[0];
            const isBullish = remaining[1].price > p0.price;

            // 1. Try Full Impulse (5 waves, 6 pivots)
            if (remaining.length >= 6) {
                const impulseCand = remaining.slice(0, 6);
                if (validateImpulse(impulseCand, isBullish)) {
                    chainScore += 10 + scoreImpulse(impulseCand);
                    for (let i = 1; i <= 5; i++) {
                        chainWaves.push({
                            time: remaining[i].time,
                            price: remaining[i].price,
                            label: i.toString(),
                            waveLevel: i,
                            type: remaining[i].type,
                            degree: currentDegree
                        });
                    }
                    currentIdx += 5;
                    continue;
                }
            }

            // 2. Try Full Correction (3 waves, 4 pivots)
            if (remaining.length >= 4) {
                const corrCand = remaining.slice(0, 4);
                const mainTrendBullish = p0.price > remaining[1].price;
                if (validateCorrection(corrCand, mainTrendBullish)) {
                    chainScore += 5;
                    const labels = ['A', 'B', 'C'];
                    for (let i = 1; i <= 3; i++) {
                        chainWaves.push({
                            time: remaining[i].time,
                            price: remaining[i].price,
                            label: labels[i - 1],
                            waveLevel: i,
                            type: remaining[i].type,
                            degree: currentDegree
                        });
                    }
                    currentIdx += 3;
                    continue;
                }
            }

            // 3. Try Partial/Tail Patterns (if we are near the end)
            // If we have fewer than 6 pivots left, we might have a partial impulse
            const partialImpulseCount = validatePartialImpulse(remaining, isBullish);
            if (partialImpulseCount > 0) {
                // Only accept partials if they consume the REST of the pivots
                // or if they are substantial (e.g. at least 3 waves)
                const isTail = (currentIdx + partialImpulseCount + 1) >= pivots.length;

                if (isTail || partialImpulseCount >= 3) {
                    chainScore += partialImpulseCount * 2;
                    for (let i = 1; i <= partialImpulseCount; i++) {
                        chainWaves.push({
                            time: remaining[i].time,
                            price: remaining[i].price,
                            label: i.toString(),
                            waveLevel: i,
                            type: remaining[i].type,
                            degree: currentDegree
                        });
                    }
                    currentIdx += partialImpulseCount;
                    continue;
                }
            }

            // If nothing matches, skip one pivot and penalize
            currentIdx++;
            chainScore -= 2;
        }

        if (chainScore > bestScore) {
            bestScore = chainScore;
            bestChain = chainWaves;
        }
    }

    // --- Projections ---
    if (bestChain.length > 0) {
        const lastWave = bestChain[bestChain.length - 1];
        const lastType = lastWave.type;
        const isBullishNext = lastType === 'low';

        const lastLabel = lastWave.label;
        let projLabel = '';
        let projTarget = 0;

        if (lastLabel === '3') {
            projLabel = '4 (Proj)';
            projTarget = isBullishNext ? lastWave.price * 1.05 : lastWave.price * 0.95;
        } else if (lastLabel === '4') {
            projLabel = '5 (Proj)';
            projTarget = isBullishNext ? lastWave.price * 1.1 : lastWave.price * 0.9;
        } else if (lastLabel === '5' || lastLabel === 'C') {
            projLabel = '1 (Proj)';
            projTarget = isBullishNext ? lastWave.price * 1.1 : lastWave.price * 0.9;
        } else if (lastLabel === '1') {
            projLabel = '2 (Proj)';
            projTarget = isBullishNext ? lastWave.price * 1.05 : lastWave.price * 0.95;
        } else if (lastLabel === '2') {
            projLabel = '3 (Proj)';
            projTarget = isBullishNext ? lastWave.price * 1.2 : lastWave.price * 0.8;
        }

        if (projLabel) {
            const lastTime = typeof lastWave.time === 'number' ? lastWave.time : new Date(lastWave.time).getTime() / 1000;
            const projTime = lastTime + 86400 * 5;

            bestChain.push({
                time: projTime,
                price: projTarget,
                label: projLabel,
                waveLevel: 0,
                isProjection: true,
                type: isBullishNext ? 'high' : 'low',
                degree: lastWave.degree
            });
        }
    }

    return bestChain;
};
