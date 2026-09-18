import type { Candle, MarketCalendar, MarketStates, RealityInstrument, RealityStockInfo, RealityTicker, SessionSnapshot } from "@/lib/bitget/types";
import { normalizeMarketContext } from "@/lib/market/normalize";
import type { MarketRawInput, MarketSnapshotPayload } from "@/lib/market/types";
import type { DemoScenario } from "./types";

const SHARED_CALENDAR: MarketCalendar = {
  timeZone: "EST",
  weekendDays: ["SATURDAY", "SUNDAY"],
  holidays: [
    { remark: "Labor Day", startTime: "2026-09-06 20:00", endTime: "2026-09-07 20:00" },
  ],
};

const SHARED_STATES: MarketStates = {
  market: "US",
  daylightType: "standard",
  windows: [
    { state: "pre_market", timeZone: "EST", startTime: "04:00", endTime: "09:30" },
    { state: "regular", timeZone: "EST", startTime: "09:30", endTime: "16:00" },
    { state: "after_hours", timeZone: "EST", startTime: "16:00", endTime: "20:00" },
    { state: "overnight", timeZone: "EST", startTime: "20:00", endTime: "04:00" },
  ],
};

function generateCandles(count: number, basePrice: number, baseTimeMs: number, trend: "down" | "up"): Candle[] {
  const candles: Candle[] = [];
  let price = basePrice;
  const hourMs = 60 * 60 * 1000;
  for (let i = count - 1; i >= 0; i--) {
    const timestampMs = baseTimeMs - i * hourMs;
    const shift = trend === "down" ? (i % 2 === 0 ? -0.15 : 0.05) : (i % 2 === 0 ? 0.2 : -0.08);
    const open = price;
    const close = price + shift;
    const high = Math.max(open, close) + 0.12;
    const low = Math.min(open, close) - 0.14;
    price = close;
    candles.push({
      timestampMs,
      timestamp: new Date(timestampMs).toISOString(),
      open: open.toFixed(2),
      high: high.toFixed(2),
      low: low.toFixed(2),
      close: close.toFixed(2),
      volume: "15420.50",
      turnover: (close * 15420.5).toFixed(2),
    });
  }
  return candles;
}

// ---------------------------------------------------------------------------
// Scenario 1: rAAPL — Regular Session Downside (-0.43%)
// ---------------------------------------------------------------------------
const AAPL_RETRIEVED_AT = new Date("2026-09-17T15:00:00.000Z"); // Thursday 11:00 AM EDT (Regular Session)
const AAPL_TICKER_TIME = new Date("2026-09-17T14:59:57.000Z"); // 3s before retrievedAt (fresh)

function buildAaplRaw(): MarketRawInput {
  const instrument: RealityInstrument = {
    symbol: "RAAPLUSDT",
    category: "SPOT",
    baseCoin: "rAAPL",
    quoteCoin: "USDT",
    symbolType: "stock",
    isReality: true,
    status: "online",
    tokenSymbol: "rAAPL",
    underlyingSymbol: "AAPL",
    displayName: "Apple Inc.",
    tradingPeriod: ["pre_market", "regular", "after_hours", "overnight"],
    weekendTradable: true,
  };

  const ticker: RealityTicker = {
    symbol: "RAAPLUSDT",
    category: "SPOT",
    lastPrice: "332.90",
    lastPriceNumber: 332.9,
    openPrice24h: "334.35",
    highPrice24h: "335.58",
    lowPrice24h: "330.70",
    change24hPercent: "-0.00434",
    change24hPercentNumber: -0.00434,
    bid: "332.86",
    bidSize: "45.00",
    ask: "332.94",
    askSize: "20.00",
    volume24h: "17336069.97",
    turnover24h: "5769451285.34",
    sourceTimestamp: AAPL_TICKER_TIME.toISOString(),
    sourceTimestampMs: AAPL_TICKER_TIME.getTime(),
  };

  const stock: RealityStockInfo = {
    symbol: "RAAPLUSDT",
    underlyingCode: "AAPL",
    name: "Apple Inc.",
    tradingPeriod: ["pre_market", "regular", "after_hours", "overnight"],
    weekendTradable: true,
  };

  const session: SessionSnapshot = {
    evaluatedAt: AAPL_RETRIEVED_AT.toISOString(),
    timeZone: "EST",
    daylightType: "standard",
    bitgetState: "regular",
    marketSession: "US_REGULAR",
    underlyingUsEquity: "regular",
    weekend: false,
    derivation: [
      "2026-09-17 is not in weekend list [SATURDAY, SUNDAY].",
      "No holiday window matched 2026-09-17 11:00:00 (America/New_York).",
      "New York clock 11:00:00 falls in window regular (09:30 - 16:00).",
    ],
  };

  const candles = generateCandles(24, 334.35, AAPL_RETRIEVED_AT.getTime(), "down");

  return {
    retrievedAt: AAPL_RETRIEVED_AT,
    requestedSymbol: "rAAPL",
    pair: "RAAPLUSDT",
    isDemoFixture: true,
    fixtureId: "scenario-raapl-session-down",
    fixtureLabel: "rAAPL · Regular Session Downside (-0.43%)",
    instrument,
    ticker,
    tickerEndpoint: "/api/v3/market/tickers",
    candles,
    candleInterval: "1H",
    candlesEndpoint: "/api/v3/market/candles",
    session,
    states: SHARED_STATES,
    calendar: SHARED_CALENDAR,
    stock,
    company: {
      code: "AAPL",
      name: "Apple Inc.",
      high52Week: "338.50",
      low52Week: "220.10",
      peRatio: "32.4",
      marketCap: "5120000000000",
    },
    publicOrderBook: {
      book: {
        source: "uta_public_orderbook",
        availability: "available",
        bids: [{ price: "332.86", size: "45.00" }, { price: "332.80", size: "120.00" }],
        asks: [{ price: "332.94", size: "20.00" }, { price: "333.00", size: "85.00" }],
        sourceTimestamp: AAPL_TICKER_TIME.toISOString(),
      },
      availability: "available",
    },
    realityOrderBook: {
      book: null,
      availability: "unauthorized",
      reason: "Reality depth is whitelist-gated and unavailable in public mode.",
    },
    failures: [],
    provenance: {
      instrument: { source: "fixture", endpoint: "/api/v3/market/instruments", retrievedAt: AAPL_RETRIEVED_AT.toISOString() },
      ticker: { source: "fixture", endpoint: "/api/v3/market/tickers", retrievedAt: AAPL_RETRIEVED_AT.toISOString(), observedAt: AAPL_TICKER_TIME.toISOString() },
      candles: { source: "fixture", endpoint: "/api/v3/market/candles", retrievedAt: AAPL_RETRIEVED_AT.toISOString() },
      session: {
        states: { source: "fixture", endpoint: "/api/v3/reality/market/states", retrievedAt: AAPL_RETRIEVED_AT.toISOString() },
        calendar: { source: "fixture", endpoint: "/api/v3/reality/market/calendar", retrievedAt: AAPL_RETRIEVED_AT.toISOString() },
      },
      stock: { source: "fixture", endpoint: "/api/v3/reality/market/stock-info", retrievedAt: AAPL_RETRIEVED_AT.toISOString() },
    },
  };
}

// ---------------------------------------------------------------------------
// Scenario 2: rNVDA — Post-Close Overnight Upside (+1.20%)
// ---------------------------------------------------------------------------
const NVDA_RETRIEVED_AT = new Date("2026-09-17T20:30:00.000Z"); // Thursday 4:30 PM EDT (After Hours / Overnight)
const NVDA_TICKER_TIME = new Date("2026-09-17T20:29:55.000Z"); // 5s before retrievedAt (fresh)

function buildNvdaRaw(): MarketRawInput {
  const instrument: RealityInstrument = {
    symbol: "RNVDAUSDT",
    category: "SPOT",
    baseCoin: "rNVDA",
    quoteCoin: "USDT",
    symbolType: "stock",
    isReality: true,
    status: "online",
    tokenSymbol: "rNVDA",
    underlyingSymbol: "NVDA",
    displayName: "NVIDIA Corp.",
    tradingPeriod: ["pre_market", "regular", "after_hours", "overnight"],
    weekendTradable: true,
  };

  const ticker: RealityTicker = {
    symbol: "RNVDAUSDT",
    category: "SPOT",
    lastPrice: "120.40",
    lastPriceNumber: 120.4,
    openPrice24h: "118.97",
    highPrice24h: "121.80",
    lowPrice24h: "118.20",
    change24hPercent: "0.01200",
    change24hPercentNumber: 0.012,
    bid: "120.32",
    bidSize: "15.00",
    ask: "120.47",
    askSize: "28.00",
    volume24h: "24500120.40",
    turnover24h: "2945000000.00",
    sourceTimestamp: NVDA_TICKER_TIME.toISOString(),
    sourceTimestampMs: NVDA_TICKER_TIME.getTime(),
  };

  const stock: RealityStockInfo = {
    symbol: "RNVDAUSDT",
    underlyingCode: "NVDA",
    name: "NVIDIA Corp.",
    tradingPeriod: ["pre_market", "regular", "after_hours", "overnight"],
    weekendTradable: true,
  };

  const session: SessionSnapshot = {
    evaluatedAt: NVDA_RETRIEVED_AT.toISOString(),
    timeZone: "EST",
    daylightType: "standard",
    bitgetState: "after_hours",
    marketSession: "US_CLOSED",
    underlyingUsEquity: "closed",
    weekend: false,
    derivation: [
      "2026-09-17 is not in weekend list [SATURDAY, SUNDAY].",
      "No holiday window matched 2026-09-17 16:30:00 (America/New_York).",
      "New York clock 16:30:00 falls in window after_hours (16:00 - 20:00). Underlying equity is closed.",
    ],
  };

  const candles = generateCandles(24, 118.97, NVDA_RETRIEVED_AT.getTime(), "up");

  return {
    retrievedAt: NVDA_RETRIEVED_AT,
    requestedSymbol: "rNVDA",
    pair: "RNVDAUSDT",
    isDemoFixture: true,
    fixtureId: "scenario-rnvda-overnight-up",
    fixtureLabel: "rNVDA · Post-Close Overnight Upside (+1.20%)",
    instrument,
    ticker,
    tickerEndpoint: "/api/v3/market/tickers",
    candles,
    candleInterval: "1H",
    candlesEndpoint: "/api/v3/market/candles",
    session,
    states: SHARED_STATES,
    calendar: SHARED_CALENDAR,
    stock,
    company: {
      code: "NVDA",
      name: "NVIDIA Corp.",
      high52Week: "140.76",
      low52Week: "45.10",
      peRatio: "58.2",
      marketCap: "2960000000000",
    },
    publicOrderBook: {
      book: {
        source: "uta_public_orderbook",
        availability: "available",
        bids: [{ price: "120.32", size: "15.00" }, { price: "120.25", size: "50.00" }],
        asks: [{ price: "120.47", size: "28.00" }, { price: "120.55", size: "64.00" }],
        sourceTimestamp: NVDA_TICKER_TIME.toISOString(),
      },
      availability: "available",
    },
    realityOrderBook: {
      book: null,
      availability: "unauthorized",
      reason: "Reality depth is whitelist-gated and unavailable in public mode.",
    },
    failures: [],
    provenance: {
      instrument: { source: "fixture", endpoint: "/api/v3/market/instruments", retrievedAt: NVDA_RETRIEVED_AT.toISOString() },
      ticker: { source: "fixture", endpoint: "/api/v3/market/tickers", retrievedAt: NVDA_RETRIEVED_AT.toISOString(), observedAt: NVDA_TICKER_TIME.toISOString() },
      candles: { source: "fixture", endpoint: "/api/v3/market/candles", retrievedAt: NVDA_RETRIEVED_AT.toISOString() },
      session: {
        states: { source: "fixture", endpoint: "/api/v3/reality/market/states", retrievedAt: NVDA_RETRIEVED_AT.toISOString() },
        calendar: { source: "fixture", endpoint: "/api/v3/reality/market/calendar", retrievedAt: NVDA_RETRIEVED_AT.toISOString() },
      },
      stock: { source: "fixture", endpoint: "/api/v3/reality/market/stock-info", retrievedAt: NVDA_RETRIEVED_AT.toISOString() },
    },
  };
}

// ---------------------------------------------------------------------------
// Scenario 3: rTSLA — Weekend Token Session with Stale Ticker
// ---------------------------------------------------------------------------
const TSLA_RETRIEVED_AT = new Date("2026-09-19T16:00:00.000Z"); // Saturday 12:00 PM EDT (Weekend)
const TSLA_TICKER_TIME = new Date("2026-09-19T15:59:12.000Z"); // 48s before retrievedAt (STALE > 15s)

function buildTslaRaw(): MarketRawInput {
  const instrument: RealityInstrument = {
    symbol: "RTSLAUSDT",
    category: "SPOT",
    baseCoin: "rTSLA",
    quoteCoin: "USDT",
    symbolType: "stock",
    isReality: true,
    status: "online",
    tokenSymbol: "rTSLA",
    underlyingSymbol: "TSLA",
    displayName: "Tesla Inc.",
    tradingPeriod: ["pre_market", "regular", "after_hours", "overnight"],
    weekendTradable: true,
  };

  const ticker: RealityTicker = {
    symbol: "RTSLAUSDT",
    category: "SPOT",
    lastPrice: "242.10",
    lastPriceNumber: 242.1,
    openPrice24h: "241.25",
    highPrice24h: "245.80",
    lowPrice24h: "239.50",
    change24hPercent: "0.00352",
    change24hPercentNumber: 0.00352,
    bid: "241.80",
    bidSize: "12.00",
    ask: "242.40",
    askSize: "18.00",
    volume24h: "8950400.12",
    turnover24h: "2167000000.00",
    sourceTimestamp: TSLA_TICKER_TIME.toISOString(),
    sourceTimestampMs: TSLA_TICKER_TIME.getTime(),
  };

  const stock: RealityStockInfo = {
    symbol: "RTSLAUSDT",
    underlyingCode: "TSLA",
    name: "Tesla Inc.",
    tradingPeriod: ["pre_market", "regular", "after_hours", "overnight"],
    weekendTradable: true,
  };

  const session: SessionSnapshot = {
    evaluatedAt: TSLA_RETRIEVED_AT.toISOString(),
    timeZone: "EST",
    daylightType: "standard",
    bitgetState: "overnight",
    marketSession: "WEEKEND",
    underlyingUsEquity: "closed",
    weekend: true,
    derivation: [
      "2026-09-19 is Saturday in weekend list [SATURDAY, SUNDAY].",
      "Market session is WEEKEND. Underlying US equity is closed.",
      "Token is marked weekendTradable=true on Bitget.",
    ],
  };

  const candles = generateCandles(24, 241.25, TSLA_RETRIEVED_AT.getTime(), "up");

  return {
    retrievedAt: TSLA_RETRIEVED_AT,
    requestedSymbol: "rTSLA",
    pair: "RTSLAUSDT",
    isDemoFixture: true,
    fixtureId: "scenario-rtsla-weekend-stale",
    fixtureLabel: "rTSLA · Weekend Token Session with Stale Ticker",
    instrument,
    ticker,
    tickerEndpoint: "/api/v3/market/tickers",
    candles,
    candleInterval: "1H",
    candlesEndpoint: "/api/v3/market/candles",
    session,
    states: SHARED_STATES,
    calendar: SHARED_CALENDAR,
    stock,
    company: {
      code: "TSLA",
      name: "Tesla Inc.",
      high52Week: "271.00",
      low52Week: "138.80",
      peRatio: "62.1",
      marketCap: "770000000000",
    },
    publicOrderBook: {
      book: null,
      availability: "error",
      reason: "Public UTA order book timed out.",
    },
    realityOrderBook: {
      book: null,
      availability: "unauthorized",
      reason: "Reality depth is whitelist-gated and unavailable in public mode.",
    },
    failures: [
      { resource: "publicOrderBook", message: "Public UTA order book request timed out." },
    ],
    provenance: {
      instrument: { source: "fixture", endpoint: "/api/v3/market/instruments", retrievedAt: TSLA_RETRIEVED_AT.toISOString() },
      ticker: { source: "fixture", endpoint: "/api/v3/market/tickers", retrievedAt: TSLA_RETRIEVED_AT.toISOString(), observedAt: TSLA_TICKER_TIME.toISOString() },
      candles: { source: "fixture", endpoint: "/api/v3/market/candles", retrievedAt: TSLA_RETRIEVED_AT.toISOString() },
      session: {
        states: { source: "fixture", endpoint: "/api/v3/reality/market/states", retrievedAt: TSLA_RETRIEVED_AT.toISOString() },
        calendar: { source: "fixture", endpoint: "/api/v3/reality/market/calendar", retrievedAt: TSLA_RETRIEVED_AT.toISOString() },
      },
      stock: { source: "fixture", endpoint: "/api/v3/reality/market/stock-info", retrievedAt: TSLA_RETRIEVED_AT.toISOString() },
    },
  };
}

function snapshotFromRaw(raw: MarketRawInput): MarketSnapshotPayload {
  return {
    isDemoFixture: true,
    fixtureId: raw.fixtureId,
    fixtureLabel: raw.fixtureLabel,
    instrument: raw.instrument ?? null,
    ticker: raw.ticker ?? null,
    candles: raw.candles ?? null,
    candleInterval: raw.candleInterval ?? null,
    session: raw.session ?? null,
    states: raw.states ?? null,
    calendar: raw.calendar ?? null,
    stock: raw.stock ?? null,
    company: raw.company ?? null,
    companyError: raw.companyError ?? null,
    publicOrderBook: raw.publicOrderBook ?? null,
    realityOrderBook: raw.realityOrderBook ?? null,
    provenance: raw.provenance,
    context: normalizeMarketContext(raw),
    failures: raw.failures,
  };
}

export const DEMO_SCENARIO_LIST: DemoScenario[] = [
  {
    id: "scenario-raapl-session-down",
    symbol: "rAAPL",
    pair: "RAAPLUSDT",
    tokenSymbol: "rAAPL",
    title: "rAAPL · Regular Session Downside (-0.43%)",
    tagline: "Active US regular trading session with negative 24h change and tight spread",
    description:
      "Captured during the Thursday NY regular session (11:00 AM EDT). Demonstrates a supported 24h downside claim, an unassessed/unsupported reference tape claim, and tight spread evidence.",
    retrievedAt: AAPL_RETRIEVED_AT.toISOString(),
    scenarioHighlights: [
      "Session: US_REGULAR (underlying US equity is open)",
      "Price change 24h: -0.43% (observed from Bitget ticker)",
      "Spread: 2.4 bps (tight book top)",
      "Freshness: Fresh ticker (observed 3s before retrievedAt)",
      "Reference tape: Explicitly UNAVAILABLE (no live US equity tape from Bitget)",
    ],
    recommendedClaims: [
      {
        kind: "price.change24h",
        fields: { sign: "down" },
        expectedStatus: "supported",
        why: "Directly matches observed 24h ticker change of -0.43%.",
      },
      {
        kind: "session.us",
        fields: { state: "regular" },
        expectedStatus: "supported",
        why: "Inferred New York clock 11:00 matches regular session window.",
      },
      {
        kind: "reference.tape",
        fields: { comparison: "divergence" },
        expectedStatus: "unsupported",
        why: "Bitget does not provide an underlying US tape; this stays UNKNOWN and unsupported.",
      },
      {
        kind: "price.direction",
        fields: { direction: "down", timeframe: "intraday" },
        expectedStatus: "unassessed",
        why: "Intraday timeframe cannot be scored from 24h change evidence; remains unassessed, not false.",
      },
    ],
    buildSnapshot: () => snapshotFromRaw(buildAaplRaw()),
  },
  {
    id: "scenario-rnvda-overnight-up",
    symbol: "rNVDA",
    pair: "RNVDAUSDT",
    tokenSymbol: "rNVDA",
    title: "rNVDA · Post-Close Overnight Upside (+1.20%)",
    tagline: "Overnight token trading while underlying US equity market is closed",
    description:
      "Captured post-close on Thursday (4:30 PM EDT). Demonstrates 24/7 token trading against a closed underlying market, supported upside claim, and explicit session-divergence tension.",
    retrievedAt: NVDA_RETRIEVED_AT.toISOString(),
    scenarioHighlights: [
      "Session: US_CLOSED (after_hours / overnight; underlying US equity is closed)",
      "Price change 24h: +1.20% (observed from Bitget ticker)",
      "Spread: 12.5 bps (wider after-hours spread)",
      "Tension: Token trading actively while underlying US equity is closed",
      "Reference tape: Explicitly UNAVAILABLE",
    ],
    recommendedClaims: [
      {
        kind: "price.change24h",
        fields: { sign: "up" },
        expectedStatus: "supported",
        why: "Directly matches observed 24h ticker change of +1.20%.",
      },
      {
        kind: "session.us",
        fields: { state: "closed" },
        expectedStatus: "supported",
        why: "New York clock 16:30 is post-close; underlying US market is closed.",
      },
      {
        kind: "price.change24h",
        fields: { sign: "down" },
        expectedStatus: "challenged",
        why: "Claim of downside directly contradicts observed +1.20% change.",
      },
    ],
    buildSnapshot: () => snapshotFromRaw(buildNvdaRaw()),
  },
  {
    id: "scenario-rtsla-weekend-stale",
    symbol: "rTSLA",
    pair: "RTSLAUSDT",
    tokenSymbol: "rTSLA",
    title: "rTSLA · Weekend Token Session with Stale Ticker",
    tagline: "Weekend 24/7 token trading with stale ticker flag and partial book failure",
    description:
      "Captured Saturday noon EDT. Demonstrates weekend token tradability, a stale ticker flag (observed 48s prior vs 15s freshness window), and partial failure resilience without crashing.",
    retrievedAt: TSLA_RETRIEVED_AT.toISOString(),
    scenarioHighlights: [
      "Session: WEEKEND (underlying US equity is closed for the weekend)",
      "Token status: weekendTradable=true (Reality token trades 24/7)",
      "Freshness: STALE ticker (observed 48s before retrievedAt; older than 15s freshness limit)",
      "Partial failure: Public UTA book timed out; represented visibly as failure without failing snapshot",
      "Reference tape: Explicitly UNAVAILABLE",
    ],
    recommendedClaims: [
      {
        kind: "session.us",
        fields: { state: "closed" },
        expectedStatus: "supported",
        why: "Saturday is a weekend day; US equity markets are closed.",
      },
      {
        kind: "price.change24h",
        fields: { sign: "up" },
        expectedStatus: "supported",
        why: "Matches +0.35% change, but flagged with stale evidence caveat.",
      },
      {
        kind: "depth.book",
        fields: { book: "reality-40" },
        expectedStatus: "unsupported",
        why: "Reality 40-level depth is whitelist-gated and public book timed out; stays unsupported.",
      },
    ],
    buildSnapshot: () => snapshotFromRaw(buildTslaRaw()),
  },
];
