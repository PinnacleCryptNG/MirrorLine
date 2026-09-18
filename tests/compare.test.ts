import { describe, expect, it } from "vitest";
import { buildEvidencePack } from "@/lib/evidence/pack";
import { EVIDENCE_IDS } from "@/lib/evidence/types";
import { buildInvestigationBrief } from "@/lib/brief/generate";
import { normalizeMarketContext } from "@/lib/market/normalize";
import type { MarketRawInput } from "@/lib/market/types";
import type { RealityTicker } from "@/lib/bitget/types";
import { createStructuredClaim } from "@/lib/composer/validate";
import type { StructuredClaim } from "@/lib/challenge/types";
import {
  assembleComparisonReport,
  parseComparisonInput,
  parseComparisonSymbolList,
  serializeComparisonReportHtml,
  serializeComparisonReportJson,
  serializeComparisonReportMarkdown,
} from "@/lib/compare";
import { sanitizeForExport } from "@/lib/report";
import * as assembleModule from "@/lib/compare/assemble";

const appleAt = new Date("2026-09-17T15:00:00.000Z");
const nvidiaAt = new Date("2026-09-17T15:00:12.000Z");
const createdAt = "2026-09-17T15:05:00.000Z";
const RANKING_RE =
  /\b(best|worst|winner|leaderboard|outperform|should buy|should sell|price will|price target|I recommend)\b/i;
const FABRICATION_RE = /NYSE print showed|NASDAQ print of|Bloomberg reports|breaking news confirmed/i;

function baseRaw(symbol: "rAAPL" | "rNVDA", retrievedAt: Date, overrides: Partial<MarketRawInput> = {}): MarketRawInput {
  const pair = symbol === "rAAPL" ? "RAAPLUSDT" : "RNVDAUSDT";
  const underlying = symbol === "rAAPL" ? "AAPL" : "NVDA";
  const last = symbol === "rAAPL" ? 332.9 : 120.4;
  const change = symbol === "rAAPL" ? -0.00434 : 0.012;
  return {
    retrievedAt,
    requestedSymbol: symbol,
    pair,
    instrument: {
      symbol: pair,
      category: "SPOT",
      baseCoin: symbol,
      quoteCoin: "USDT",
      isReality: true,
      status: "online",
      tokenSymbol: symbol,
      underlyingSymbol: underlying,
      displayName: underlying === "AAPL" ? "Apple" : "NVIDIA",
      tradingPeriod: ["pre_market", "regular", "after_hours", "overnight"],
      weekendTradable: true,
    },
    ticker: {
      symbol: pair,
      category: "SPOT",
      lastPrice: String(last),
      lastPriceNumber: last,
      change24hPercentNumber: change,
      bid: String(last - 0.04),
      ask: String(last + 0.04),
      volume24h: "1000",
      sourceTimestamp: new Date(retrievedAt.getTime() - 3_000).toISOString(),
      sourceTimestampMs: retrievedAt.getTime() - 3_000,
    },
    candles: [
      {
        timestampMs: retrievedAt.getTime() - 60 * 60 * 1000,
        timestamp: new Date(retrievedAt.getTime() - 60 * 60 * 1000).toISOString(),
        open: String(last + 1),
        high: String(last + 1.2),
        low: String(last - 0.5),
        close: String(last),
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
      symbol: pair,
      underlyingCode: underlying,
      name: underlying === "AAPL" ? "Apple" : "NVIDIA",
      tradingPeriod: ["pre_market", "regular", "after_hours", "overnight"],
      weekendTradable: true,
    },
    company: { code: underlying, name: underlying === "AAPL" ? "Apple" : "NVIDIA", high52Week: "260.1", low52Week: "169.2" },
    publicOrderBook: {
      availability: "available",
      book: {
        bids: [{ price: String(last - 0.04), size: "45" }],
        asks: [{ price: String(last + 0.04), size: "20" }],
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

function packFor(symbol: "rAAPL" | "rNVDA", retrievedAt: Date, overrides: Partial<MarketRawInput> = {}) {
  const context = normalizeMarketContext(baseRaw(symbol, retrievedAt, overrides));
  const pack = buildEvidencePack(context);
  return { context, pack, brief: buildInvestigationBrief(pack) };
}

function claim(kind: StructuredClaim["kind"], fields: Record<string, string>, index = 0): StructuredClaim {
  return { ...createStructuredClaim(kind as never, index, appleAt.toISOString()), fields };
}

describe("comparison symbol validation", () => {
  it("rejects duplicates and invalid tickers", () => {
    expect(() => parseComparisonSymbolList(["rAAPL"])).toThrow(/at least 2/i);
    expect(() => parseComparisonSymbolList(["rAAPL", "RAAPLUSDT"])).toThrow(/duplicate/i);
    expect(() => parseComparisonSymbolList(["rAAPL", "!!!"])).toThrow(/invalid symbol/i);
  });

  it("accepts distinct rToken forms", () => {
    const parsed = parseComparisonSymbolList(["rAAPL", "nvda"]);
    expect(parsed.map((item) => item.pair)).toEqual(["RAAPLUSDT", "RNVDAUSDT"]);
  });
});

describe("multi-symbol comparison assembly", () => {
  it("keeps independent snapshot ids and timestamps", () => {
    const apple = packFor("rAAPL", appleAt);
    const nvidia = packFor("rNVDA", nvidiaAt);
    const down = claim("price.change24h", { sign: "down" });
    const report = assembleComparisonReport({
      createdAt,
      claims: [down],
      symbols: [
        { requestedSymbol: "rAAPL", pack: apple.pack, brief: apple.brief },
        { requestedSymbol: "rNVDA", pack: nvidia.pack, brief: nvidia.brief },
      ],
    });
    expect(report.milestone).toBe("9-multi-symbol-comparison");
    expect(report.advisory).toBe(false);
    expect(report.createdAt).toBe(createdAt);
    expect(report.symbols[0]?.snapshot?.retrievedAt).toBe(appleAt.toISOString());
    expect(report.symbols[1]?.snapshot?.retrievedAt).toBe(nvidiaAt.toISOString());
    expect(report.symbols[0]?.snapshot?.id).not.toBe(report.symbols[1]?.snapshot?.id);
    expect(report.createdAt).not.toBe(report.symbols[0]?.snapshot?.retrievedAt);
  });

  it("scores the same shared claim only against each symbol's own pack", () => {
    const apple = packFor("rAAPL", appleAt);
    const nvidia = packFor("rNVDA", nvidiaAt);
    const down = claim("price.change24h", { sign: "down" });
    const report = assembleComparisonReport({
      createdAt,
      claims: [down],
      symbols: [
        { requestedSymbol: "rAAPL", pack: apple.pack, brief: apple.brief },
        { requestedSymbol: "rNVDA", pack: nvidia.pack, brief: nvidia.brief },
      ],
    });
    const row = report.table[0];
    expect(row?.cells.RAAPLUSDT?.status).toBe("supported");
    expect(row?.cells.RNVDAUSDT?.status).toBe("challenged");
    expect(row?.cells.RAAPLUSDT?.evidenceIds).toContain(EVIDENCE_IDS.priceChange24h);
    expect(row?.cells.RNVDAUSDT?.evidenceIds).toContain(EVIDENCE_IDS.priceChange24h);
  });

  it("keeps news UNKNOWN as unsupported, not false, on every column", () => {
    const apple = packFor("rAAPL", appleAt);
    const nvidia = packFor("rNVDA", nvidiaAt);
    const news = claim("news.catalyst", { attribution: "earnings" });
    const report = assembleComparisonReport({
      createdAt,
      claims: [news],
      symbols: [
        { requestedSymbol: "rAAPL", pack: apple.pack, brief: apple.brief },
        { requestedSymbol: "rNVDA", pack: nvidia.pack, brief: nvidia.brief },
      ],
    });
    for (const column of report.symbols) {
      expect(column.contextSummary?.referencePrice?.classification).toBe("UNKNOWN");
      const newsItem = column.pack?.items.find((item) => item.id === EVIDENCE_IDS.newsContext);
      expect(newsItem?.classification).toBe("UNKNOWN");
    }
    const row = report.table[0];
    expect(row?.cells.RAAPLUSDT?.status).toBe("unsupported");
    expect(row?.cells.RNVDAUSDT?.status).toBe("unsupported");
    expect(row?.cells.RAAPLUSDT?.reasoning).toMatch(/not proof|not a verified fact/i);
  });

  it("preserves partial failures and does not fill a missing column from another symbol", () => {
    const apple = packFor("rAAPL", appleAt, { failures: [{ resource: "candles", message: "timeout" }], candles: null });
    const down = claim("price.change24h", { sign: "down" });
    const report = assembleComparisonReport({
      createdAt,
      claims: [down],
      symbols: [
        { requestedSymbol: "rAAPL", pack: apple.pack, brief: apple.brief },
        { requestedSymbol: "rNVDA", error: "snapshot timeout" },
      ],
    });
    expect(report.symbols[0]?.loadStatus).toBe("loaded");
    expect(report.symbols[0]?.failures.some((item) => item.resource === "candles")).toBe(true);
    expect(report.symbols[1]?.loadStatus).toMatch(/failed|missing/);
    expect(report.table[0]?.cells.RNVDAUSDT?.status).toBe("unavailable");
    expect(report.table[0]?.cells.RAAPLUSDT?.status).toBe("supported");
    expect(report.symbols[1]?.pack).toBeNull();
  });

  it("preserves stale evidence on the affected symbol only", () => {
    const staleTicker: RealityTicker = {
      ...(baseRaw("rAAPL", appleAt).ticker as RealityTicker),
      sourceTimestampMs: appleAt.getTime() - 45_000,
      sourceTimestamp: new Date(appleAt.getTime() - 45_000).toISOString(),
    };
    const apple = packFor("rAAPL", appleAt, { ticker: staleTicker });
    const nvidia = packFor("rNVDA", nvidiaAt);
    const report = assembleComparisonReport({
      createdAt,
      claims: [claim("price.change24h", { sign: "down" })],
      symbols: [
        { requestedSymbol: "rAAPL", pack: apple.pack, brief: apple.brief },
        { requestedSymbol: "rNVDA", pack: nvidia.pack, brief: nvidia.brief },
      ],
    });
    expect(report.symbols[0]?.snapshot?.stale).toBe(true);
    expect(report.symbols[1]?.snapshot?.stale).toBe(false);
  });

  it("does not import a live Bitget fetch in the assembler", () => {
    const source = assembleModule.assembleComparisonReport.toString();
    expect(source).not.toMatch(/getEvidencePack|getMarketSnapshot|fetch\(/);
  });
});

describe("comparison serializers", () => {
  it("writes json, markdown, and escaped html without rankings or fabricated tape", () => {
    const apple = packFor("rAAPL", appleAt);
    const nvidia = packFor("rNVDA", nvidiaAt);
    const report = assembleComparisonReport({
      createdAt,
      claims: [claim("price.change24h", { sign: "down" })],
      freeText: 'The moon phase confirms <script>alert("x")</script>.',
      symbols: [
        { requestedSymbol: "rAAPL", pack: apple.pack, brief: apple.brief },
        { requestedSymbol: "rNVDA", pack: nvidia.pack, brief: nvidia.brief },
      ],
    });
    const markdown = serializeComparisonReportMarkdown(report);
    const json = serializeComparisonReportJson(report);
    const html = serializeComparisonReportHtml(report);
    expect(markdown).toMatch(/Report created: 2026-09-17T15:05:00.000Z/);
    expect(markdown).toMatch(/15:00:00.000Z/);
    expect(markdown).toMatch(/15:00:12.000Z/);
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain('<script>alert("x")</script>');
    expect(html).toMatch(/window\.print/);
    expect(`${markdown}\n${json}\n${html}`).not.toMatch(RANKING_RE);
    expect(`${markdown}\n${json}\n${html}`).not.toMatch(FABRICATION_RE);
    const parsed = JSON.parse(json);
    expect(parsed.advisory).toBe(false);
    expect(parsed.symbols).toHaveLength(2);
  });

  it("redacts secrets and rejects incomplete input", () => {
    const sanitized = sanitizeForExport({ apiKey: "should-not-survive", note: "ok" });
    expect(JSON.stringify(sanitized)).not.toMatch(/should-not-survive/);
    expect(() => parseComparisonInput({ claims: [{ kind: "price.change24h", fields: { sign: "down" } }] })).toThrow(
      /2 or more|at least/i,
    );
    expect(() =>
      parseComparisonInput({
        symbols: ["rAAPL", "rNVDA"],
        claims: [],
      }),
    ).toThrow(/structured claim or optional free-text/i);
    const apple = packFor("rAAPL", appleAt);
    expect(() =>
      parseComparisonInput({
        symbols: [
          { requestedSymbol: "rAAPL", pack: apple.pack },
          { requestedSymbol: "rNVDA", error: "missing" },
        ],
        claims: [{ kind: "price.change24h", fields: { sign: "down" } }],
      }),
    ).toThrow(/brief from the same loaded snapshot/i);
  });
});
