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
    volume?: number; // Added volume
}

export const calculateZigZag = (candles: any[], deviation: number = 5): Pivot[] => {
    const pivots: Pivot[] = [];
    let lastPivotPrice = candles[0].close;
    let lastPivotType: 'high' | 'low' | null = null;

    for (let i = 0; i < candles.length; i++) {
        const currentHigh = candles[i].high;
        const currentLow = candles[i].low;
        const currentTime = candles[i].time;
        const currentVolume = candles[i].volume;

        if (lastPivotType === null) {
            if (currentHigh > lastPivotPrice * (1 + deviation / 100)) {
                lastPivotType = 'high';
                lastPivotPrice = currentHigh;
                pivots.push({ index: i, price: currentHigh, type: 'high', time: currentTime, volume: currentVolume });
            } else if (currentLow < lastPivotPrice * (1 - deviation / 100)) {
                lastPivotType = 'low';
                lastPivotPrice = currentLow;
                pivots.push({ index: i, price: currentLow, type: 'low', time: currentTime, volume: currentVolume });
            }
        } else if (lastPivotType === 'high') {
            if (currentHigh > lastPivotPrice) {
                lastPivotPrice = currentHigh;
                pivots[pivots.length - 1] = { index: i, price: currentHigh, type: 'high', time: currentTime, volume: currentVolume };
            } else if (currentLow < lastPivotPrice * (1 - deviation / 100)) {
                lastPivotType = 'low';
                lastPivotPrice = currentLow;
                pivots.push({ index: i, price: currentLow, type: 'low', time: currentTime, volume: currentVolume });
            }
        } else if (lastPivotType === 'low') {
            if (currentLow < lastPivotPrice) {
                lastPivotPrice = currentLow;
                pivots[pivots.length - 1] = { index: i, price: currentLow, type: 'low', time: currentTime, volume: currentVolume };
            } else if (currentHigh > lastPivotPrice * (1 + deviation / 100)) {
                lastPivotType = 'high';
                lastPivotPrice = currentHigh;
                pivots.push({ index: i, price: currentHigh, type: 'high', time: currentTime, volume: currentVolume });
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
    if (isBullish && p4 <= p1) return false;
    if (!isBullish && p4 >= p1) return false;

    // Direction checks
    if (isBullish) {
        if (p1 <= p0 || p3 <= p2 || p5 <= p4) return false;
    } else {
        if (p1 >= p0 || p3 >= p2 || p5 >= p4) return false;
    }

    return true;
};

const validateCorrection = (pivots: Pivot[], isBullish: boolean): boolean => {
    if (pivots.length < 4) return false; // Need 0, A, B, C

    const p0 = pivots[0].price;
    const pA = pivots[1].price;
    const pB = pivots[2].price;
    const pC = pivots[3].price;

    // Direction Check
    if (isBullish) {
        if (pA >= p0) return false;
        if (pB <= pA) return false;
        if (pB >= p0) return false;
        if (pC >= pB) return false;
    } else {
        if (pA <= p0) return false;
        if (pB >= pA) return false;
        if (pB <= p0) return false;
        if (pC <= pB) return false;
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

    // Guideline 3: Alternation (Time/Complexity)
    // Compare Wave 2 (p1->p2) and Wave 4 (p3->p4)
    const t1 = pivots[1].index;
    const t2 = pivots[2].index;
    const t3 = pivots[3].index;
    const t4 = pivots[4].index;

    const w2Duration = Math.abs(t2 - t1);
    const w4Duration = Math.abs(t4 - t3);

    // If one is significantly longer (2x) than the other, we have alternation in time
    if (w2Duration > w4Duration * 1.5 || w4Duration > w2Duration * 1.5) {
        score += 1;
    }

    // Guideline 4: Volume
    // Wave 3 volume should be > Wave 5 volume (unless W5 extended)
    // We use the volume at the pivot point as a proxy for the wave's peak volume
    const v3 = pivots[3].volume || 0; // Peak of Wave 3
    const v5 = pivots[5].volume || 0; // Peak of Wave 5

    if (v3 > v5) {
        score += 1;
    }

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

        // Add Start Point (Wave 0) to allow length calculations
        // We won't display a marker for this, but it's needed for math
        chainWaves.push({
            time: pivots[currentIdx].time,
            price: pivots[currentIdx].price,
            label: 'Start',
            waveLevel: 0,
            type: pivots[currentIdx].type,
            degree: currentDegree
        });

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

            // 3. Try Partial/Tail Patterns
            const partialImpulseCount = validatePartialImpulse(remaining, isBullish);
            if (partialImpulseCount > 0) {
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

            currentIdx++;
            chainScore -= 2;
        }

        if (chainScore > bestScore) {
            bestScore = chainScore;
            bestChain = chainWaves;
        }
    }

    // --- Advanced Projections ---
    if (bestChain.length >= 2) { // Need at least Start + 1 point
        const lastWave = bestChain[bestChain.length - 1];
        const lastIdx = bestChain.length - 1;
        const lastType = lastWave.type;
        const isBullishNext = lastType === 'low';
        const lastLabel = lastWave.label;

        let projLabel = '';
        let projTarget = 0;

        // Helper to get price of previous waves in the CURRENT pattern
        // We assume the chain is sequential.
        const getPrice = (offset: number) => bestChain[lastIdx + offset]?.price;

        if (lastLabel === '3') {
            // Project Wave 4
            // Guideline: 38.2% retrace of Wave 3
            // Rule: No overlap with Wave 1
            projLabel = '4 (Proj)';
            const p3 = getPrice(0); // End of W3
            const p2 = getPrice(-1); // End of W2 (Start of W3)
            const p1 = getPrice(-2); // End of W1

            if (p3 !== undefined && p2 !== undefined && p1 !== undefined) {
                const w3Len = Math.abs(p3 - p2);
                const isBullishImpulse = p3 > p2;

                // Default Target: 38.2% Retrace
                let target = isBullishImpulse ? p3 - (w3Len * 0.382) : p3 + (w3Len * 0.382);

                // Rule: No Overlap with W1
                if (isBullishImpulse) {
                    if (target < p1) target = p1 * 1.001; // Clamp to just above W1
                } else {
                    if (target > p1) target = p1 * 0.999; // Clamp to just below W1
                }

                projTarget = target;
            } else {
                // Fallback
                projTarget = isBullishNext ? lastWave.price * 1.05 : lastWave.price * 0.95;
            }

        } else if (lastLabel === '4') {
            // Project Wave 5
            // Guideline: Equality with Wave 1 (or 0.618 if W3 extended)
            projLabel = '5 (Proj)';
            const p4 = getPrice(0);
            const p3 = getPrice(-1);
            const p2 = getPrice(-2);
            const p1 = getPrice(-3);
            const p0 = getPrice(-4); // Start of W1

            if (p4 !== undefined && p1 !== undefined && p0 !== undefined) {
                const w1Len = Math.abs(p1 - p0);
                const isBullishImpulse = p1 > p0;

                // Target: Equality
                let target = isBullishImpulse ? p4 + w1Len : p4 - w1Len;

                // Check W3 length to avoid W3 being shortest
                // W3 Len = |p3 - p2|
                // W5 Len = |target - p4| = w1Len
                // If W3 < W1, then W5 must be < W3.
                // If W3 is shortest, invalid.
                // But we are projecting W5. We should choose a W5 that makes W3 NOT shortest.
                // If W3 < W1, we MUST make W5 < W3.

                const w3Len = Math.abs(p3! - p2!);
                if (w3Len < w1Len) {
                    // W3 is shorter than W1. So W5 must be shorter than W3.
                    // Target 0.618 * W3?
                    const constrainedLen = w3Len * 0.618;
                    target = isBullishImpulse ? p4 + constrainedLen : p4 - constrainedLen;
                }

                projTarget = target;
            } else {
                projTarget = isBullishNext ? lastWave.price * 1.1 : lastWave.price * 0.9;
            }

        } else if (lastLabel === '2') {
            // Project Wave 3
            // Guideline: 1.618 * Wave 1
            projLabel = '3 (Proj)';
            const p2 = getPrice(0);
            const p1 = getPrice(-1);
            const p0 = getPrice(-2);

            if (p2 !== undefined && p1 !== undefined && p0 !== undefined) {
                const w1Len = Math.abs(p1 - p0);
                const isBullishImpulse = p1 > p0;
                const target = isBullishImpulse ? p2 + (w1Len * 1.618) : p2 - (w1Len * 1.618);
                projTarget = target;
            } else {
                projTarget = isBullishNext ? lastWave.price * 1.2 : lastWave.price * 0.8;
            }
        } else if (lastLabel === '1') {
            // Project Wave 2
            // Guideline: 50% - 61.8% Retrace
            projLabel = '2 (Proj)';
            const p1 = getPrice(0);
            const p0 = getPrice(-1);

            if (p1 !== undefined && p0 !== undefined) {
                const w1Len = Math.abs(p1 - p0);
                const isBullishImpulse = p1 > p0;
                // 61.8% retrace
                const target = isBullishImpulse ? p1 - (w1Len * 0.618) : p1 + (w1Len * 0.618);
                projTarget = target;
            } else {
                projTarget = isBullishNext ? lastWave.price * 1.05 : lastWave.price * 0.95;
            }
        } else if (lastLabel === '5' || lastLabel === 'C') {
            // New Cycle
            projLabel = '1 (Proj)';
            projTarget = isBullishNext ? lastWave.price * 1.1 : lastWave.price * 0.9;
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
