import { isoFromMillis, nowIso } from "@/lib/utils";
import { BitgetError } from "./errors";
import { candleTupleSchema } from "./schemas";
import {
  assertRealityInterval,
  emptyToNull,
  normalizeRTokenSymbol,
} from "./symbols";
import type { BitgetClient } from "./client";
import { getBitgetClient } from "./client";
import type { Candle, DataProvenance, RealityCandleInterval } from "./types";

const CANDLES_PATH = "/api/v3/market/candles";
const HISTORY_CANDLES_PATH = "/api/v3/market/history-candles";

export interface CandleQuery {
  symbol: string;
  interval: string;
  startTime?: number | string;
  endTime?: number | string;
  limit?: number;
  historical?: boolean;
}

export function mapCandle(raw: unknown): Candle {
  const tuple = candleTupleSchema.parse(raw);
  const timestampMs = Number(tuple[0]);
  if (!Number.isFinite(timestampMs)) {
    throw new BitgetError({
      code: "BITGET_VALIDATION",
      message: "Candle timestamp was not numeric.",
      httpStatus: 502,
    });
  }
  return {
    timestampMs,
    timestamp: isoFromMillis(timestampMs)!,
    open: String(tuple[1]),
    high: String(tuple[2]),
    low: String(tuple[3]),
    close: String(tuple[4]),
    volume: emptyToNull(tuple[5] === undefined ? undefined : String(tuple[5])),
    turnover: emptyToNull(tuple[6] === undefined ? undefined : String(tuple[6])),
  };
}

export async function getCandles(
  query: CandleQuery,
  client: BitgetClient = getBitgetClient(),
): Promise<{
  candles: Candle[];
  interval: RealityCandleInterval;
  provenance: DataProvenance;
}> {
  const pair = normalizeRTokenSymbol(query.symbol);
  const interval = assertRealityInterval(query.interval);
  const path = query.historical ? HISTORY_CANDLES_PATH : CANDLES_PATH;
  const retrievedAt = nowIso();
  const envelope = await client.get<unknown[]>(path, {
    searchParams: {
      category: "SPOT",
      symbol: pair,
      interval,
      type: "market",
      startTime: query.startTime,
      endTime: query.endTime,
      limit: query.limit,
    },
  });

  const candles = (envelope.data ?? []).map(mapCandle);
  return {
    candles,
    interval,
    provenance: {
      source: "bitget",
      endpoint: path,
      retrievedAt,
      observedAt: candles.at(-1)?.timestamp ?? isoFromMillis(envelope.requestTime),
      requestTime: envelope.requestTime,
    },
  };
}
