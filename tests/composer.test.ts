import { describe, expect, it } from "vitest";
import { buildEvidencePack } from "@/lib/evidence/pack";
import { EVIDENCE_IDS } from "@/lib/evidence/types";
import { buildInvestigationBrief } from "@/lib/brief/generate";
import { normalizeMarketContext } from "@/lib/market/normalize";
import type { MarketRawInput } from "@/lib/market/types";
import type { RealityTicker } from "@/lib/bitget/types";
import { buildComposerChallenge } from "@/lib/composer/challenge";
import { createStructuredClaim, parseComposerInput, validateStructuredClaim } from "@/lib/composer/validate";
import { STRUCTURED_CLAIM_KINDS, STRUCTURED_KIND_DEFS } from "@/lib/composer/schema";
import { renderStructuredClaim } from "@/lib/composer/render";
import { buildThesisRevision } from "@/lib/revision/diff";
import { extractClaimUnits } from "@/lib/revision/claims";
import { matchClaimUnits } from "@/lib/revision/match";
import type { StructuredClaim } from "@/lib/challenge/types";

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

function claim(kind: StructuredClaim["kind"], fields: Record<string, string>, index = 0): StructuredClaim {
  return { ...createStructuredClaim(kind as never, index, retrievedAt.toISOString()), fields };
}

function composerFrom(claims: StructuredClaim[], overrides: Partial<MarketRawInput> = {}, extra: { freeText?: string } = {}) {
  const pack = buildEvidencePack(normalizeMarketContext(baseRaw(overrides)));
  const brief = buildInvestigationBrief(pack);
  return {
    pack,
    challenge: buildComposerChallenge({ pack, brief, claims, freeText: extra.freeText }),
  };
}

describe("structured claim validation", () => {
  it("defines every required kind with permitted fields", () => {
    expect(STRUCTURED_KIND_DEFS.map((item) => item.kind)).toEqual([...STRUCTURED_CLAIM_KINDS]);
    for (const def of STRUCTURED_KIND_DEFS) {
      expect(def.fields.length).toBeGreaterThan(0);
      expect(def.limitation.length).toBeGreaterThan(0);
    }
  });

  it("rejects unknown kinds and illegal field values", () => {
    expect(() => validateStructuredClaim({ kind: "buy.now", fields: {} })).toThrow(/unknown kind/i);
    expect(() => validateStructuredClaim({ kind: "price.direction", fields: { direction: "sideways", timeframe: "24h" } })).toThrow(
      /not permitted/i,
    );
    expect(() => parseComposerInput({ claims: [] })).toThrow(/structured claim or optional free-text/i);
  });

  it("accepts each kind with required fields", () => {
    const samples: Array<[string, Record<string, string>]> = [
      ["price.direction", { direction: "down", timeframe: "24h" }],
      ["price.change24h", { sign: "down" }],
      ["session.us", { state: "closed" }],
      ["underlying.named", { relationship: "tracks", code: "AAPL" }],
      ["reference.tape", { comparison: "cheap" }],
      ["news.catalyst", { attribution: "earnings" }],
      ["liquidity.spread", { aspect: "executable-liquidity" }],
      ["depth.book", { book: "reality-40" }],
      ["other.freetext", { text: "The moon phase confirms the move." }],
    ];
    for (const [kind, fields] of samples) {
      const parsed = validateStructuredClaim({ kind, fields, id: `sc.${kind}` });
      expect(parsed.kind).toBe(kind);
      expect(renderStructuredClaim(parsed).text.length).toBeGreaterThan(0);
    }
  });

  it("keeps optional free-text without requiring structured rows", () => {
    const parsed = parseComposerInput({ freeText: "The moon phase confirms the move." });
    expect(parsed.claims).toEqual([]);
    expect(parsed.freeText).toBe("The moon phase confirms the move.");
  });
});

describe("structured-to-engine mapping", () => {
  it("scores 24h direction against price.change24h and does not auto-support from kind", () => {
    const { challenge } = composerFrom([claim("price.change24h", { sign: "down" })]);
    const row = challenge.assessments.find((item) => item.structuredClaimId);
    expect(row?.status).toBe("supported");
    expect(row?.evidenceIds).toContain(EVIDENCE_IDS.priceChange24h);
    const up = composerFrom([claim("price.change24h", { sign: "up" })]).challenge.assessments[0];
    expect(up?.status).toBe("challenged");
  });

  it("leaves intraday and unspecified direction unassessed instead of using 24h change", () => {
    const { challenge } = composerFrom([claim("price.direction", { direction: "down", timeframe: "intraday" })]);
    expect(challenge.assessments[0]?.status).toBe("unassessed");
    expect(challenge.assessments[0]?.reasoning).toMatch(/not 24h/i);
    expect(challenge.assessments[0]?.structuredClaimId).toBeTruthy();
    const unspecified = composerFrom([
      claim("price.direction", { direction: "up", timeframe: "unspecified" }),
    ]).challenge.assessments[0];
    expect(unspecified?.status).toBe("unassessed");
  });

  it("does not treat a selected news kind as a verified fact", () => {
    const { challenge } = composerFrom([claim("news.catalyst", { attribution: "news" })]);
    expect(challenge.assessments[0]?.status).toBe("unsupported");
    expect(challenge.assessments[0]?.reasoning).toMatch(/Selecting this claim type does not make it a verified fact/i);
    expect(challenge.assessments[0]?.reasoning).toMatch(/not proof|not disproven/i);
  });

  it("keeps news, tape, and Reality depth unsupported — not false", () => {
    const { challenge } = composerFrom([
      claim("news.catalyst", { attribution: "earnings" }, 0),
      claim("reference.tape", { comparison: "cheap" }, 1),
      claim("depth.book", { book: "reality-40" }, 2),
    ]);
    const news = challenge.assessments.find((item) => item.kind === "causation");
    const tape = challenge.assessments.find((item) => item.kind === "reference.tape");
    const depth = challenge.assessments.find((item) => item.kind === "depth.reality");
    expect(news?.status).toBe("unsupported");
    expect(tape?.status).toBe("unsupported");
    expect(depth?.status).toBe("unsupported");
    expect(news?.reasoning).toMatch(/not proof/i);
    expect(tape?.reasoning).toMatch(/not shown to be wrong|does not supply that tape/i);
  });

  it("does not treat executable liquidity as supported from the claim type", () => {
    const { challenge } = composerFrom([claim("liquidity.spread", { aspect: "executable-liquidity" })]);
    expect(challenge.assessments[0]?.status).toBe("unsupported");
    expect(challenge.assessments[0]?.evidenceIds).toContain(EVIDENCE_IDS.liquidityModel);
  });

  it("can support an observed derived spread without calling it liquidity", () => {
    const { challenge } = composerFrom([claim("liquidity.spread", { aspect: "spread-observed" })]);
    expect(challenge.assessments[0]?.status).toBe("supported");
    expect(challenge.assessments[0]?.evidenceIds).toContain(EVIDENCE_IDS.bookSpread);
    expect(challenge.assessments[0]?.reasoning).toMatch(/not executable liquidity/i);
  });

  it("supports a public UTA snapshot while limiting Reality depth", () => {
    const { challenge } = composerFrom([claim("depth.book", { book: "public-uta" })]);
    expect(challenge.assessments[0]?.status).toBe("supported");
    expect(challenge.assessments[0]?.evidenceIds).toContain(EVIDENCE_IDS.depthPublicUta);
    expect(challenge.assessments[0]?.reasoning).toMatch(/not whitelist Reality 40-level/i);
  });

  it("keeps free-text compatibility and does not rewrite it", () => {
    const { challenge } = composerFrom([claim("price.change24h", { sign: "down" })], {}, { freeText: "The moon phase confirms the move." });
    expect(challenge.composer?.freeText).toBe("The moon phase confirms the move.");
    expect(challenge.assessments.some((item) => /moon phase/i.test(item.text) && item.status === "unassessed")).toBe(true);
    expect(challenge.input.thesis).toMatch(/moon phase/i);
  });

  it("leaves other/free-text unassessed when no rule matches", () => {
    const { challenge } = composerFrom([
      claim("other.freetext", { text: "The moon phase confirms the move." }),
    ]);
    expect(challenge.assessments[0]?.status).toBe("unassessed");
    expect(challenge.assessments[0]?.text).toMatch(/moon phase/i);
  });

  it("scores a 24h direction claim against change evidence, not as a forecast", () => {
    const { challenge } = composerFrom([
      claim("price.direction", { direction: "down", timeframe: "24h" }),
    ]);
    expect(challenge.assessments[0]?.status).toBe("supported");
    expect(challenge.assessments[0]?.evidenceIds).toContain(EVIDENCE_IDS.priceChange24h);
    expect(challenge.assessments[0]?.reasoning).toMatch(/not a cause|not a verified fact/i);
  });

  it("treats missing 24h change as unsupported, not false", () => {
    const { challenge } = composerFrom([claim("price.change24h", { sign: "down" })], {
      ticker: null,
      tickerError: "timeout",
    });
    const row = challenge.assessments.find((item) => item.structuredClaimId);
    expect(row?.status).toBe("unsupported");
    expect(row?.reasoning).toMatch(/unsupported, not shown to be false|not available/i);
  });

  it("traces every structured evidence id to the pack", () => {
    const { pack, challenge } = composerFrom([
      claim("session.us", { state: "regular" }, 0),
      claim("underlying.named", { relationship: "tracks", code: "AAPL" }, 1),
    ]);
    const known = new Set(pack.items.map((item) => item.id));
    for (const assessment of challenge.assessments) {
      for (const id of assessment.evidenceIds) {
        expect(known.has(id)).toBe(true);
      }
      expect(assessment.structuredClaimId).toBeTruthy();
    }
  });

  it("handles stale and partial evidence without fabricating a tape", () => {
    const staleTicker: RealityTicker = {
      ...(baseRaw().ticker as RealityTicker),
      sourceTimestampMs: retrievedAt.getTime() - 45_000,
      sourceTimestamp: new Date(retrievedAt.getTime() - 45_000).toISOString(),
    };
    const { challenge } = composerFrom(
      [claim("reference.tape", { comparison: "divergence" }), claim("news.catalyst", { attribution: "news" }, 1)],
      {
        ticker: staleTicker,
        tickerError: undefined,
        failures: [{ resource: "candles", message: "timeout" }],
        candles: null,
      },
    );
    expect(challenge.failures.some((item) => item.resource === "candles")).toBe(true);
    expect(challenge.assessments.every((item) => item.status === "unsupported" || item.status === "unassessed" || item.status === "challenged" || item.status === "supported")).toBe(true);
    expect(JSON.stringify(challenge.assessments.map((item) => item.reasoning))).not.toMatch(/NYSE print showed|breaking news confirmed/i);
  });
});

describe("composer revision identity", () => {
  it("preserves structured claim ids across field edits and reorders", () => {
    const down = claim("price.change24h", { sign: "down" }, 0);
    const news = claim("news.catalyst", { attribution: "news" }, 1);
    const first = composerFrom([down, news]);
    const up = { ...down, fields: { sign: "up" } };
    const session = claim("session.us", { state: "open" }, 2);
    const second = composerFrom([session, up]);
    const previousUnits = extractClaimUnits(first.challenge);
    const currentUnits = extractClaimUnits(second.challenge);
    const { matches } = matchClaimUnits(previousUnits, currentUnits);
    expect(matches.some((item) => item.reason === "structuredId" && item.previous.structuredClaimId === down.id)).toBe(true);
    const revision = buildThesisRevision({
      previous: first.challenge,
      current: second.challenge,
      sequence: 1,
      createdAt: retrievedAt.toISOString(),
    });
    expect(revision.claims.some((item) => item.change === "edited" && item.matchReason.includes("structured claim id"))).toBe(true);
    expect(revision.claims.some((item) => item.change === "removed")).toBe(true);
    expect(revision.claims.some((item) => item.change === "added")).toBe(true);
    expect(revision.snapshotChanged).toBe(false);
  });
});
