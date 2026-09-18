import { describe, expect, it } from "vitest";
import { buildEvidencePack } from "@/lib/evidence/pack";
import { EVIDENCE_IDS } from "@/lib/evidence/types";
import { buildInvestigationBrief } from "@/lib/brief/generate";
import { TENSION_IDS } from "@/lib/brief/types";
import { normalizeMarketContext } from "@/lib/market/normalize";
import type { MarketRawInput } from "@/lib/market/types";
import type { RealityTicker, SessionSnapshot } from "@/lib/bitget/types";

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
      volume24h: "1000",
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
      derivation: ["Matched Bitget state 'regular'."],
    },
    states: {
      market: "US",
      daylightType: "standard",
      windows: [{ state: "regular", timeZone: "EST", startTime: "09:30", endTime: "16:00" }],
    },
    calendar: { timeZone: "EST", weekendDays: ["SATURDAY", "SUNDAY"], holidays: [] },
    stock: {
      symbol: "RAAPLUSDT",
      underlyingCode: "AAPL",
      name: "Apple",
      tradingPeriod: ["pre_market", "regular", "after_hours", "overnight"],
      weekendTradable: true,
    },
    company: { code: "AAPL", name: "Apple", high52Week: "260.1", low52Week: "169.2" },
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
    realityOrderBook: { availability: "unauthorized", book: null, reason: "whitelist required" },
    failures: [],
    provenance: {},
    ...overrides,
  };
}

function briefFrom(overrides: Partial<MarketRawInput> = {}) {
  return buildInvestigationBrief(buildEvidencePack(normalizeMarketContext(baseRaw(overrides))));
}

describe("buildInvestigationBrief", () => {
  it("uses the required section structure and is non-advisory", () => {
    const brief = briefFrom();
    expect(brief.milestone).toBe("4-investigation-brief");
    expect(brief.advisory).toBe(false);
    expect(brief.question).toMatch(/rAAPL/);
    expect(brief.executiveSummary.length).toBeGreaterThan(0);
    expect(brief.marketAndSession.id).toBe("market-session");
    expect(brief.observedFacts.id).toBe("facts");
    expect(brief.derivedInferences.id).toBe("inferences");
    expect(brief.assumptions.id).toBe("assumptions");
    expect(brief.unknowns.id).toBe("unknowns");
    expect(brief.doesNotEstablish.length).toBeGreaterThan(0);
    expect(brief.nextQuestions.length).toBeGreaterThan(0);
  });

  it("keeps every citation pointing at a real evidence item", () => {
    const pack = buildEvidencePack(normalizeMarketContext(baseRaw()));
    const brief = buildInvestigationBrief(pack);
    const known = new Set(pack.items.map((item) => item.id));
    for (const id of Object.keys(brief.citations)) {
      expect(known.has(id)).toBe(true);
    }
    for (const tension of brief.tensions) {
      expect(tension.evidenceIds.length).toBeGreaterThan(0);
      for (const id of tension.evidenceIds) {
        expect(known.has(id)).toBe(true);
      }
    }
  });

  it("copies FACT claims instead of rewriting them into unsupported conclusions", () => {
    const pack = buildEvidencePack(normalizeMarketContext(baseRaw()));
    const brief = buildInvestigationBrief(pack);
    const lastClaim = pack.items.find((item) => item.id === EVIDENCE_IDS.priceLast)?.claim;
    expect(lastClaim).toBeTruthy();
    expect(brief.observedFacts.paragraphs.some((paragraph) => paragraph.text.includes(lastClaim!))).toBe(true);
    expect(brief.observedFacts.paragraphs.join(" ")).not.toMatch(/therefore buy|caused by news|US tape print/i);
    expect(brief.derivedInferences.paragraphs.every((paragraph) => /INFERENCE/.test(paragraph.text))).toBe(true);
  });

  it("treats overnight rToken quoting vs closed US equity as a tension, not a contradiction", () => {
    const session: SessionSnapshot = {
      evaluatedAt: retrievedAt.toISOString(),
      timeZone: "EST",
      daylightType: "standard",
      bitgetState: "overnight",
      marketSession: "US_CLOSED",
      underlyingUsEquity: "closed",
      weekend: false,
      derivation: ["Overnight Reality window."],
    };
    const brief = briefFrom({ session });
    const tension = brief.tensions.find((item) => item.id === TENSION_IDS.tokenVsClosedEquity);
    expect(tension?.severity).toBe("tension");
    expect(tension?.evidenceIds).toEqual(
      expect.arrayContaining([EVIDENCE_IDS.priceLast, EVIDENCE_IDS.sessionCurrent, EVIDENCE_IDS.sessionUnderlying]),
    );
    expect(brief.tensions.some((item) => item.id === TENSION_IDS.tokenVsClosedEquity && item.severity === "contradiction")).toBe(false);
  });

  it("does not invent an overnight tension during regular US hours", () => {
    const brief = briefFrom();
    expect(brief.tensions.some((item) => item.id === TENSION_IDS.tokenVsClosedEquity)).toBe(false);
  });

  it("flags a 24h move without a cause, and keeps news UNKNOWN", () => {
    const brief = briefFrom();
    const tension = brief.tensions.find((item) => item.id === TENSION_IDS.moveWithoutCause);
    expect(tension?.severity).toBe("tension");
    expect(tension?.evidenceIds).toEqual(expect.arrayContaining([EVIDENCE_IDS.priceChange24h, EVIDENCE_IDS.newsContext]));
    expect(brief.unknowns.paragraphs.some((paragraph) => paragraph.evidenceIds.includes(EVIDENCE_IDS.newsContext))).toBe(true);
    expect(brief.doesNotEstablish.some((paragraph) => /why any 24-hour price change/i.test(paragraph.text))).toBe(true);
  });

  it("does not claim a move when 24h change is zero", () => {
    const ticker: RealityTicker = {
      ...(baseRaw().ticker as RealityTicker),
      change24hPercentNumber: 0,
    };
    const brief = briefFrom({ ticker });
    expect(brief.tensions.some((item) => item.id === TENSION_IDS.moveWithoutCause)).toBe(false);
  });

  it("keeps named underlying vs missing tape as a tension and leaves reference UNKNOWN", () => {
    const brief = briefFrom();
    const tension = brief.tensions.find((item) => item.id === TENSION_IDS.namedUnderlyingWithoutTape);
    expect(tension?.severity).toBe("tension");
    expect(brief.unknowns.paragraphs.some((paragraph) => paragraph.evidenceIds.includes(EVIDENCE_IDS.referencePrice))).toBe(true);
    expect(Object.values(brief.citations).some((item) => item.id === EVIDENCE_IDS.referencePrice && item.classification === "UNKNOWN")).toBe(true);
  });

  it("labels a convention underlying as an assumption tension, not a fact", () => {
    const brief = briefFrom({ stock: null });
    expect(brief.tensions.some((item) => item.id === TENSION_IDS.conventionUnderlying)).toBe(true);
    expect(brief.assumptions.paragraphs.some((paragraph) => /ASSUMPTION/.test(paragraph.text))).toBe(true);
    expect(brief.observedFacts.paragraphs.some((paragraph) => paragraph.evidenceIds.includes(EVIDENCE_IDS.referenceUnderlying))).toBe(false);
  });

  it("marks inverted bid/ask as a contradiction", () => {
    const ticker: RealityTicker = {
      ...(baseRaw().ticker as RealityTicker),
      bid: "10",
      ask: "9",
    };
    const brief = briefFrom({ ticker });
    const contradiction = brief.tensions.find((item) => item.id === TENSION_IDS.invertedBook);
    expect(contradiction?.severity).toBe("contradiction");
    expect(contradiction?.evidenceIds).toEqual(
      expect.arrayContaining([EVIDENCE_IDS.bookBid, EVIDENCE_IDS.bookAsk]),
    );
  });

  it("preserves a partial brief when the ticker fails", () => {
    const brief = briefFrom({
      ticker: null,
      tickerError: "timeout",
      failures: [{ resource: "ticker", message: "timeout" }],
    });
    expect(brief.failures).toHaveLength(1);
    expect(brief.tensions.some((item) => item.id === TENSION_IDS.partialFailure)).toBe(true);
    expect(brief.unknowns.paragraphs.some((paragraph) => paragraph.evidenceIds.includes(EVIDENCE_IDS.priceLast))).toBe(true);
    expect(brief.marketAndSession.paragraphs.length).toBeGreaterThan(0);
    expect(brief.tensions.some((item) => item.id === TENSION_IDS.moveWithoutCause)).toBe(false);
  });

  it("surfaces stale last price as a tension without replacing the value", () => {
    const ticker: RealityTicker = {
      ...(baseRaw().ticker as RealityTicker),
      sourceTimestampMs: retrievedAt.getTime() - 45_000,
      sourceTimestamp: new Date(retrievedAt.getTime() - 45_000).toISOString(),
    };
    const brief = briefFrom({ ticker });
    expect(brief.tensions.some((item) => item.id === TENSION_IDS.staleLastPrice)).toBe(true);
    const lastPara = brief.observedFacts.paragraphs.find((paragraph) => paragraph.evidenceIds.includes(EVIDENCE_IDS.priceLast));
    expect(lastPara?.text).toMatch(/332\.9/);
    expect(lastPara?.text).toMatch(/stale/i);
  });

  it("does not invent US tape, news, causes, or liquidity", () => {
    const brief = briefFrom();
    const blob = JSON.stringify(brief);
    expect(blob).not.toMatch(/Bloomberg|Reuters|SEC filing|because investors|NYSE print/i);
    expect(blob).not.toMatch(/buy this|sell this|price target/i);
    expect(brief.unknowns.paragraphs.some((paragraph) => paragraph.evidenceIds.includes(EVIDENCE_IDS.liquidityModel))).toBe(true);
    expect(brief.tensions.some((item) => item.id === TENSION_IDS.utaBookVsRealityDepth)).toBe(true);
  });
});
