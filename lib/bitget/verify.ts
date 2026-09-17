import { getRealityInstrument } from "@/lib/bitget/assets";
import { discoverRealityInstruments } from "@/lib/bitget/assets";
import { getTicker } from "@/lib/bitget/market";
import { getCandles } from "@/lib/bitget/history";
import {
  getCompanyOverview,
  getSessionSnapshot,
  getStockInfoForSymbol,
} from "@/lib/bitget/session";
import {
  getOptionalPublicOrderBook,
  getOptionalRealityOrderBook,
} from "@/lib/bitget/orderbook";
import { getBitgetClient } from "@/lib/bitget/client";
import { isBitgetError } from "@/lib/bitget/errors";
import { normalizeRTokenSymbol } from "@/lib/bitget/symbols";
import { REALITY_CANDLE_INTERVALS } from "@/lib/bitget/types";

export interface VerificationCheck {
  id: string;
  title: string;
  endpoint: string;
  access: "public" | "optional-auth";
  status: "pass" | "fail" | "skipped";
  detail: string;
  sample?: unknown;
}

function failureDetail(error: unknown): string {
  if (isBitgetError(error)) {
    return `${error.code}: ${error.message}`;
  }
  return error instanceof Error ? error.message : "Unknown error";
}

export async function runBitgetVerification(symbolInput = "rAAPL") {
  const startedAt = new Date().toISOString();
  const client = getBitgetClient();
  const symbol = normalizeRTokenSymbol(symbolInput);
  const checks: VerificationCheck[] = [];

  const discovery = await (async () => {
    try {
      const result = await discoverRealityInstruments(client, { status: "online" });
      const featured = result.instruments.filter((item) =>
        ["RAAPLUSDT", "RNVDAUSDT", "RTSLAUSDT", "RCOINUSDT", "RMSFTUSDT"].includes(item.symbol),
      );
      checks.push({
        id: "discover",
        title: "Discover Reality rToken instruments",
        endpoint: "GET /api/v3/market/instruments?category=SPOT plus GET /api/v3/reality/market/stock-info",
        access: "public",
        status: result.total > 0 ? "pass" : "fail",
        detail: `Found ${result.total} Reality instruments with isReality=yes.`,
        sample: {
          total: result.total,
          featured: featured.map((item) => ({
            symbol: item.symbol,
            tokenSymbol: item.tokenSymbol,
            underlyingSymbol: item.underlyingSymbol,
            status: item.status,
            weekendTradable: item.weekendTradable,
          })),
          sample: result.instruments.slice(0, 8).map((item) => item.symbol),
        },
      });
      return result;
    } catch (error) {
      checks.push({
        id: "discover",
        title: "Discover Reality rToken instruments",
        endpoint: "GET /api/v3/market/instruments?category=SPOT",
        access: "public",
        status: "fail",
        detail: failureDetail(error),
      });
      return null;
    }
  })();

  try {
    const instrument = await getRealityInstrument(symbol, client);
    checks.push({
      id: "instrument",
      title: "Resolve a single rToken instrument",
      endpoint: `GET /api/v3/market/instruments?category=SPOT&symbol=${symbol}`,
      access: "public",
      status: instrument.instrument.isReality ? "pass" : "fail",
      detail: `${instrument.instrument.tokenSymbol} maps to ${instrument.instrument.symbol}. isReality=${instrument.instrument.isReality}, status=${instrument.instrument.status}.`,
      sample: {
        symbol: instrument.instrument.symbol,
        tokenSymbol: instrument.instrument.tokenSymbol,
        underlyingSymbol: instrument.instrument.underlyingSymbol,
        isReality: instrument.instrument.isReality,
        status: instrument.instrument.status,
        tradingPeriod: instrument.instrument.tradingPeriod,
        weekendTradable: instrument.instrument.weekendTradable,
      },
    });
  } catch (error) {
    checks.push({
      id: "instrument",
      title: "Resolve a single rToken instrument",
      endpoint: `GET /api/v3/market/instruments?category=SPOT&symbol=${symbol}`,
      access: "public",
      status: "fail",
      detail: failureDetail(error),
    });
  }

  try {
    const tickerResult = await getTicker(symbol, client);
    const ticker = tickerResult.ticker;
    checks.push({
      id: "ticker",
      title: "Retrieve ticker (price, 24h change, bid/ask, volume, timestamp)",
      endpoint: `GET /api/v3/market/tickers?category=SPOT&symbol=${symbol}`,
      access: "public",
      status: "pass",
      detail: `lastPrice=${ticker.lastPrice}, change24h=${ticker.change24hPercent}, bid=${ticker.bid}, ask=${ticker.ask}, volume24h=${ticker.volume24h}, ts=${ticker.sourceTimestamp ?? "not provided"}.`,
      sample: ticker,
    });
  } catch (error) {
    checks.push({
      id: "ticker",
      title: "Retrieve ticker (price, 24h change, bid/ask, volume, timestamp)",
      endpoint: `GET /api/v3/market/tickers?category=SPOT&symbol=${symbol}`,
      access: "public",
      status: "fail",
      detail: failureDetail(error),
    });
  }

  try {
    const candles = await getCandles({ symbol, interval: "1H", limit: 5 }, client);
    const emptyVolume = candles.candles.filter((candle) => candle.volume === null).length;
    checks.push({
      id: "candles",
      title: "Retrieve rToken candles on a supported interval",
      endpoint: `GET /api/v3/market/candles?category=SPOT&symbol=${symbol}&interval=1H&type=market`,
      access: "public",
      status: candles.candles.length > 0 ? "pass" : "fail",
      detail: `Returned ${candles.candles.length} 1H market candles. Supported rToken intervals: ${REALITY_CANDLE_INTERVALS.join(", ")}. Empty volume fields: ${emptyVolume}.`,
      sample: candles.candles.slice(-3),
    });
  } catch (error) {
    checks.push({
      id: "candles",
      title: "Retrieve rToken candles on a supported interval",
      endpoint: `GET /api/v3/market/candles?category=SPOT&symbol=${symbol}&interval=1H&type=market`,
      access: "public",
      status: "fail",
      detail: failureDetail(error),
    });
  }

  try {
    await getCandles({ symbol, interval: "3m", limit: 1 }, client);
    checks.push({
      id: "candles-unsupported",
      title: "Reject unsupported rToken candle intervals",
      endpoint: `GET /api/v3/market/candles?category=SPOT&symbol=${symbol}&interval=3m`,
      access: "public",
      status: "fail",
      detail: "Bitget accepted interval=3m for an rToken. Official docs say only 1m, 5m, 15m, 1H, 4H, 1D are supported.",
    });
  } catch (error) {
    checks.push({
      id: "candles-unsupported",
      title: "Reject unsupported rToken candle intervals",
      endpoint: `GET /api/v3/market/candles?category=SPOT&symbol=${symbol}&interval=3m`,
      access: "public",
      status: "pass",
      detail: `Unsupported interval correctly failed: ${failureDetail(error)}`,
    });
  }

  try {
    const session = await getSessionSnapshot(client);
    checks.push({
      id: "session",
      title: "Retrieve US session schedule and calendar",
      endpoint: "GET /api/v3/reality/market/states and GET /api/v3/reality/market/calendar",
      access: "public",
      status: "pass",
      detail: `Derived marketSession=${session.session.marketSession}, bitgetState=${session.session.bitgetState}, underlyingUsEquity=${session.session.underlyingUsEquity}.`,
      sample: {
        session: session.session,
        windows: session.states.windows,
        weekendDays: session.calendar.weekendDays,
        holidays: session.calendar.holidays,
      },
    });
  } catch (error) {
    checks.push({
      id: "session",
      title: "Retrieve US session schedule and calendar",
      endpoint: "GET /api/v3/reality/market/states and GET /api/v3/reality/market/calendar",
      access: "public",
      status: "fail",
      detail: failureDetail(error),
    });
  }

  try {
    const stock = await getStockInfoForSymbol(symbol, client);
    checks.push({
      id: "stock-info",
      title: "Retrieve Reality stock/session metadata",
      endpoint: `GET /api/v3/reality/market/stock-info?symbol=${symbol}`,
      access: "public",
      status: stock.stock ? "pass" : "fail",
      detail: stock.stock
        ? `${stock.stock.symbol} underlying=${stock.stock.underlyingCode}, weekendTradable=${stock.stock.weekendTradable}, tradingPeriod=${stock.stock.tradingPeriod.join(",")}.`
        : "No stock-info row was returned for this symbol.",
      sample: stock.stock,
    });
  } catch (error) {
    checks.push({
      id: "stock-info",
      title: "Retrieve Reality stock/session metadata",
      endpoint: `GET /api/v3/reality/market/stock-info?symbol=${symbol}`,
      access: "public",
      status: "fail",
      detail: failureDetail(error),
    });
  }

  try {
    const stock = await getStockInfoForSymbol(symbol, client);
    const code = stock.stock?.underlyingCode;
    if (!code) {
      checks.push({
        id: "company",
        title: "Retrieve company overview for the underlying stock",
        endpoint: "GET /api/v3/reality/market/company-overview",
        access: "public",
        status: "skipped",
        detail: "Skipped because stock-info did not provide an underlying code.",
      });
    } else {
      const company = await getCompanyOverview(code, client);
      checks.push({
        id: "company",
        title: "Retrieve company overview for the underlying stock",
        endpoint: `GET /api/v3/reality/market/company-overview?code=${code}`,
        access: "public",
        status: "pass",
        detail: `${company.company.name} (${company.company.code}). This is Bitget-provided company metadata, not a live US tape price.`,
        sample: company.company,
      });
    }
  } catch (error) {
    checks.push({
      id: "company",
      title: "Retrieve company overview for the underlying stock",
      endpoint: "GET /api/v3/reality/market/company-overview",
      access: "public",
      status: "fail",
      detail: failureDetail(error),
    });
  }

  const publicBook = await getOptionalPublicOrderBook(symbol, client);
  checks.push({
    id: "public-orderbook",
    title: "Public UTA order book (not the whitelist Reality book)",
    endpoint: `GET /api/v3/market/orderbook?category=SPOT&symbol=${symbol}`,
    access: "public",
    status: publicBook.availability === "available" ? "pass" : "fail",
    detail:
      publicBook.availability === "available"
        ? `Returned ${publicBook.book?.bids.length ?? 0} bids and ${publicBook.book?.asks.length ?? 0} asks. This is not claimed as Reality 40-level depth.`
        : publicBook.reason ?? "Public order book unavailable.",
    sample: publicBook.book
      ? { bids: publicBook.book.bids.slice(0, 3), asks: publicBook.book.asks.slice(0, 3), ts: publicBook.book.sourceTimestamp }
      : null,
  });

  const realityBook = await getOptionalRealityOrderBook(symbol, client);
  checks.push({
    id: "reality-orderbook",
    title: "Reality-specific order book (optional, whitelist)",
    endpoint: `GET /api/v3/account/reality-orderbook?symbol=${symbol}`,
    access: "optional-auth",
    status: realityBook.availability === "available" ? "pass" : "skipped",
    detail:
      realityBook.availability === "available"
        ? `Returned Reality depth: ${realityBook.book?.bids.length ?? 0} bids / ${realityBook.book?.asks.length ?? 0} asks.`
        : realityBook.reason ??
          "Not verified. Official docs require API key authentication and UID whitelist access.",
    sample: realityBook.book
      ? { bids: realityBook.book.bids.slice(0, 3), asks: realityBook.book.asks.slice(0, 3) }
      : null,
  });

  const passed = checks.filter((check) => check.status === "pass").length;
  const failed = checks.filter((check) => check.status === "fail").length;
  const skipped = checks.filter((check) => check.status === "skipped").length;

  return {
    product: "Mirrorline",
    milestone: "1-bitget-data-foundation",
    startedAt,
    finishedAt: new Date().toISOString(),
    symbol,
    credentialsConfigured: client.hasPrivateCredentials(),
    summary: { passed, failed, skipped, total: checks.length },
    checks,
    notes: [
      "All Bitget calls are server-side. API secrets are never returned.",
      "Ticker bid/ask/size come from Get Tickers. Do not treat that as full book depth.",
      "Reality-specific order book and platform fills remain optional until a whitelisted API key is configured.",
      "No trading or order-execution endpoints are implemented.",
      discovery
        ? `Live discovery counted ${discovery.total} Reality instruments at verification time.`
        : "Instrument discovery did not complete.",
    ],
  };
}
