import { getRealityInstrument } from "@/lib/bitget/assets";
import { getCandles } from "@/lib/bitget/history";
import { getTicker } from "@/lib/bitget/market";
import { getOptionalPublicOrderBook, getOptionalRealityOrderBook } from "@/lib/bitget/orderbook";
import { getCompanyOverview, getSessionSnapshot, getStockInfoForSymbol } from "@/lib/bitget/session";
import { isBitgetError } from "@/lib/bitget/errors";
import { normalizeRTokenSymbol } from "@/lib/bitget/symbols";
import { normalizeMarketContext } from "./normalize";
import type { MarketRawInput, MarketSnapshotPayload, ResourceFailure } from "./types";
import type { DataProvenance } from "@/lib/bitget/types";

function failureFrom(resource: string, error: unknown): ResourceFailure {
  return {
    resource,
    code: isBitgetError(error) ? error.code : undefined,
    message: error instanceof Error ? error.message : String(error),
  };
}

async function settle<T>(
  resource: string,
  loader: () => Promise<T>,
  failures: ResourceFailure[],
): Promise<T | undefined> {
  try {
    return await loader();
  } catch (error) {
    failures.push(failureFrom(resource, error));
    return undefined;
  }
}

export async function gatherMarketRaw(symbol: string): Promise<MarketRawInput> {
  const retrievedAt = new Date();
  const pair = normalizeRTokenSymbol(symbol);
  const failures: ResourceFailure[] = [];

  let instrumentResult: Awaited<ReturnType<typeof getRealityInstrument>> | undefined;
  try {
    instrumentResult = await getRealityInstrument(pair);
  } catch (error) {
    if (isBitgetError(error) && (error.code === "BITGET_NOT_FOUND" || error.code === "BITGET_VALIDATION")) {
      throw error;
    }
    failures.push(failureFrom("instrument", error));
  }

  const [tickerResult, candlesResult, sessionResult, stockResult, publicBook, realityBook] =
    await Promise.all([
      settle("ticker", () => getTicker(pair), failures),
      settle("candles", () => getCandles({ symbol: pair, interval: "1H", limit: 24 }), failures),
      settle("session", () => getSessionSnapshot(), failures),
      settle("stock", () => getStockInfoForSymbol(pair), failures),
      getOptionalPublicOrderBook(pair),
      getOptionalRealityOrderBook(pair),
    ]);

  if (publicBook.availability === "error") {
    failures.push({
      resource: "publicOrderBook",
      message: publicBook.reason ?? "Public UTA order book request failed.",
    });
  }
  if (realityBook.availability === "error") {
    failures.push({
      resource: "realityOrderBook",
      message: realityBook.reason ?? "Reality order book request failed.",
    });
  }

  const code =
    stockResult?.stock?.underlyingCode ?? instrumentResult?.instrument.underlyingSymbol ?? undefined;
  let company = null;
  let companyError: string | null = null;
  let companyProvenance: DataProvenance | undefined;
  if (code) {
    const companyResult = await settle("company", () => getCompanyOverview(code), failures);
    if (companyResult) {
      company = companyResult.company;
      companyProvenance = companyResult.provenance;
    } else {
      companyError =
        failures.find((item) => item.resource === "company")?.message ?? "Company overview unavailable";
    }
  }

  return {
    retrievedAt,
    requestedSymbol: symbol,
    pair,
    instrument: instrumentResult?.instrument ?? null,
    instrumentError: failures.find((item) => item.resource === "instrument")?.message,
    ticker: tickerResult?.ticker ?? null,
    tickerError: failures.find((item) => item.resource === "ticker")?.message,
    tickerEndpoint: tickerResult?.provenance.endpoint,
    candles: candlesResult?.candles ?? null,
    candleInterval: candlesResult?.interval ?? "1H",
    candlesError: failures.find((item) => item.resource === "candles")?.message,
    candlesEndpoint: candlesResult?.provenance.endpoint,
    session: sessionResult?.session ?? null,
    states: sessionResult?.states ?? null,
    calendar: sessionResult?.calendar ?? null,
    sessionError: failures.find((item) => item.resource === "session")?.message,
    stock: stockResult?.stock ?? null,
    stockError: failures.find((item) => item.resource === "stock")?.message,
    company,
    companyError,
    publicOrderBook: publicBook,
    realityOrderBook: realityBook,
    failures,
    provenance: {
      instrument: instrumentResult?.provenance,
      ticker: tickerResult?.provenance,
      candles: candlesResult?.provenance,
      session: sessionResult?.provenance,
      stock: stockResult?.provenance,
      company: companyProvenance,
      publicOrderBook: publicBook.provenance,
      realityOrderBook: realityBook.provenance,
    },
  };
}

export async function getMarketSnapshot(symbol: string): Promise<MarketSnapshotPayload> {
  const raw = await gatherMarketRaw(symbol);
  return {
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

export async function getMarketContext(symbol: string) {
  const snapshot = await getMarketSnapshot(symbol);
  return snapshot.context;
}
