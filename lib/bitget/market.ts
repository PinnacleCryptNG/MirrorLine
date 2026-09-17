import { isoFromMillis } from "@/lib/utils";
import { BitgetError } from "./errors";
import { tickerSchema } from "./schemas";
import { normalizeRTokenSymbol, parseOptionalNumber, requireNumber } from "./symbols";
import type { BitgetClient } from "./client";
import { getBitgetClient } from "./client";
import type { DataProvenance, RealityTicker } from "./types";

const TICKERS_PATH = "/api/v3/market/tickers";

export function mapTicker(raw: unknown): RealityTicker {
  const parsed = tickerSchema.parse(raw);
  const lastPriceNumber = requireNumber(parsed.lastPrice, "lastPrice");
  const bid = parseOptionalNumber(parsed.bid1Price);
  const ask = parseOptionalNumber(parsed.ask1Price);
  const change = parseOptionalNumber(parsed.price24hPcnt);
  let spread: number | undefined;
  let spreadBps: number | undefined;
  if (bid !== undefined && ask !== undefined && lastPriceNumber !== 0) {
    spread = ask - bid;
    spreadBps = (spread / lastPriceNumber) * 10_000;
  }
  const ts = parseOptionalNumber(parsed.ts);

  return {
    symbol: parsed.symbol,
    category: parsed.category,
    lastPrice: parsed.lastPrice,
    lastPriceNumber,
    openPrice24h: parsed.openPrice24h,
    highPrice24h: parsed.highPrice24h,
    lowPrice24h: parsed.lowPrice24h,
    change24hPercent: parsed.price24hPcnt,
    change24hPercentNumber: change,
    bid: parsed.bid1Price,
    bidSize: parsed.bid1Size,
    ask: parsed.ask1Price,
    askSize: parsed.ask1Size,
    spread,
    spreadBps,
    volume24h: parsed.volume24h,
    turnover24h: parsed.turnover24h,
    platformTurnover24h: parsed.platformTurnover24h,
    sourceTimestamp: isoFromMillis(ts),
    sourceTimestampMs: ts,
  };
}

export async function getTicker(
  symbol: string,
  client: BitgetClient = getBitgetClient(),
): Promise<{ ticker: RealityTicker; provenance: DataProvenance }> {
  const pair = normalizeRTokenSymbol(symbol);
  const retrievedAtDate = new Date();
  const envelope = await client.get<unknown[]>(TICKERS_PATH, {
    searchParams: {
      category: "SPOT",
      symbol: pair,
    },
  });
  const rows = envelope.data ?? [];
  const match = rows.find((row) => {
    const parsed = tickerSchema.safeParse(row);
    return parsed.success && parsed.data.symbol.toUpperCase() === pair;
  });
  if (!match) {
    throw new BitgetError({
      code: "BITGET_NOT_FOUND",
      message: `No ticker was returned for Reality symbol '${pair}'.`,
      httpStatus: 404,
      path: TICKERS_PATH,
    });
  }
  const ticker = mapTicker(match);
  const retrievedAt = retrievedAtDate.toISOString();
  const freshnessSeconds =
    ticker.sourceTimestampMs !== undefined
      ? Math.max(0, Math.round((retrievedAtDate.getTime() - ticker.sourceTimestampMs) / 1000))
      : undefined;

  return {
    ticker,
    provenance: {
      source: "bitget",
      endpoint: TICKERS_PATH,
      retrievedAt,
      observedAt: ticker.sourceTimestamp ?? isoFromMillis(envelope.requestTime),
      requestTime: envelope.requestTime,
      freshnessSeconds,
    },
  };
}
