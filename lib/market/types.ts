import type {
  Candle,
  CompanyOverview,
  DataAvailability,
  DataProvenance,
  MarketCalendar,
  MarketCalendarHoliday,
  MarketSession,
  MarketStates,
  MarketStateWindow,
  OrderBookSnapshot,
  RealityInstrument,
  RealityStockInfo,
  RealityTicker,
  SessionSnapshot,
  BitgetSessionState,
} from "@/lib/bitget/types";
import type { ContextField, FieldCoverage } from "./fields";

export interface ResourceFailure {
  resource: string;
  code?: string;
  message: string;
}

export interface PublicBookSummary {
  bidCount: number;
  askCount: number;
  sourceTimestamp?: string;
  source: OrderBookSnapshot["source"];
}

export interface MarketContext {
  milestone: "2-market-context";
  requestedSymbol: string;
  pair: string;
  tokenSymbol: string;
  retrievedAt: string;
  isDemoFixture?: boolean;
  fixtureId?: string;
  fixtureLabel?: string;
  instrument: {
    pair: ContextField<string>;
    tokenSymbol: ContextField<string>;
    status: ContextField<string>;
    isReality: ContextField<boolean>;
    quoteCoin: ContextField<string>;
  };
  price: {
    last: ContextField<number>;
    sourceTimestamp: ContextField<string>;
    change24hPercent: ContextField<number>;
    volume24h: ContextField<string>;
    turnover24h: ContextField<string>;
    high24h: ContextField<string>;
    low24h: ContextField<string>;
    open24h: ContextField<string>;
  };
  bookTop: {
    bid: ContextField<number>;
    bidSize: ContextField<string>;
    ask: ContextField<number>;
    askSize: ContextField<string>;
    spread: ContextField<number>;
    spreadBps: ContextField<number>;
    mid: ContextField<number>;
  };
  candles: {
    interval: string;
    supportedIntervals: readonly string[];
    count: ContextField<number>;
    latestClose: ContextField<string>;
    latestTimestamp: ContextField<string>;
    series: ContextField<Candle[]>;
  };
  session: {
    marketSession: ContextField<MarketSession>;
    bitgetState: ContextField<BitgetSessionState | null>;
    underlyingUsEquity: ContextField<SessionSnapshot["underlyingUsEquity"]>;
    windows: ContextField<MarketStateWindow[]>;
    weekend: ContextField<boolean>;
    holiday: ContextField<MarketCalendarHoliday | null>;
    timeZone: ContextField<string>;
    daylightType: ContextField<string>;
    tokenTradingPeriod: ContextField<BitgetSessionState[]>;
    weekendTradable: ContextField<boolean>;
    tokenWindowMatch: ContextField<boolean>;
    derivation: string[];
  };
  reference: {
    underlyingSymbol: ContextField<string>;
    underlyingName: ContextField<string>;
    tokenPrice: ContextField<number>;
    referencePrice: ContextField<number>;
    referenceTimestamp: ContextField<string>;
    divergence: ContextField<number>;
    companyHigh52Week: ContextField<string>;
    companyLow52Week: ContextField<string>;
    note: string;
  };
  depth: {
    publicUtaBook: ContextField<PublicBookSummary>;
    realityBook: ContextField<PublicBookSummary>;
    note: string;
  };
  failures: ResourceFailure[];
  limitations: string[];
  coverage: FieldCoverage;
}

export interface OptionalBookResult {
  book: OrderBookSnapshot | null;
  provenance?: DataProvenance;
  availability: DataAvailability;
  reason?: string;
}

export interface MarketRawInput {
  retrievedAt: Date;
  requestedSymbol: string;
  pair: string;
  isDemoFixture?: boolean;
  fixtureId?: string;
  fixtureLabel?: string;
  instrument?: RealityInstrument | null;
  instrumentError?: string;
  ticker?: RealityTicker | null;
  tickerError?: string;
  tickerEndpoint?: string;
  candles?: Candle[] | null;
  candleInterval?: string;
  candlesError?: string;
  candlesEndpoint?: string;
  session?: SessionSnapshot | null;
  states?: MarketStates | null;
  calendar?: MarketCalendar | null;
  sessionError?: string;
  stock?: RealityStockInfo | null;
  stockError?: string;
  company?: CompanyOverview | null;
  companyError?: string | null;
  publicOrderBook?: OptionalBookResult;
  realityOrderBook?: OptionalBookResult;
  failures: ResourceFailure[];
  provenance: MarketSnapshotPayload["provenance"];
}

export interface MarketSnapshotPayload {
  isDemoFixture?: boolean;
  fixtureId?: string;
  fixtureLabel?: string;
  instrument: RealityInstrument | null;
  ticker: RealityTicker | null;
  candles: Candle[] | null;
  candleInterval: string | null;
  session: SessionSnapshot | null;
  states: MarketStates | null;
  calendar: MarketCalendar | null;
  stock: RealityStockInfo | null;
  company: CompanyOverview | null;
  companyError: string | null;
  publicOrderBook: OptionalBookResult | null;
  realityOrderBook: OptionalBookResult | null;
  provenance: {
    instrument?: DataProvenance;
    ticker?: DataProvenance;
    candles?: DataProvenance;
    session?: { states: DataProvenance; calendar: DataProvenance };
    stock?: DataProvenance;
    company?: DataProvenance;
    publicOrderBook?: DataProvenance;
    realityOrderBook?: DataProvenance;
  };
  context: MarketContext;
  failures: ResourceFailure[];
}

export const MARKET_CONTEXT_LIMITATIONS = [
  "No live US exchange tape is available from Bitget. referencePrice and divergence are unverified and are not calculated.",
  "Ticker bid/ask/size are top-of-book quotes from Get Tickers, not order-book depth.",
  "The public UTA order book is not the whitelist Reality 40-level book.",
  "Current session is derived from Bitget state windows and calendar using America/New_York civil time. Bitget labels those windows EST even when the US is on daylight time.",
  "Overnight and weekend Reality trading does not mean the underlying US equity session is open.",
  "Company overview 52-week high/low, PE, and market cap are Bitget metadata, not a live underlying quote.",
  "Candle volume/turnover may be empty for history before 2026-07-09.",
  "This context layer does not trade, size orders, or recommend buys or sells.",
] as const;
