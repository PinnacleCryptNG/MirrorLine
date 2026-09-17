import { z } from "zod";
import {
  BITGET_SESSION_STATES,
  REALITY_CANDLE_INTERVALS,
  type BitgetSessionState,
} from "./types";

export const bitgetEnvelopeSchema = z.object({
  code: z.string(),
  msg: z.string(),
  requestTime: z.number().optional(),
  data: z.unknown().optional(),
});

export const yesNoSchema = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .pipe(z.enum(["yes", "no"]));

export const instrumentSchema = z.object({
  symbol: z.string(),
  category: z.string(),
  baseCoin: z.string(),
  quoteCoin: z.string(),
  symbolType: z.string().optional(),
  isReality: z.string().optional(),
  isRwa: z.string().optional(),
  status: z.string(),
  pricePrecision: z.string().optional(),
  quantityPrecision: z.string().optional(),
  quotePrecision: z.string().optional(),
  minOrderQty: z.string().optional(),
  maxOrderQty: z.string().optional(),
  minOrderAmount: z.string().optional(),
  maxMarketOrderAmount: z.string().optional(),
  buyLimitPriceRatio: z.string().optional(),
  sellLimitPriceRatio: z.string().optional(),
  launchTime: z.string().nullable().optional(),
  areaSymbol: z.string().optional(),
  maintainTime: z.string().optional(),
  maxProductOrderNum: z.string().optional(),
  maxPositionNum: z.string().optional(),
  maxSymbolOrderNum: z.string().optional(),
});

export const tickerSchema = z.object({
  category: z.string(),
  symbol: z.string(),
  ts: z.string().optional(),
  lastPrice: z.string(),
  openPrice24h: z.string().optional(),
  highPrice24h: z.string().optional(),
  lowPrice24h: z.string().optional(),
  ask1Price: z.string().optional(),
  bid1Price: z.string().optional(),
  bid1Size: z.string().optional(),
  ask1Size: z.string().optional(),
  price24hPcnt: z.string().optional(),
  volume24h: z.string().optional(),
  turnover24h: z.string().optional(),
  platformTurnover24h: z.string().optional(),
});

export const candleTupleSchema = z
  .array(z.union([z.string(), z.number()]))
  .min(5);

export const stockInfoSchema = z.object({
  symbol: z.string(),
  code: z.string(),
  name: z.string().nullable().optional(),
  tradingPeriod: z.array(z.string()),
  weekendTradable: z.string().optional(),
});

export const marketStateWindowSchema = z.object({
  state: z.string(),
  timeZone: z.string(),
  startTime: z.string(),
  endTime: z.string(),
});

export const marketStatesSchema = z.object({
  market: z.string(),
  daylightType: z.string(),
  stateList: z.array(marketStateWindowSchema),
});

export const marketCalendarSchema = z.object({
  timeZone: z.string(),
  specificConfig: z.array(
    z.object({
      remark: z.string().optional(),
      startTime: z.string(),
      endTime: z.string(),
    }),
  ),
  regularConfig: z.array(z.string()),
});

export const companyOverviewSchema = z.object({
  code: z.string(),
  name: z.string(),
  peRatio: z.string().optional(),
  pbRatio: z.string().optional(),
  totalShares: z.string().optional(),
  marketCap: z.string().optional(),
  high52Week: z.string().optional(),
  low52Week: z.string().optional(),
  listingDate: z.string().optional(),
  ListingDate: z.string().optional(),
  employees: z.string().optional(),
  companyAddress: z.string().optional(),
});

export const orderBookSchema = z.object({
  a: z.array(z.array(z.union([z.string(), z.number()]))),
  b: z.array(z.array(z.union([z.string(), z.number()]))),
  ts: z.union([z.string(), z.number()]).optional(),
});

export const candleIntervalSchema = z.enum(REALITY_CANDLE_INTERVALS);

export function parseSessionState(value: string): BitgetSessionState | null {
  const normalized = value.trim().toLowerCase();
  return (BITGET_SESSION_STATES as readonly string[]).includes(normalized)
    ? (normalized as BitgetSessionState)
    : null;
}

export function isYes(value: string | undefined | null): boolean {
  return value?.trim().toLowerCase() === "yes";
}
