import { create } from 'zustand';
import { PERSONALITIES } from '../utils/constants';
import { useMarketStore } from './useMarketStore';
import { useUIStore } from './useUIStore';
import {
  detectPatterns,
  detectGaps,
  detectMacroDivergences
} from '../utils/helpers';
import {
  calculatePivotPoints,
  calculateVolumeProfile
} from '../utils/calculations';
import {
  fetchOptionsData,
  fetchEagleEyeData,
  fetchMacroCorrelationData,
  fetchAlphaVantageMacro,
  callGemini
} from '../services/api';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  suggestions?: string[];
}

interface ChatState {
  messages: Message[];
  input: string;
  personality: any;

  // Actions
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  addMessage: (message: Message) => void;
  setInput: (input: string) => void;
  setPersonality: (personality: any) => void;
  sendMessage: (textOverride?: string, mode?: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [{
    role: 'assistant',
    text: "I'm ready. I've initialized the Eagle Eye engine. I'm monitoring Daily trends and 5-minute execution flows simultaneously. What shall we analyze?",
    suggestions: ["Scan for patterns", "Identify key levels", "Check market mood"]
  }],
  input: '',
  personality: PERSONALITIES.analyst,

  setMessages: (messages) => set((state) => ({
    messages: typeof messages === 'function' ? messages(state.messages) : messages
  })),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setInput: (input) => set({ input }),
  setPersonality: (personality) => set({ personality }),

  sendMessage: async (textOverride?: string, mode?: string) => {
    const { input, personality, addMessage, setInput } = get();
    const msgText = textOverride || input;
    if (!msgText.trim()) return;

    if (!textOverride) setInput('');
    addMessage({ role: 'user', text: mode === 'devil' ? `🛡️ STRESS TEST: ${msgText} ` : msgText });

    useUIStore.getState().setIsLoading(true);

    const marketState = useMarketStore.getState();
    const {
      marketData,
      activeSymbol,
      timeframe,
      technicals,
      newsData,
      externalData,
      darkPoolLevels,
      macroCorrelations,
      chartConfig
    } = marketState;

    const { avKeyStatus } = useUIStore.getState();

    // Recalculate context data
    const patterns = detectPatterns(marketData);
    const sr = calculatePivotPoints(marketData);
    const volProfile = calculateVolumeProfile(marketData);
    const gaps = detectGaps(marketData);
    const macroDivs = detectMacroDivergences(marketData, macroCorrelations);

    let optionsData = null;
    if (!activeSymbol.includes('BTC')) {
      try {
        optionsData = await fetchOptionsData(activeSymbol);
      } catch (e) { console.error(e); }
    }

    let eagleEyeData = null;
    try {
      eagleEyeData = await fetchEagleEyeData(activeSymbol);
    } catch (e) { console.error(e); }

    let mc = macroCorrelations;
    try {
      mc = await fetchMacroCorrelationData();
      marketState.setMacroCorrelations(mc);
    } catch (e) { console.error(e); }

    let realMacro = null;
    if (chartConfig.avKey && avKeyStatus === 'valid') {
      try {
        realMacro = await fetchAlphaVantageMacro(chartConfig.avKey);
      } catch (e) { console.error(e); }
    }

    let queryText = msgText;
    if (textOverride && textOverride.includes("Analyze this specific candle")) queryText = textOverride;

    // PLAYBOOK GENERATOR LOGIC
    if (textOverride && textOverride.includes("Generate a structured trade plan")) {
      queryText = `${textOverride} Output strictly valid JSON format: { "entry": "...", "stop": "...", "target": "...", "conviction": 1 - 10, "reasoning": "..." } `;
    }

    const context = {
      symbol: activeSymbol,
      timeframe,
      lastPrice: technicals.lastPrice,
      rsi: technicals.rsi,
      sma: technicals.sma,
      atr: technicals.atr,
      regime: technicals.regime,
      patterns,
      sr,
      volProfile,
      gaps,
      news: newsData,
      options: optionsData,
      externalToolData: externalData,
      macro: realMacro,
      eagleEye: eagleEyeData,
      darkPool: darkPoolLevels,
      correlations: mc,
      macroDivergences: macroDivs,
      marketData: marketData // Pass raw data for AI analysis
    };

    const { text, suggestions } = await callGemini(queryText, context, personality, mode);

    // Parse Elliott Wave Data
    if (mode === 'ELLIOTT_WAVE') {
      console.log("Analyzing Elliott Wave response...");
      // Try to find JSON block with "waves" key, handling various markdown formats
      const waveJsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?"waves"[\s\S]*?\})\s*```/i);

      if (waveJsonMatch) {
        console.log("Found JSON block:", waveJsonMatch[1]);
        try {
          const waveData = JSON.parse(waveJsonMatch[1]);
          console.log("Parsed Wave Data:", waveData);
          if (waveData.waves && Array.isArray(waveData.waves)) {
            console.log("Setting Elliott Wave Data in Store:", waveData.waves);
            useMarketStore.getState().setElliottWaveData(waveData.waves);
            useMarketStore.getState().setShowElliottWaves(true);
          } else {
            console.warn("Parsed JSON does not contain 'waves' array:", waveData);
          }
        } catch (e) { console.error("Failed to parse wave data JSON", e); }
      } else {
        console.warn("No JSON block found in Elliott Wave response. Raw text snippet:", text.substring(0, 200) + "...");
      }
    }

    addMessage({ role: 'assistant', text, suggestions });
    useUIStore.getState().setIsLoading(false);
  }
}));
