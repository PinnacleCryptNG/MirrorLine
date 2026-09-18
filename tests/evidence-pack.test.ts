import { describe, expect, it } from "vitest";
import { buildEvidencePack } from "@/lib/evidence/pack";
import { EVIDENCE_IDS } from "@/lib/evidence/types";
import { normalizeMarketContext } from "@/lib/market/normalize";
import type { MarketRawInput } from "@/lib/market/types";
import type { RealityTicker } from "@/lib/bitget/types";

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
      change24hPercentNumber: -0.00434,
      bid: "332.86",
      ask: "332.94",
      volume24h: "17336069.9731",
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
        { state: "regular", timeZone: "EST", startTime: "09:30", endTime: "16:00" },
        { state: "overnight", timeZone: "EST", startTime: "20:00", endTime: "04:00" },
      ],
    },
    calendar: { timeZone: "EST", weekendDays: ["SATURDAY", "SUNDAY"], holidays: [] },
    stock: {
      symbol: "RAAPLUSDT",
      underlyingCode: "AAPL",
      name: "Apple",
      tradingPeriod: ["pre_market", "regular", "after_hours", "overnight"],
      weekendTradable: true,
    },
    company: { code: "AAPL", name: "Apple Inc.", high52Week: "260.1", low52Week: "169.2" },
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

function packFrom(overrides: Partial<MarketRawInput> = {}) {
  return buildEvidencePack(normalizeMarketContext(baseRaw(overrides)));
}

function byId(pack: ReturnType<typeof packFrom>, id: string) {
  const item = pack.items.find((entry) => entry.id === id);
  if (!item) {
    throw new Error(`Missing evidence item ${id}`);
  }
  return item;
}

describe("buildEvidencePack", () => {
  it("classifies observed price as FACT and spread as a traced INFERENCE", () => {
    const pack = packFrom();
    const last = byId(pack, EVIDENCE_IDS.priceLast);
    const spread = byId(pack, EVIDENCE_IDS.bookSpread);
    const change = byId(pack, EVIDENCE_IDS.priceChange24h);

    expect(last.classification).toBe("FACT");
    expect(last.sources[0]?.field).toBe("ticker.lastPrice");
    expect(last.sources[0]?.observedAt).toBeTruthy();
    expect(last.confidence?.level).toBe("high");

    expect(spread.classification).toBe("INFERENCE");
    expect(spread.supports).toEqual([EVIDENCE_IDS.bookBid, EVIDENCE_IDS.bookAsk]);
    expect(spread.reasoning).toMatch(/ask/i);
    expect(spread.confidence?.level).toBe("medium");

    expect(change.classification).toBe("FACT");
    expect(change.claim).toMatch(/24-hour price change/);
    expect(change.caveats.join(" ")).toMatch(/not a causal claim/i);
    expect(pack.investigation.question).toMatch(/rAAPL/);
  });

  it("keeps session as INFERENCE over observed windows", () => {
    const pack = packFrom();
    const windows = byId(pack, EVIDENCE_IDS.sessionWindows);
    const current = byId(pack, EVIDENCE_IDS.sessionCurrent);
    expect(windows.classification).toBe("FACT");
    expect(current.classification).toBe("INFERENCE");
    expect(current.supports).toContain(EVIDENCE_IDS.sessionWindows);
    expect(current.value).toBe("US_REGULAR");
  });

  it("never treats a missing US tape as a FACT reference price", () => {
    const pack = packFrom();
    const reference = byId(pack, EVIDENCE_IDS.referencePrice);
    const divergence = byId(pack, EVIDENCE_IDS.referenceDivergence);
    const company = byId(pack, EVIDENCE_IDS.referenceCompanyRange);

    expect(reference.classification).toBe("UNKNOWN");
    expect(reference.value).toBeNull();
    expect(reference.confidence).toBeUndefined();
    expect(divergence.classification).toBe("UNKNOWN");
    expect(divergence.value).toBeNull();
    expect(company.classification).toBe("FACT");
    expect(company.caveats.join(" ")).toMatch(/not a live underlying quote/i);
    expect(pack.unknowns.some((item) => item.toLowerCase().includes("us-listed"))).toBe(true);
  });

  it("marks stale ticker facts without replacing the price", () => {
    const ticker: RealityTicker = {
      ...(baseRaw().ticker as RealityTicker),
      sourceTimestampMs: retrievedAt.getTime() - 45_000,
      sourceTimestamp: new Date(retrievedAt.getTime() - 45_000).toISOString(),
    };
    const pack = packFrom({ ticker });
    const last = byId(pack, EVIDENCE_IDS.priceLast);
    expect(last.classification).toBe("FACT");
    expect(last.status).toBe("stale");
    expect(last.value).toBe(332.9);
    expect(last.confidence?.level).toBe("low");
    expect(byId(pack, "data.stale").classification).toBe("FACT");
  });

  it("represents missing bid/ask as UNKNOWN spread instead of inventing one", () => {
    const ticker: RealityTicker = {
      ...(baseRaw().ticker as RealityTicker),
      bid: undefined,
      ask: undefined,
    };
    const pack = packFrom({ ticker });
    expect(byId(pack, EVIDENCE_IDS.bookBid).classification).toBe("UNKNOWN");
    expect(byId(pack, EVIDENCE_IDS.bookSpread).classification).toBe("UNKNOWN");
    expect(byId(pack, EVIDENCE_IDS.bookSpread).value).toBeNull();
    expect(byId(pack, EVIDENCE_IDS.priceLast).classification).toBe("FACT");
  });

  it("keeps a partial pack when the ticker request fails", () => {
    const pack = packFrom({
      ticker: null,
      tickerError: "Too Many Requests",
      failures: [{ resource: "ticker", code: "BITGET_API_ERROR", message: "Too Many Requests" }],
    });
    expect(byId(pack, EVIDENCE_IDS.priceLast).classification).toBe("UNKNOWN");
    expect(byId(pack, EVIDENCE_IDS.priceLast).status).toBe("error");
    expect(byId(pack, EVIDENCE_IDS.priceLast).value).toBeNull();
    expect(byId(pack, EVIDENCE_IDS.sessionCurrent).classification).toBe("INFERENCE");
    expect(byId(pack, "data.failure.ticker").classification).toBe("UNKNOWN");
    expect(byId(pack, "data.failure.ticker").status).toBe("error");
    expect(pack.failures).toHaveLength(1);
  });

  it("does not fabricate news, US tape, liquidity models, or Reality depth", () => {
    const pack = packFrom();
    const joined = pack.items.map((item) => `${item.claim} ${item.reasoning}`).join("\n");
    expect(joined).not.toMatch(/Bloomberg|Reuters|SEC filing|breaking news/i);
    expect(joined).not.toMatch(/because investors/i);
    expect(byId(pack, EVIDENCE_IDS.newsContext).classification).toBe("UNKNOWN");
    expect(byId(pack, EVIDENCE_IDS.liquidityModel).classification).toBe("UNKNOWN");
    expect(byId(pack, EVIDENCE_IDS.depthReality).classification).toBe("UNKNOWN");
    expect(byId(pack, EVIDENCE_IDS.depthPublicUta).classification).toBe("FACT");
    expect(byId(pack, EVIDENCE_IDS.depthPublicUta).caveats.join(" ")).toMatch(/not the whitelist Reality 40-level/i);
    expect(pack.items.filter((item) => item.classification === "FACT").every((item) => !/US tape print/i.test(item.claim))).toBe(true);
  });

  it("labels a convention underlying as ASSUMPTION, not FACT", () => {
    const pack = packFrom({ stock: null });
    const underlying = byId(pack, EVIDENCE_IDS.referenceUnderlying);
    expect(underlying.classification).toBe("ASSUMPTION");
    expect(underlying.value).toBe("AAPL");
    expect(underlying.confidence?.level).toBe("low");
    expect(underlying.reasoning).toMatch(/assumption/i);
  });

  it("keeps candle inferences off the pack when candles fail", () => {
    const pack = packFrom({
      candles: null,
      candlesError: "timeout",
      failures: [{ resource: "candles", message: "timeout" }],
    });
    expect(byId(pack, EVIDENCE_IDS.candlesLatestBar).classification).toBe("UNKNOWN");
    expect(pack.items.find((item) => item.id === EVIDENCE_IDS.candlesLastCloseVsOpen)).toBeUndefined();
    expect(byId(pack, "data.failure.candles").status).toBe("error");
    expect(byId(pack, EVIDENCE_IDS.priceLast).classification).toBe("FACT");
  });

  it("describes last-bar close vs open as INFERENCE without causation", () => {
    const pack = packFrom();
    const move = byId(pack, EVIDENCE_IDS.candlesLastCloseVsOpen);
    expect(move.classification).toBe("INFERENCE");
    expect(move.supports).toContain(EVIDENCE_IDS.candlesLatestBar);
    expect(move.caveats.join(" ")).toMatch(/not treat close-versus-open as causation/i);
  });

  it("requires every INFERENCE to cite supporting items", () => {
    const pack = packFrom();
    const inferences = pack.items.filter((item) => item.classification === "INFERENCE");
    expect(inferences.length).toBeGreaterThan(0);
    for (const item of inferences) {
      expect(item.supports.length).toBeGreaterThan(0);
      expect(item.reasoning.length).toBeGreaterThan(0);
    }
  });
});
