export const BITGET_SUCCESS_CODE = "00000";

export const REALITY_CANDLE_INTERVALS = ["1m", "5m", "15m", "1H", "4H", "1D"] as const;
export type RealityCandleInterval = (typeof REALITY_CANDLE_INTERVALS)[number];

export const MARKET_SESSIONS = [
  "US_REGULAR",
  "US_PREMARKET",
  "US_AFTER_HOURS",
  "US_CLOSED",
  "WEEKEND",
  "HOLIDAY",
  "UNKNOWN",
] as const;
export type MarketSession = (typeof MARKET_SESSIONS)[number];

export const BITGET_SESSION_STATES = [
  "pre_market",
  "regular",
  "after_hours",
  "overnight",
] as const;
export type BitgetSessionState = (typeof BITGET_SESSION_STATES)[number];

export type DataAvailability = "available" | "empty" | "missing" | "unauthorized" | "error";

export interface DataProvenance {
  source: string;
  endpoint: string;
  observedAt?: string;
  retrievedAt: string;
  requestTime?: number;
  freshnessSeconds?: number;
}

export interface BitgetEnvelope<T> {
  code: string;
  msg: string;
  requestTime: number;
  data: T;
}

export interface BitgetInstrument {
  symbol: string;
  category: string;
  baseCoin: string;
  quoteCoin: string;
  symbolType?: string;
  isReality: boolean;
  isRwa?: string;
  status: string;
  pricePrecision?: string;
  quantityPrecision?: string;
  quotePrecision?: string;
  minOrderQty?: string;
  maxOrderQty?: string;
  minOrderAmount?: string;
  maxMarketOrderAmount?: string;
  buyLimitPriceRatio?: string;
  sellLimitPriceRatio?: string;
  launchTime?: string;
  areaSymbol?: string;
  maintainTime?: string;
}

export interface RealityStockInfo {
  symbol: string;
  underlyingCode: string;
  name: string | null;
  tradingPeriod: BitgetSessionState[];
  weekendTradable: boolean;
}

export interface RealityInstrument extends BitgetInstrument {
  tokenSymbol: string;
  underlyingSymbol: string;
  displayName: string | null;
  tradingPeriod: BitgetSessionState[];
  weekendTradable: boolean | null;
}

export interface RealityTicker {
  symbol: string;
  category: string;
  lastPrice: string;
  lastPriceNumber: number;
  openPrice24h?: string;
  highPrice24h?: string;
  lowPrice24h?: string;
  change24hPercent?: string;
  change24hPercentNumber?: number;
  bid?: string;
  bidSize?: string;
  ask?: string;
  askSize?: string;
  spread?: number;
  spreadBps?: number;
  volume24h?: string;
  turnover24h?: string;
  platformTurnover24h?: string;
  sourceTimestamp?: string;
  sourceTimestampMs?: number;
}

export interface Candle {
  timestampMs: number;
  timestamp: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string | null;
  turnover: string | null;
}

export interface MarketStateWindow {
  state: BitgetSessionState;
  timeZone: string;
  startTime: string;
  endTime: string;
}

export interface MarketStates {
  market: string;
  daylightType: string;
  windows: MarketStateWindow[];
}

export interface MarketCalendarHoliday {
  remark: string;
  startTime: string;
  endTime: string;
}

export interface MarketCalendar {
  timeZone: string;
  weekendDays: string[];
  holidays: MarketCalendarHoliday[];
}

export interface CompanyOverview {
  code: string;
  name: string;
  peRatio?: string;
  pbRatio?: string;
  totalShares?: string;
  marketCap?: string;
  high52Week?: string;
  low52Week?: string;
  listingDate?: string;
  employees?: string;
  companyAddress?: string;
}

export interface OrderBookLevel {
  price: string;
  size: string;
}

export interface OrderBookSnapshot {
  asks: OrderBookLevel[];
  bids: OrderBookLevel[];
  sourceTimestamp?: string;
  source: "uta_public_orderbook" | "reality_orderbook";
  availability: DataAvailability;
  note?: string;
}

export interface SessionSnapshot {
  evaluatedAt: string;
  timeZone: string;
  daylightType: string;
  bitgetState: BitgetSessionState | null;
  marketSession: MarketSession;
  underlyingUsEquity: "regular" | "extended" | "closed" | "unknown";
  holiday?: MarketCalendarHoliday;
  weekend: boolean;
  derivation: string[];
}

export interface OptionalResult<T> {
  availability: DataAvailability;
  data: T | null;
  reason?: string;
}
