import { describe, expect, it } from "vitest";
import { buildEvidencePack } from "@/lib/evidence/pack";
import { EVIDENCE_IDS } from "@/lib/evidence/types";
import { buildInvestigationBrief } from "@/lib/brief/generate";
import { normalizeMarketContext } from "@/lib/market/normalize";
import type { MarketRawInput } from "@/lib/market/types";
import type { RealityTicker } from "@/lib/bitget/types";
import { buildComposerChallenge } from "@/lib/composer/challenge";
import { createStructuredClaim } from "@/lib/composer/validate";
import { buildThesisRevision } from "@/lib/revision/diff";
import type { StructuredClaim } from "@/lib/challenge/types";
import {
  assembleInvestigationReport,
  escapeHtml,
  parseReportInput,
  sanitizeForExport,
  serializeInvestigationReportHtml,
  serializeInvestigationReportJson,
  serializeInvestigationReportMarkdown,
} from "@/lib/report";

const retrievedAt = new Date("2026-09-17T15:00:00.000Z");
const createdAt = "2026-09-17T15:05:00.000Z";
const FABRICATION_RE =
  /NYSE print showed|NASDAQ print of|Bloomberg reports|should buy|should sell|buy this|sell this|price will|price target|I recommend/i;

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

function claim(kind: StructuredClaim["kind"], fields: Record<string, string>, index = 0): StructuredClaim {
  return { ...createStructuredClaim(kind as never, index, retrievedAt.toISOString()), fields };
}

function investigation(overrides: Partial<MarketRawInput> = {}) {
  const context = normalizeMarketContext(baseRaw(overrides));
  const pack = buildEvidencePack(context);
  const brief = buildInvestigationBrief(pack);
  const first = buildComposerChallenge({
    pack,
    brief,
    claims: [claim("price.change24h", { sign: "down" }, 0), claim("news.catalyst", { attribution: "earnings" }, 1)],
    freeText: 'The moon phase confirms <script>alert("x")</script> the move.',
  });
  const second = buildComposerChallenge({
    pack,
    brief,
    claims: [claim("price.change24h", { sign: "up" }, 0), claim("reference.tape", { comparison: "cheap" }, 1)],
    freeText: 'The moon phase confirms <script>alert("x")</script> the move.',
  });
  const revision = buildThesisRevision({
    previous: first,
    current: second,
    sequence: 1,
    createdAt,
  });
  return { context, pack, brief, first, second, revision };
}

describe("investigation report assembly", () => {
  it("assembles from existing models without inventing a snapshot id", () => {
    const { context, pack, brief, second, revision } = investigation();
    const report = assembleInvestigationReport({
      pack,
      brief,
      context,
      challenge: second,
      revisions: [revision],
      createdAt,
    });
    expect(report.milestone).toBe("8-investigation-report-export");
    expect(report.advisory).toBe(false);
    expect(report.createdAt).toBe(createdAt);
    expect(report.snapshot.retrievedAt).toBe(pack.investigation.retrievedAt);
    expect(report.createdAt).not.toBe(report.snapshot.retrievedAt);
    expect(report.snapshot.id).toBe(`${pack.investigation.pair}|${pack.investigation.retrievedAt}`);
    expect(report.pack.investigation.retrievedAt).toBe(pack.investigation.retrievedAt);
    expect(report.pack.items.map((item) => item.id)).toEqual(pack.items.map((item) => item.id));
    expect(report.brief.advisory).toBe(false);
    expect(report.challenge?.retrievedAt).toBe(pack.investigation.retrievedAt);
    expect(report.revisions).toHaveLength(1);
    expect(report.revisions[0]?.snapshotChanged).toBe(false);
  });

  it("preserves classifications, citations, timestamps, and freshness", () => {
    const { pack, brief, second } = investigation();
    const report = assembleInvestigationReport({ pack, brief, challenge: second, createdAt });
    const last = pack.items.find((item) => item.id === EVIDENCE_IDS.priceLast);
    const exported = report.pack.items.find((item) => item.id === EVIDENCE_IDS.priceLast);
    expect(exported?.classification).toBe(last?.classification);
    expect(exported?.sources[0]?.observedAt).toBe(last?.sources[0]?.observedAt);
    expect(exported?.sources[0]?.freshnessSeconds).toBe(last?.sources[0]?.freshnessSeconds);
    expect(report.contextSummary.lastPrice?.classification).toBe(last?.classification);
    expect(report.contextSummary.referencePrice?.classification).toBe("UNKNOWN");
    for (const tension of report.tensions) {
      for (const id of tension.evidenceIds) {
        expect(report.citations[id] || pack.items.some((item) => item.id === id)).toBeTruthy();
      }
    }
    for (const assessment of report.challenge?.assessments ?? []) {
      for (const id of assessment.evidenceIds) {
        expect(pack.items.some((item) => item.id === id)).toBe(true);
      }
    }
  });

  it("keeps revision attribution and does not treat a status change as a score", () => {
    const { pack, brief, second, revision } = investigation();
    const report = assembleInvestigationReport({
      pack,
      brief,
      challenge: second,
      revisions: [revision],
      createdAt,
    });
    expect(report.revisions[0]?.claims.some((item) => item.attribution === "thesis-edit" || item.change === "edited")).toBe(
      true,
    );
    expect(report.revisions[0]?.snapshotChanged).toBe(false);
    expect(JSON.stringify(report.revisions)).not.toMatch(/now a buy|should buy|should sell|price will|price target/i);
  });

  it("preserves partial failures without treating them as disproof", () => {
    const { pack, brief } = investigation({
      failures: [{ resource: "candles", message: "timeout" }],
      candles: null,
    });
    const report = assembleInvestigationReport({ pack, brief, createdAt });
    expect(report.failures.some((item) => item.resource === "candles")).toBe(true);
    expect(report.contextSummary.referencePrice?.classification).toBe("UNKNOWN");
    expect(JSON.stringify(report)).not.toMatch(/therefore the thesis is false/i);
  });

  it("labels stale evidence instead of replacing it", () => {
    const staleTicker: RealityTicker = {
      ...(baseRaw().ticker as RealityTicker),
      sourceTimestampMs: retrievedAt.getTime() - 45_000,
      sourceTimestamp: new Date(retrievedAt.getTime() - 45_000).toISOString(),
    };
    const { pack, brief } = investigation({ ticker: staleTicker });
    const report = assembleInvestigationReport({ pack, brief, createdAt });
    expect(report.snapshot.stale).toBe(true);
    expect(report.snapshot.warning).toMatch(/stale/i);
    expect(report.snapshot.staleEvidenceIds.length).toBeGreaterThan(0);
  });
});

describe("report serialization", () => {
  it("writes markdown and json without fabricating tape, news, or trades", () => {
    const { pack, brief, second, revision } = investigation();
    const report = assembleInvestigationReport({
      pack,
      brief,
      challenge: second,
      revisions: [revision],
      createdAt,
    });
    const markdown = serializeInvestigationReportMarkdown(report);
    const json = serializeInvestigationReportJson(report);
    expect(markdown).toMatch(/Report created: 2026-09-17T15:05:00.000Z/);
    expect(markdown).toMatch(/Evidence snapshot retrieved: 2026-09-17T15:00:00.000Z/);
    expect(markdown).toMatch(/reference.price/);
    expect(markdown).not.toMatch(FABRICATION_RE);
    expect(json).not.toMatch(FABRICATION_RE);
    const parsed = JSON.parse(json);
    expect(parsed.advisory).toBe(false);
    expect(parsed.pack.items[0].classification).toMatch(/FACT|INFERENCE|ASSUMPTION|UNKNOWN/);
  });

  it("escapes HTML from free-text and evidence claims", () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    const { pack, brief, second } = investigation();
    const report = assembleInvestigationReport({ pack, brief, challenge: second, createdAt });
    const html = serializeInvestigationReportHtml(report);
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain('<script>alert("x")</script>');
    expect(html).toMatch(/window\.print/);
    expect(html).not.toMatch(FABRICATION_RE);
  });

  it("redacts secrets and rejects empty export input", () => {
    const { pack, brief } = investigation();
    const sanitized = sanitizeForExport({
      apiKey: "should-not-survive",
      BITGET_PASSPHRASE: "nope",
      note: "BITGET_API_KEY=abcd",
    });
    expect(JSON.stringify(sanitized)).not.toMatch(/should-not-survive|\bnope\b|BITGET_API_KEY=abcd/);
    expect(() => parseReportInput({})).toThrow(/evidence pack/i);
    expect(() => parseReportInput({ pack })).toThrow(/investigation brief/i);
    expect(assembleInvestigationReport({ pack, brief, createdAt }).advisory).toBe(false);
  });
});
