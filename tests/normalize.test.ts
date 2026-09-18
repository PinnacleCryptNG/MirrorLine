import { describe, expect, it } from "vitest";
import { calculateSpread } from "@/lib/market/spread";
import {
  CANDLE_INTERVAL_MS,
  candleSeriesFreshness,
  classifyFreshness,
  freshnessSeconds,
  observedAtMs,
} from "@/lib/market/freshness";
import { derivedField, observedField, unavailableField } from "@/lib/market/fields";
import { normalizeMarketContext } from "@/lib/market/normalize";
import type { MarketRawInput } from "@/lib/market/types";
import type { Candle, RealityTicker, SessionSnapshot } from "@/lib/bitget/types";

const retrievedAt = new Date("2026-09-17T15:00:00.000Z");

function baseRaw(overrides: Partial<MarketRawInput> = {}): MarketRawInput {
  return {
    retrievedAt,
    requestedSymbol: "rAAPL",
    pair: "RAAPLUSDT",
    instrument: {
      symbol: "RAAPLUSDT",
      category: "SPOT",
      baseCoin: "rAAPL",
      quoteCoin: "USDT",
      symbolType: "stock",
      isReality: true,
      status: "online",
      tokenSymbol: "rAAPL",
      underlyingSymbol: "AAPL",
      displayName: "Apple",
      tradingPeriod: ["pre_market", "regular", "after_hours", "overnight"],
      weekendTradable: true,
    },
    ticker: {
      symbol: "RAAPLUSDT",
      category: "SPOT",
      lastPrice: "332.9",
      lastPriceNumber: 332.9,
      openPrice24h: "334.35",
      highPrice24h: "335.58",
      lowPrice24h: "330.7",
      change24hPercent: "-0.00434",
      change24hPercentNumber: -0.00434,
      bid: "332.86",
      bidSize: "45",
      ask: "332.94",
      askSize: "20",
      volume24h: "17336069.9731",
      turnover24h: "5769451285.3446",
      sourceTimestamp: new Date(retrievedAt.getTime() - 3_000).toISOString(),
      sourceTimestampMs: retrievedAt.getTime() - 3_000,
    },
    candles: [
      {
        timestampMs: retrievedAt.getTime() - 60 * 60 * 1000,
        timestamp: new Date(retrievedAt.getTime() - 60 * 60 * 1000).toISOString(),
        open: "334.12",
        high: "334.25",
        low: "333.73",
        close: "334.04",
        volume: "12",
        turnover: "4000",
      },
    ],
    candleInterval: "1H",
    session: {
      evaluatedAt: retrievedAt.toISOString(),
      timeZone: "EST",
      daylightType: "standard",
      bitgetState: "regular",
      marketSession: "US_REGULAR",
      underlyingUsEquity: "regular",
      weekend: false,
      derivation: ["Matched Bitget state 'regular' (09:30–16:00 EST)."],
    },
    states: {
      market: "US",
      daylightType: "standard",
      windows: [
        { state: "pre_market", timeZone: "EST", startTime: "04:00", endTime: "09:30" },
        { state: "regular", timeZone: "EST", startTime: "09:30", endTime: "16:00" },
        { state: "after_hours", timeZone: "EST", startTime: "16:00", endTime: "20:00" },
        { state: "overnight", timeZone: "EST", startTime: "20:00", endTime: "04:00" },
      ],
    },
    calendar: {
      timeZone: "EST",
      weekendDays: ["SATURDAY", "SUNDAY"],
      holidays: [],
    },
    stock: {
      symbol: "RAAPLUSDT",
      underlyingCode: "AAPL",
      name: "Apple",
      tradingPeriod: ["pre_market", "regular", "after_hours", "overnight"],
      weekendTradable: true,
    },
    company: {
      code: "AAPL",
      name: "Apple Inc.",
      high52Week: "260.1",
      low52Week: "169.2",
    },
    publicOrderBook: {
      availability: "available",
      book: {
        bids: [{ price: "332.86", size: "45" }],
        asks: [{ price: "332.94", size: "20" }],
        source: "uta_public_orderbook",
        availability: "available",
        note: "This is the public UTA SPOT order book, not the whitelist Reality 40-level book.",
      },
    },
    realityOrderBook: {
      availability: "unauthorized",
      book: null,
      reason: "API key and whitelist required.",
    },
    failures: [],
    provenance: {},
    ...overrides,
  };
}

describe("calculateSpread", () => {
  it("derives spread and bps against mid", () => {
    const result = calculateSpread(332.86, 332.94, 332.9);
    expect(result.spread).toBeCloseTo(0.08);
    expect(result.mid).toBeCloseTo(332.9);
    expect(result.spreadBps).toBeCloseTo((0.08 / 332.9) * 10_000);
  });

  it("does not invent a spread when bid or ask is missing", () => {
    expect(calculateSpread(undefined, 10, 10).spread).toBeNull();
    expect(calculateSpread(10, undefined, 10).spreadBps).toBeNull();
    expect(calculateSpread(Number.NaN, 10, 10).reason).toMatch(/not provided/i);
  });

  it("keeps a zero spread and reports bps as 0", () => {
    const result = calculateSpread(10, 10, 10);
    expect(result.spread).toBe(0);
    expect(result.spreadBps).toBe(0);
  });

  it("falls back to last price when mid is 0", () => {
    const result = calculateSpread(-1, 1, 50);
    expect(result.mid).toBe(0);
    expect(result.spread).toBe(2);
    expect(result.spreadBps).toBeCloseTo((2 / 50) * 10_000);
  });
});

describe("freshness", () => {
  it("classifies missing timestamps as unknown, not stale", () => {
    expect(freshnessSeconds(undefined, retrievedAt)).toBeNull();
    expect(classifyFreshness(null, 15)).toBe("unknown");
    expect(classifyFreshness(3, 15)).toBe("fresh");
    expect(classifyFreshness(16, 15)).toBe("stale");
  });

  it("parses numeric and ISO observed-at values", () => {
    expect(observedAtMs(1_700_000_000_000)).toBe(1_700_000_000_000);
    expect(observedAtMs("1700000000000")).toBe(1_700_000_000_000);
    expect(observedAtMs("2026-09-17T15:00:00.000Z")).toBe(Date.parse("2026-09-17T15:00:00.000Z"));
    expect(observedAtMs("")).toBeUndefined();
  });

  it("marks candles stale when the last bar is older than 2× the interval", () => {
    const last = retrievedAt.getTime() - CANDLE_INTERVAL_MS["1H"] * 3;
    expect(candleSeriesFreshness(last, "1H", retrievedAt)).toBe("stale");
    expect(candleSeriesFreshness(retrievedAt.getTime() - 30 * 60_000, "1H", retrievedAt)).toBe("fresh");
    expect(candleSeriesFreshness(undefined, "1H", retrievedAt)).toBe("unknown");
  });
});

describe("field helpers", () => {
  it("labels observed values and preserves stale status", () => {
    const fresh = observedField(10, {
      observedAtMs: retrievedAt.getTime() - 2_000,
      retrievedAtDate: retrievedAt,
      staleAfterSeconds: 15,
    });
    expect(fresh.kind).toBe("observed");
    expect(fresh.status).toBe("ok");
    expect(fresh.evidence).toBe("FACT");

    const stale = observedField(10, {
      observedAtMs: retrievedAt.getTime() - 20_000,
      retrievedAtDate: retrievedAt,
      staleAfterSeconds: 15,
    });
    expect(stale.status).toBe("stale");
    expect(stale.note).toMatch(/20s old/);

    const unknown = observedField(10, {
      retrievedAtDate: retrievedAt,
      staleAfterSeconds: 15,
    });
    expect(unknown.status).toBe("unknown");
  });

  it("does not treat missing timestamps as stale", () => {
    const field = observedField("332.9", {
      retrievedAtDate: retrievedAt,
      staleAfterSeconds: 15,
    });
    expect(field.status).toBe("unknown");
    expect(field.kind).toBe("observed");
  });

  it("marks missing derived inputs without inventing a number", () => {
    const field = derivedField(null, { formula: "spread = ask - bid" });
    expect(field.kind).toBe("unavailable");
    expect(field.status).toBe("missing");
    expect(field.value).toBeNull();
    expect(field.formula).toBe("spread = ask - bid");
  });

  it("keeps unverified values unavailable", () => {
    const field = unavailableField("No US tape");
    expect(field.kind).toBe("unavailable");
    expect(field.status).toBe("unverified");
    expect(field.evidence).toBe("UNKNOWN");
  });
});

describe("normalizeMarketContext", () => {
  it("labels ticker price observed and spread derived", () => {
    const context = normalizeMarketContext(baseRaw());
    expect(context.price.last.kind).toBe("observed");
    expect(context.price.last.value).toBe(332.9);
    expect(context.price.last.status).toBe("ok");
    expect(context.price.change24hPercent.value).toBeCloseTo(-0.00434);
    expect(context.price.volume24h.kind).toBe("observed");
    expect(context.bookTop.spread.kind).toBe("derived");
    expect(context.bookTop.spread.value).toBeCloseTo(0.08);
    expect(context.bookTop.spreadBps.kind).toBe("derived");
    expect(context.bookTop.mid.value).toBeCloseTo(332.9);
    expect(context.session.marketSession.kind).toBe("derived");
    expect(context.session.marketSession.value).toBe("US_REGULAR");
    expect(context.session.windows.kind).toBe("observed");
    expect(context.session.tokenWindowMatch.value).toBe(true);
  });

  it("does not calculate spread when bid/ask are missing", () => {
    const ticker: RealityTicker = {
      ...(baseRaw().ticker as RealityTicker),
      bid: undefined,
      ask: undefined,
    };
    const context = normalizeMarketContext(baseRaw({ ticker }));
    expect(context.bookTop.bid.kind).toBe("unavailable");
    expect(context.bookTop.ask.status).toBe("missing");
    expect(context.bookTop.spread.kind).toBe("unavailable");
    expect(context.bookTop.spread.value).toBeNull();
    expect(context.price.last.kind).toBe("observed");
  });

  it("marks stale ticker fields without replacing the last price", () => {
    const ticker: RealityTicker = {
      ...(baseRaw().ticker as RealityTicker),
      sourceTimestampMs: retrievedAt.getTime() - 45_000,
      sourceTimestamp: new Date(retrievedAt.getTime() - 45_000).toISOString(),
    };
    const context = normalizeMarketContext(baseRaw({ ticker }));
    expect(context.price.last.value).toBe(332.9);
    expect(context.price.last.status).toBe("stale");
    expect(context.bookTop.spread.status).toBe("stale");
  });

  it("keeps session when the ticker request fails", () => {
    const context = normalizeMarketContext(
      baseRaw({
        ticker: null,
        tickerError: "Too Many Requests",
        failures: [{ resource: "ticker", code: "BITGET_API_ERROR", message: "Too Many Requests" }],
      }),
    );
    expect(context.price.last.kind).toBe("unavailable");
    expect(context.price.last.status).toBe("error");
    expect(context.price.last.value).toBeNull();
    expect(context.bookTop.spread.status).toBe("error");
    expect(context.session.marketSession.value).toBe("US_REGULAR");
    expect(context.session.marketSession.kind).toBe("derived");
    expect(context.failures[0]?.resource).toBe("ticker");
  });

  it("leaves reference price and divergence unverified even when company 52w exists", () => {
    const context = normalizeMarketContext(baseRaw());
    expect(context.reference.tokenPrice.kind).toBe("observed");
    expect(context.reference.underlyingSymbol.kind).toBe("observed");
    expect(context.reference.underlyingSymbol.value).toBe("AAPL");
    expect(context.reference.companyHigh52Week.kind).toBe("observed");
    expect(context.reference.companyHigh52Week.note).toMatch(/not a live underlying quote/i);
    expect(context.reference.referencePrice.kind).toBe("unavailable");
    expect(context.reference.referencePrice.status).toBe("unverified");
    expect(context.reference.referencePrice.value).toBeNull();
    expect(context.reference.divergence.kind).toBe("unavailable");
    expect(context.reference.divergence.value).toBeNull();
  });

  it("uses symbol convention for underlying only as an assumption", () => {
    const context = normalizeMarketContext(baseRaw({ stock: null }));
    expect(context.reference.underlyingSymbol.kind).toBe("derived");
    expect(context.reference.underlyingSymbol.evidence).toBe("ASSUMPTION");
    expect(context.reference.underlyingSymbol.value).toBe("AAPL");
    expect(context.reference.underlyingSymbol.note).toMatch(/pair name/i);
  });

  it("marks empty candles missing and stale candles stale", () => {
    const empty = normalizeMarketContext(baseRaw({ candles: [] }));
    expect(empty.candles.series.kind).toBe("unavailable");
    expect(empty.candles.series.status).toBe("missing");
    expect(empty.candles.latestClose.value).toBeNull();

    const old: Candle[] = [
      {
        timestampMs: retrievedAt.getTime() - 5 * 60 * 60 * 1000,
        timestamp: new Date(retrievedAt.getTime() - 5 * 60 * 60 * 1000).toISOString(),
        open: "1",
        high: "1",
        low: "1",
        close: "1",
        volume: null,
        turnover: null,
      },
    ];
    const stale = normalizeMarketContext(baseRaw({ candles: old }));
    expect(stale.candles.latestClose.status).toBe("stale");
    expect(stale.candles.series.status).toBe("stale");
    expect(stale.candles.latestClose.value).toBe("1");
  });

  it("maps overnight session as US_CLOSED for the underlying", () => {
    const session: SessionSnapshot = {
      evaluatedAt: retrievedAt.toISOString(),
      timeZone: "EST",
      daylightType: "standard",
      bitgetState: "overnight",
      marketSession: "US_CLOSED",
      underlyingUsEquity: "closed",
      weekend: false,
      derivation: ["Overnight is a Reality trading window."],
    };
    const context = normalizeMarketContext(baseRaw({ session }));
    expect(context.session.marketSession.value).toBe("US_CLOSED");
    expect(context.session.underlyingUsEquity.value).toBe("closed");
    expect(context.session.bitgetState.value).toBe("overnight");
    expect(context.session.tokenWindowMatch.value).toBe(true);
    expect(context.limitations.join(" ")).toMatch(/does not mean the underlying US equity session is open/i);
  });

  it("does not treat the public UTA book as Reality depth", () => {
    const context = normalizeMarketContext(baseRaw());
    expect(context.depth.publicUtaBook.kind).toBe("observed");
    expect(context.depth.publicUtaBook.note).toMatch(/not the whitelist Reality 40-level book/i);
    expect(context.depth.realityBook.kind).toBe("unavailable");
    expect(context.depth.realityBook.status).toBe("unverified");
  });

  it("reports candle request failures as error, not a fake series", () => {
    const context = normalizeMarketContext(
      baseRaw({
        candles: null,
        candlesError: "timeout",
        failures: [{ resource: "candles", message: "timeout" }],
      }),
    );
    expect(context.candles.series.status).toBe("error");
    expect(context.candles.series.value).toBeNull();
    expect(context.candles.count.status).toBe("error");
  });
});
