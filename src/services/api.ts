import { analyzeLocalSentiment } from '../utils/helpers';
import { calculateRSI, calculateSMA, getVolumeDensityAtPrice } from '../utils/calculations';

export const fetchAlphaVantageMacro = async (apiKey: string) => {
    if (!apiKey) return null;
    try {
        const cpiRes = await fetch(`https://www.alphavantage.co/query?function=CPI&interval=monthly&apikey=${apiKey}`);
        const cpiData = await cpiRes.json();
        const fedRes = await fetch(`https://www.alphavantage.co/query?function=FEDERAL_FUNDS_RATE&interval=monthly&apikey=${apiKey}`);
        const fedData = await fedRes.json();
        if (cpiData.Note || cpiData['Error Message'] || fedData.Note || fedData['Error Message']) return null;
        return { cpi: cpiData.data?.[0]?.value ? `${cpiData.data[0].value}%` : "Unavailable", fed_rate: fedData.data?.[0]?.value ? `${fedData.data[0].value}%` : "Unavailable", source: "Alpha Vantage (Official)" };
    } catch (e) { return null; }
};

export const fetchRealNews = async (symbol: string) => {
    try {
        const proxyUrl = "https://corsproxy.io/?";
        const targetUrl = encodeURIComponent(`https://feeds.finance.yahoo.com/rss/2.0/headline?s=${symbol}&region=US&lang=en-US`);
        const response = await fetch(proxyUrl + targetUrl);
        const text = await response.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, "text/xml");
        const items = xml.querySelectorAll("item");
        let totalScore = 0;
        const headlines = Array.from(items).slice(0, 5).map(item => {
            const title = item.querySelector("title")?.textContent || "";
            const score = analyzeLocalSentiment(title);
            totalScore += score;
            return { title, score, pubDate: item.querySelector("pubDate")?.textContent?.slice(0, 16) || "" };
        });
        return { headlines, totalScore };
    } catch (e) { return null; }
};

export const fetchMacroCorrelationData = async () => {
    try {
        const fetchSymbol = async (sym: string) => {
            const proxyUrl = "https://corsproxy.io/?";
            const targetUrl = encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=2d`);
            const res = await fetch(proxyUrl + targetUrl);
            const json = await res.json();
            const result = json.chart.result[0];
            const close = result.indicators.quote[0].close;
            const current = close[close.length - 1];
            const prev = close[close.length - 2];
            const change = ((current - prev) / prev) * 100;
            return { price: current, change };
        };
        const [dxy, tnx] = await Promise.all([fetchSymbol('DX-Y.NYB'), fetchSymbol('^TNX')]);
        return { dxy, tnx };
    } catch (e) { return null; }
};

export const fetchOptionsData = async (symbol: string) => {
    try {
        if (symbol.includes('BTC') || symbol.includes('ETH')) return null;
        const strategies = [{ proxy: "https://corsproxy.io/?", domain: "query1.finance.yahoo.com" }, { proxy: "https://corsproxy.io/?", domain: "query2.finance.yahoo.com" }, { proxy: "https://api.allorigins.win/get?url=", domain: "query1.finance.yahoo.com", isAllOrigins: true }];
        let json = null;
        for (const strat of strategies) {
            try {
                const targetUrl = encodeURIComponent(`https://${strat.domain}/v7/finance/options/${symbol}`);
                const res = await fetch(`${strat.proxy}${targetUrl}`);
                if (!res.ok) continue;
                const raw = await res.json();
                json = strat.isAllOrigins ? JSON.parse(raw.contents) : raw;
                if (json.optionChain?.result?.[0]) break;
            } catch (e) { }
        }
        if (!json || !json.optionChain?.result?.[0]) throw new Error("All options data sources failed");
        const result = json.optionChain.result[0];
        const options = result.options?.[0];
        if (!options) throw new Error("No options data");
        const calls = options.calls || [];
        const puts = options.puts || [];
        const totalCallVol = calls.reduce((acc: number, c: any) => acc + (c.volume || 0), 0);
        const totalPutVol = puts.reduce((acc: number, c: any) => acc + (c.volume || 0), 0);
        const pcr = totalCallVol > 0 ? (totalPutVol / totalCallVol).toFixed(2) : "N/A";
        const scanForUnusual = (contracts: any[], type: string) => {
            return contracts.filter((c: any) => c.volume > 50 && c.volume > c.openInterest).map((c: any) => ({ type, strike: c.strike, volume: c.volume, oi: c.openInterest })).sort((a: any, b: any) => b.volume - a.volume).slice(0, 3);
        };
        return { pcr, totalCallVol, totalPutVol, unusual: [...scanForUnusual(calls, 'CALL'), ...scanForUnusual(puts, 'PUT')] };
    } catch (e) { return null; }
};

export const fetchEagleEyeData = async (symbol: string) => {
    const fetchTF = async (interval: string, range: string) => {
        try {
            const proxyUrl = "https://corsproxy.io/?";
            const targetUrl = encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`);
            const response = await fetch(proxyUrl + targetUrl);
            const json = await response.json();
            const quotes = json.chart.result[0].indicators.quote[0];
            const timestamps = json.chart.result[0].timestamp;
            const closes = timestamps.map((_: any, i: number) => quotes.close[i]).filter((c: any) => c != null);
            const lastPrice = closes[closes.length - 1];
            const rsi = calculateRSI(closes);
            const sma = calculateSMA(closes, 20);
            const trend = lastPrice > (sma || 0) ? "Bullish" : "Bearish";
            return { interval, lastPrice, rsi, sma, trend };
        } catch (e) { return null; }
    };
    const [daily, fiveMin] = await Promise.all([fetchTF('1d', '1y'), fetchTF('5m', '1d')]);
    return { daily, fiveMin };
};

export const callGemini = async (userQuery: string, contextData: any, personality: any, mode?: string) => {
    const apiKey = "AIzaSyAz1pojjk_mceSDWU87ZbYVmKJS3-URzBQ"; // Provided by environment
    const patterns = contextData.patterns.length > 0 ? contextData.patterns.join(", ") : "No specific candle patterns detected.";
    const levels = `Support ~$${contextData.sr.support.toFixed(2)}, Resistance ~$${contextData.sr.resistance.toFixed(2)}`;
    const macroStr = contextData.macro ? `Real Macro Data (Alpha Vantage): CPI ${contextData.macro.cpi}, Fed Rate ${contextData.macro.fed_rate}` : "Macro Data: Using standard consensus estimates.";
    const correlationStr = contextData.correlations ? `Dollar Index (DXY): ${contextData.correlations.dxy?.price.toFixed(2)} (${contextData.correlations.dxy?.change.toFixed(2)}%) 10Y Yield (TNX): ${contextData.correlations.tnx?.price.toFixed(2)} (${contextData.correlations.tnx?.change.toFixed(2)}%)` : "Macro correlations unavailable.";
    const macroDivergences = contextData.macroDivergences && contextData.macroDivergences.length > 0 ? `⚠️ MACRO WARNINGS: ${contextData.macroDivergences.join(', ')}` : "";
    let volProfileContext = "Volume Profile: Data unavailable.";
    if (contextData.volProfile) {
        const currentVol = getVolumeDensityAtPrice(contextData.lastPrice, contextData.volProfile);
        volProfileContext = `Volume Density at Current Price: ${currentVol} (POC: $${contextData.volProfile.poc.toFixed(2)})`;
    }
    let gapsContext = "Gap Analysis: No recent unfilled gaps.";
    if (contextData.gaps && contextData.gaps.length > 0) {
        gapsContext = "UNFILLED GAPS DETECTED (Magnets):\n" + contextData.gaps.map((g: any) => `- ${g.type} between $${g.bottom.toFixed(2)} and $${g.top.toFixed(2)}`).join('\n');
    }
    let darkPoolContext = "Dark Pool Data: None loaded.";
    if (contextData.darkPool) {
        const walls = contextData.darkPool.levels.map((l: any) => `$${l.price} (${(l.totalPremium / 1000000).toFixed(1)}M)`).join(', ');
        const signatures = contextData.darkPool.signatures.map((s: any) => `$${s.price} ($${(s.premium / 1000000).toFixed(1)}M on ${s.date})`).join(', ');
        darkPoolContext = `[INSTITUTIONAL DARK POOL ACTIVITY] 1. MAJOR WALLS: ${walls} 2. SIGNATURE PRINTS: ${signatures}`;
    }
    let optionsContext = "Options Data: Unavailable.";
    if (contextData.externalToolData) {
        optionsContext = `EXTERNAL TOOL DATA: ${JSON.stringify(contextData.externalToolData)}`;
    } else if (contextData.options) {
        const uaList = contextData.options.unusual.map((u: any) => `${u.type} ${u.strike} (Vol: ${u.volume})`).join(', ');
        optionsContext = `PCR: ${contextData.options.pcr}, Unusual: ${uaList || "None"}`;
    }
    const eagleEye = contextData.eagleEye ? `Daily Trend: ${contextData.eagleEye.daily?.trend || 'N/A'} 5m Micro-Trend: ${contextData.eagleEye.fiveMin?.trend || 'N/A'}` : "Multi-timeframe data unavailable.";
    const newsScore = contextData.news ? contextData.news.totalScore : 0;
    const sentimentLabel = newsScore > 0 ? `Bullish (+${newsScore})` : newsScore < 0 ? `Bearish (${newsScore})` : "Neutral";
    const newsContext = contextData.news && contextData.news.headlines.length > 0 ? contextData.news.headlines.map((n: any) => `- ${n.title} [Score: ${n.score}]`).join('\n') : "No specific recent news headlines.";

    // --- MODE SPECIFIC PROMPTS ---
    let modeInstruction = "";
    let modeHeader = "";
    let systemInstruction = personality.systemPrompt; // Initialize with default

    if (mode === 'ELLIOTT_WAVE') {
        modeHeader = "🌊 ELLIOTT WAVE DEEP SCAN";
        systemInstruction = `You are an expert Elliott Wave practitioner. 
        Analyze the provided market data (OHLCV) and identify the current wave count.
        
        CRITICAL OUTPUT FORMAT:
        You must include a JSON block at the end of your response containing the wave coordinates.
        The JSON must follow this exact schema:
        \`\`\`json
        {
          "waves": [
            { "label": "1", "time": "YYYY-MM-DD", "price": 123.45, "description": "Impulse start" },
            { "label": "2", "time": "YYYY-MM-DD", "price": 120.00, "description": "Correction" }
          ]
        }
        \`\`\`
        
        Do not output the JSON without the markdown code block.
        Ensure the dates match the provided data range.
        `;
        modeInstruction = `
            Perform a strict Elliott Wave Principle analysis.
            1. Identify the current wave count (Primary and Intermediate degrees).
            2. Are we in an impulsive (1-2-3-4-5) or corrective (A-B-C) phase?
            3. Project Fibonacci targets for the next wave.
            4. INVALIDATION LEVEL: Where is this count wrong?
            
            Format the rest of your analysis with markdown headers: ## Wave Count, ## Targets, ## Invalidation.
        `;
    } else if (mode === 'WYCKOFF') {
        modeHeader = "🏛️ WYCKOFF METHODOLOGY SCAN";
        modeInstruction = `
            Analyze price action using the Wyckoff Method.
            1. Identify the Phase (A, B, C, D, E).
            2. Label events (PS, SC, AR, ST, Spring, Upthrust, LPS).
            3. Assess Volume/Price Spread behavior (Effort vs Result).
            4. Conclude: Accumulation or Distribution?
            Format output with markdown headers: ## Phase Analysis, ## Key Events, ## Volume/Spread, ## Bias.
        `;
    } else if (mode === 'COT') {
        modeHeader = "🐋 INSTITUTIONAL (COT) & DARK POOL SCAN";
        modeInstruction = `
            Focus ONLY on Smart Money positioning.
            1. Analyze Dark Pool Walls and Signatures. Are institutions buying or selling?
            2. Analyze Options Flow (PCR, Unusual Activity). Is there gamma exposure?
            3. Analyze Macro Divergences.
            4. Ignore retail noise. Follow the big money.
            Format output with markdown headers: ## Dark Pool Analysis, ## Options Flow, ## Smart Money Verdict.
        `;
    } else if (mode === 'devil') {
        modeHeader = "😈 DEVIL'S ADVOCATE / RISK MANAGER";
        modeInstruction = "Act as a skeptical Risk Manager. Ignore confirmation bias. Aggressively search for bearish signals (or bullish if short). What can go wrong? Stress test the bullish thesis.";
    } else {
        modeHeader = "STANDARD ANALYST";
        modeInstruction = "Provide a professional, balanced technical and fundamental analysis.";
    }

    const contextPrompt = `
        [MODE: ${modeHeader}]
        [INSTRUCTION] ${modeInstruction}
        
        [ASSET: ${contextData.symbol} (${contextData.timeframe})]
        Price: $${contextData.lastPrice} | RSI: ${contextData.rsi.toFixed(2)} | Trend: ${contextData.lastPrice > contextData.sma ? "Bullish > SMA" : "Bearish < SMA"}
        [VOLATILITY REGIME] ATR State: ${contextData.regime}
        [MULTI-TIMEFRAME CONFLUENCE] ${eagleEye}
        [AUTOMATED TECHNICAL ANALYSIS] Detected Patterns: ${patterns} Key Levels: ${levels}
        ${gapsContext}
        ${volProfileContext}
        ${darkPoolContext}
        [MACRO CORRELATIONS] ${macroStr} ${correlationStr} ${macroDivergences}
        [NEWS SENTIMENT] Overall Score: ${sentimentLabel} Headlines: ${newsContext}
        [OPTIONS FLOW] ${optionsContext}
        
        [OHLCV DATA (Last 150 Candles)]
        ${contextData.marketData ? contextData.marketData.slice(-150).map((c: any) => `${new Date(c.time * 1000).toISOString().split('T')[0]}: O${c.open} H${c.high} L${c.low} C${c.close}`).join('\n') : "No OHLCV data available."}
        
        [USER QUERY] ${userQuery}
        
        Suggest 3 follow-up questions in JSON format: \`\`\`json ["Q1", "Q2", "Q3"] \`\`\`
    `;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: contextPrompt }] }], systemInstruction: { parts: [{ text: personality.systemPrompt }] } }) });
        const data = await response.json();
        if (data.error) return { text: `Error: ${data.error.message}`, suggestions: [] };
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
        let suggestions: string[] = [];
        const jsonMatch = text.match(/```json\n(\[[\s\S]*?\])\n```/);
        if (jsonMatch) { try { suggestions = JSON.parse(jsonMatch[1]); text = text.replace(jsonMatch[0], '').trim(); } catch (e) { } }
        return { text, suggestions };
    } catch (error) { return { text: "Network Error.", suggestions: [] }; }
};
