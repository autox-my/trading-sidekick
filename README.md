# AI Trading Analyst – React App

A fully interactive, AI-powered trading assistant built with **React + Lightweight Charts + Yahoo Finance data**, integrating technical analysis, macro signals, dark-pool analysis, options flow, real-time news sentiment, and multi-personality AI chat.

---

## 🚀 Features

### **1. Real-Time Price Charting**

* Uses **Lightweight Charts** for fast, interactive candlestick charts.
* Customizable chart:

  * Candle colors & opacity
  * SMA overlays (period configurable)
  * Grid & background themes
  * Auto-fit scaling
* Context menu + candle hover tracking
* Automatic pivot levels, merged confluence zones, and institutional dark-pool overlays.

---

## **2. Multi-Source Market Data Integrations**

### **Yahoo Finance**

* Candlesticks (intraday & daily)
* Volume
* Technicals (derived client-side)
* Supported timeframes: **15m, 1h, 1d**

### **News Sentiment**

* Yahoo RSS feed sentiment scanner
* Keyword-based positive/negative sentiment extraction
* Recent headlines displayed in chat context

### **Macro Correlations**

* DXY / TNX correlation fetch
* Divergence detection (e.g., bullish asset but rising yields → macro risk)

### **Alpha Vantage Macro (optional)**

* CPI, Fed Funds Rate
* API key validation with status indicator

### **Options Flow**

* Yahoo options chain scraping via multiple proxy fallback mechanisms
* Put/Call Ratio
* Unusual volume scanner (volume > OI)

### **Dark Pool Analysis**

* CSV importer
* Premium aggregation
* Institutional “walls”
* Integration into confluence zone engine

---

## **3. Technical Analysis Engine**

The app computes a rich set of TA indicators:

### 🔵 *Built-in Indicators*

* RSI (14)
* SMA (configurable)
* ATR(14)
* Volume Profile (POC + HVNs)
* Pivot Points (20-period high/low)
* RVOL
* Volatility regime detection (“Compressed”, “Normal”, “Expanded”)

### 🔶 *Pattern Detection*

* Doji
* Hammer
* Bullish Engulfing
* Bearish Engulfing
* RSI Divergences (bullish / bearish)
* Unfilled gap detection (Gap-up, Gap-down)

These signals feed into the AI engine as structured context.

---

## **4. Multi-Timeframe “Eagle Eye” System**

Automatically fetches:

| Timeframe    | What it Checks        |
| ------------ | --------------------- |
| **Daily**    | Trend vs SMA, RSI     |
| **5-minute** | Execution micro-trend |

Used by AI for confluence (“Daily bullish but 5-minute bearish → caution”).

---

## **5. Integrated Chat AI with Personalities**

### Four AI personas:

* **Analyst** – neutral, structured, data-driven
* **Warren** – fundamental, anti-speculation
* **WSB** – hype, YOLO, slang
* **Karen (Risk Manager)** – skeptical, protective, focuses on downside

### Supported AI functions:

* Full market analysis
* Pattern explanations
* Level identification
* Trade plan generator (JSON → rendered as custom Playbook card)
* Risk stress-test mode (“Devil mode”)
* Auto suggestions for follow-up questions

### AI context includes:

* price, RSI, SMA, ATR
* volatility regime
* detected patterns
* support / resistance
* gaps
* sentiment
* macro correlations
* options flow
* external tool data (iframe)
* dark pool levels

---

## **6. Chat Interface**

* Markdown renderer (tables, headers, emphasis)
* Code blocks
* Custom **Playbook JSON → Card renderer**
* Auto-scrolling
* Context menu on candles:

  * “Explain this candle”
  * “Generate a trade plan from here”

---

## **7. UI/UX Highlights**

* Sliding sidebar
* Resizable chat panel
* Symbol search with autocomplete
* Connection status badge (Live / Simulated)
* File upload for dark-pool CSV
* External tool iframe with live postMessage sync
* Chat suggestions
* Pattern alert badges
* HUD overlay with real-time technicals

---

## 📁 Project Structure

The main logic resides in:

```
src/App.tsx
```

Major components inside the file:

* **MarkdownRenderer** (custom lightweight markdown engine)
* **PlaybookCard** (renders AI-generated JSON trade plans)
* **TableBlock** (for MD tables)

State management includes:

* symbol selection
* timeframe
* chart configuration
* patterns
* technicals
* AI personality
* loaded dark-pool data
* macro & news data
* options flow
* external tool messaging

---

## 🔗 Data & API Requirements

### Required

* Yahoo Finance (no API key needed)

### Optional

* AlphaVantage for CPI / FED rate
* Gemini API key for AI responses

---

## 📌 Features Requiring User Input

* Dark pool CSV
* External options flow tool URL
* API keys

---

## 🧩 Missing Features You May Want to Add

* Authentication for saved layouts
* Docker deployment
* Modularizing the giant App.tsx
* Pinning AI messages
* Chart drawing tools (Fibs, Lines)

---

## 🛡️ Disclaimer

This project provides *educational analysis only*.
No financial, investment, or trading advice is provided.

---
