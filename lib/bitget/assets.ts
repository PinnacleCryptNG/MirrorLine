import { isoFromMillis, nowIso } from "@/lib/utils";
import { BitgetError } from "./errors";
import { isYes, stockInfoSchema } from "./schemas";
import { parseSessionState } from "./schemas";
import { instrumentSchema } from "./schemas";
import {
  tokenSymbolFromPair,
  underlyingFromPair,
  normalizeRTokenSymbol,
} from "./symbols";
import type { BitgetClient } from "./client";
import { getBitgetClient } from "./client";
import type {
  BitgetInstrument,
  DataProvenance,
  RealityInstrument,
  RealityStockInfo,
} from "./types";

const INSTRUMENTS_PATH = "/api/v3/market/instruments";
const STOCK_INFO_PATH = "/api/v3/reality/market/stock-info";

function toInstrument(raw: unknown): BitgetInstrument {
  const parsed = instrumentSchema.parse(raw);
  return {
    symbol: parsed.symbol,
    category: parsed.category,
    baseCoin: parsed.baseCoin,
    quoteCoin: parsed.quoteCoin,
    symbolType: parsed.symbolType,
    isReality: isYes(parsed.isReality),
    isRwa: parsed.isRwa,
    status: parsed.status,
    pricePrecision: parsed.pricePrecision,
    quantityPrecision: parsed.quantityPrecision,
    quotePrecision: parsed.quotePrecision,
    minOrderQty: parsed.minOrderQty,
    maxOrderQty: parsed.maxOrderQty,
    minOrderAmount: parsed.minOrderAmount,
    maxMarketOrderAmount: parsed.maxMarketOrderAmount,
    buyLimitPriceRatio: parsed.buyLimitPriceRatio,
    sellLimitPriceRatio: parsed.sellLimitPriceRatio,
    launchTime: parsed.launchTime ?? undefined,
    areaSymbol: parsed.areaSymbol,
    maintainTime: parsed.maintainTime,
  };
}

function toStockInfo(raw: unknown): RealityStockInfo {
  const parsed = stockInfoSchema.parse(raw);
  return {
    symbol: parsed.symbol,
    underlyingCode: parsed.code,
    name: parsed.name ?? null,
    tradingPeriod: parsed.tradingPeriod
      .map(parseSessionState)
      .filter((value): value is NonNullable<typeof value> => value !== null),
    weekendTradable: isYes(parsed.weekendTradable),
  };
}

export async function listSpotInstruments(
  client: BitgetClient = getBitgetClient(),
  symbol?: string,
): Promise<{ instruments: BitgetInstrument[]; provenance: DataProvenance }> {
  const retrievedAt = nowIso();
  const envelope = await client.get<unknown[]>(INSTRUMENTS_PATH, {
    searchParams: {
      category: "SPOT",
      symbol,
    },
  });
  const instruments = (envelope.data ?? []).map(toInstrument);
  return {
    instruments,
    provenance: {
      source: "bitget",
      endpoint: INSTRUMENTS_PATH,
      retrievedAt,
      requestTime: envelope.requestTime,
      observedAt: isoFromMillis(envelope.requestTime),
    },
  };
}

export async function listRealityStockInfo(
  client: BitgetClient = getBitgetClient(),
  symbol?: string,
): Promise<{ items: RealityStockInfo[]; provenance: DataProvenance }> {
  const retrievedAt = nowIso();
  const envelope = await client.get<unknown[]>(STOCK_INFO_PATH, {
    searchParams: symbol ? { symbol } : undefined,
  });
  const items = (envelope.data ?? []).map(toStockInfo);
  return {
    items,
    provenance: {
      source: "bitget",
      endpoint: STOCK_INFO_PATH,
      retrievedAt,
      requestTime: envelope.requestTime,
      observedAt: isoFromMillis(envelope.requestTime),
    },
  };
}

function mergeRealityInstruments(
  instruments: BitgetInstrument[],
  stockBySymbol: Map<string, RealityStockInfo>,
): RealityInstrument[] {
  return instruments
    .filter((item) => item.isReality)
    .map((item) => {
      const stock = stockBySymbol.get(item.symbol.toUpperCase());
      return {
        ...item,
        tokenSymbol: tokenSymbolFromPair(item.symbol),
        underlyingSymbol: stock?.underlyingCode ?? underlyingFromPair(item.symbol),
        displayName: stock?.name ?? null,
        tradingPeriod: stock?.tradingPeriod ?? [],
        weekendTradable: stock ? stock.weekendTradable : null,
      };
    });
}

const DISCOVERY_TTL_MS = 60 * 60 * 1000;
let discoveryCache:
  | {
      expiresAt: number;
      instrumentResult: Awaited<ReturnType<typeof listSpotInstruments>>;
      stockInfoResult: Awaited<ReturnType<typeof listRealityStockInfo>>;
    }
  | undefined;

export async function discoverRealityInstruments(
  client: BitgetClient = getBitgetClient(),
  options: { status?: string; query?: string; limit?: number } = {},
): Promise<{
  instruments: RealityInstrument[];
  total: number;
  provenance: { instruments: DataProvenance; stockInfo: DataProvenance };
}> {
  const now = Date.now();
  if (!discoveryCache || now >= discoveryCache.expiresAt) {
    const [instrumentResult, stockInfoResult] = await Promise.all([
      listSpotInstruments(client),
      listRealityStockInfo(client),
    ]);
    discoveryCache = {
      expiresAt: now + DISCOVERY_TTL_MS,
      instrumentResult,
      stockInfoResult,
    };
  }
  const { instrumentResult, stockInfoResult } = discoveryCache;

  const stockBySymbol = new Map(stockInfoResult.items.map((item) => [item.symbol.toUpperCase(), item]));
  let instruments = mergeRealityInstruments(instrumentResult.instruments, stockBySymbol);

  if (options.status) {
    instruments = instruments.filter(
      (item) => item.status.toLowerCase() === options.status!.toLowerCase(),
    );
  }

  if (options.query) {
    const q = options.query.trim().toLowerCase();
    instruments = instruments.filter((item) => {
      return (
        item.symbol.toLowerCase().includes(q) ||
        item.tokenSymbol.toLowerCase().includes(q) ||
        item.underlyingSymbol.toLowerCase().includes(q) ||
        (item.displayName && item.displayName.toLowerCase().includes(q)) ||
        item.baseCoin.toLowerCase().includes(q)
      );
    });
  }

  const total = instruments.length;
  if (options.limit && options.limit > 0) {
    instruments = instruments.slice(0, options.limit);
  }

  return {
    instruments,
    total,
    provenance: {
      instruments: instrumentResult.provenance,
      stockInfo: stockInfoResult.provenance,
    },
  };
}

export async function getRealityInstrument(
  symbol: string,
  client: BitgetClient = getBitgetClient(),
): Promise<{ instrument: RealityInstrument; provenance: DataProvenance }> {
  const pair = normalizeRTokenSymbol(symbol);
  if (discoveryCache && Date.now() < discoveryCache.expiresAt) {
    const stockBySymbol = new Map(
      discoveryCache.stockInfoResult.items.map((item) => [item.symbol.toUpperCase(), item]),
    );
    const hit = mergeRealityInstruments(
      discoveryCache.instrumentResult.instruments,
      stockBySymbol,
    ).find((item) => item.symbol.toUpperCase() === pair);
    if (hit) {
      return {
        instrument: hit,
        provenance: discoveryCache.instrumentResult.provenance,
      };
    }
  }
  const retrievedAt = nowIso();
  const [instrumentResult, stockInfoResult] = await Promise.all([
    listSpotInstruments(client, pair),
    listRealityStockInfo(client, pair),
  ]);

  const match = instrumentResult.instruments.find(
    (item) => item.symbol.toUpperCase() === pair && item.isReality,
  );
  if (!match) {
    throw new BitgetError({
      code: "BITGET_NOT_FOUND",
      message: `'${pair}' is not a Reality rToken on Bitget SPOT, or isReality was not yes.`,
      httpStatus: 404,
      path: INSTRUMENTS_PATH,
    });
  }

  const stock = stockInfoResult.items.find((item) => item.symbol.toUpperCase() === pair);
  return {
    instrument: {
      ...match,
      tokenSymbol: tokenSymbolFromPair(match.symbol),
      underlyingSymbol: stock?.underlyingCode ?? underlyingFromPair(match.symbol),
      displayName: stock?.name ?? null,
      tradingPeriod: stock?.tradingPeriod ?? [],
      weekendTradable: stock ? stock.weekendTradable : null,
    },
    provenance: {
      source: "bitget",
      endpoint: INSTRUMENTS_PATH,
      retrievedAt,
      requestTime: instrumentResult.provenance.requestTime,
      observedAt: instrumentResult.provenance.observedAt,
    },
  };
}
