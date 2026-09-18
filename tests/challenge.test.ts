import { describe, expect, it } from "vitest";
import { buildEvidencePack } from "@/lib/evidence/pack";
import { EVIDENCE_IDS } from "@/lib/evidence/types";
import { buildInvestigationBrief } from "@/lib/brief/generate";
import { buildInterpretationChallenge, parseThesisInput } from "@/lib/challenge/engine";
import { matchClaimRules, CLAIM_RULES } from "@/lib/challenge/rules";
import { splitClaimText } from "@/lib/challenge/split";
import { normalizeMarketContext } from "@/lib/market/normalize";
import type { MarketRawInput } from "@/lib/market/types";
import type { RealityTicker, SessionSnapshot } from "@/lib/bitget/types";
import type { InterpretationChallenge } from "@/lib/challenge/types";

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

function challengeFrom(
  thesis: string,
  overrides: Partial<MarketRawInput> = {},
  extra: { reason?: string; assumptions?: string[] } = {},
) {
  const pack = buildEvidencePack(normalizeMarketContext(baseRaw(overrides)));
  const brief = buildInvestigationBrief(pack);
  return {
    pack,
    brief,
    challenge: buildInterpretationChallenge({
      pack,
      brief,
      input: { thesis, reason: extra.reason, assumptions: extra.assumptions },
    }),
  };
}

function statuses(challenge: InterpretationChallenge) {
  return challenge.assessments.map((item) => ({
    kind: item.kind,
    status: item.status,
    ruleId: item.ruleId,
    text: item.text,
  }));
}

const ENGINE_FABRICATION_RE =
  /NYSE print showed|NASDAQ print of|Bloomberg reports|Reuters reports|should buy|should sell|buy this|sell this|price will|price target|I recommend/i;

describe("claim splitting and matching", () => {
  it("splits thesis sentences on punctuation and newlines", () => {
    expect(splitClaimText("rAAPL fell. Buy it.\nThe moon is a signal.")).toEqual([
      "rAAPL fell.",
      "Buy it.",
      "The moon is a signal.",
    ]);
  });

  it("exposes transparent claim rules", () => {
    expect(CLAIM_RULES.map((rule) => rule.id)).toEqual(
      expect.arrayContaining([
        "rule.price.direction",
        "rule.causation",
        "rule.reference.tape",
        "rule.trade.action",
      ]),
    );
  });

  it("matches directional, causal, tape, and trade language", () => {
    const pack = buildEvidencePack(normalizeMarketContext(baseRaw()));
    const hits = matchClaimRules(
      "rAAPL fell because of earnings and is cheap versus the US stock. Buy it.",
      pack,
    );
    expect(hits.map((hit) => hit.kind).sort()).toEqual(
      ["causation", "price.direction", "reference.tape", "trade.action"].sort(),
    );
    expect(hits.find((hit) => hit.kind === "price.direction")?.polarity).toBe("down");
  });
});

describe("buildInterpretationChallenge", () => {
  it("supports a down claim when 24h change is negative", () => {
    const { challenge, pack } = challengeFrom("rAAPL fell.");
    const direction = challenge.assessments.find((item) => item.kind === "price.direction");
    expect(direction?.status).toBe("supported");
    expect(direction?.evidenceIds).toContain(EVIDENCE_IDS.priceChange24h);
    expect(direction?.supportingEvidence[0]?.evidenceId).toBe(EVIDENCE_IDS.priceChange24h);
    expect(pack.items.some((item) => item.id === EVIDENCE_IDS.priceChange24h)).toBe(true);
  });

  it("challenges an up claim when 24h change is negative", () => {
    const { challenge } = challengeFrom("rAAPL rose.");
    const direction = challenge.assessments.find((item) => item.kind === "price.direction");
    expect(direction?.status).toBe("challenged");
    expect(direction?.challengingEvidence[0]?.evidenceId).toBe(EVIDENCE_IDS.priceChange24h);
    expect(direction?.reasoning).not.toMatch(/false because there is no news/i);
  });

  it("supports an up claim when 24h change is positive", () => {
    const ticker: RealityTicker = {
      ...(baseRaw().ticker as RealityTicker),
      change24hPercentNumber: 0.012,
    };
    const { challenge } = challengeFrom("rAAPL is up.", { ticker });
    expect(challenge.assessments.find((item) => item.kind === "price.direction")?.status).toBe("supported");
  });

  it("labels causation and news as unsupported, not false", () => {
    const { challenge } = challengeFrom("rAAPL moved because of earnings news.");
    const causation = challenge.assessments.find((item) => item.kind === "causation");
    expect(causation?.status).toBe("unsupported");
    expect(causation?.evidenceIds).toEqual(
      expect.arrayContaining([EVIDENCE_IDS.newsContext, EVIDENCE_IDS.priceChange24h]),
    );
    expect(causation?.reasoning).toMatch(/not proof that the claimed cause is false/i);
    expect(challenge.assessments.every((item) => item.status !== "unassessed" || item.kind === null)).toBe(true);
  });

  it("labels cheap-versus-stock as unsupported without a US tape", () => {
    const { challenge } = challengeFrom("rAAPL is cheap versus the US stock.");
    const tape = challenge.assessments.find((item) => item.kind === "reference.tape");
    expect(tape?.status).toBe("unsupported");
    expect(tape?.evidenceIds).toContain(EVIDENCE_IDS.referencePrice);
    expect(tape?.reasoning).toMatch(/not shown to be wrong/i);
  });

  it("leaves unmatched natural language unassessed, not false", () => {
    const { challenge } = challengeFrom("The moon phase confirms the move.");
    expect(challenge.assessments).toHaveLength(1);
    expect(challenge.assessments[0]?.status).toBe("unassessed");
    expect(challenge.assessments[0]?.requiresClarification).toBe(true);
    expect(challenge.assessments[0]?.ruleId).toBeNull();
    expect(challenge.assessments[0]?.reasoning).toMatch(/not labeled false/i);
  });

  it("does not assess buy/sell language", () => {
    const { challenge } = challengeFrom("Buy rAAPL and sell the laggards.");
    const trades = challenge.assessments.filter((item) => item.kind === "trade.action");
    expect(trades.length).toBeGreaterThan(0);
    expect(trades.every((item) => item.status === "unassessed")).toBe(true);
    expect(trades.every((item) => ENGINE_FABRICATION_RE.test(item.reasoning) === false)).toBe(true);
  });

  it("keeps submitted assumptions and surfaces implied ones", () => {
    const { challenge } = challengeFrom("rAAPL is cheap versus the US stock.", {}, {
      assumptions: ["The last print is current."],
    });
    expect(challenge.traderAssumptions.some((item) => item.origin === "submitted" && /last print is current/i.test(item.text))).toBe(true);
    expect(challenge.traderAssumptions.some((item) => item.origin === "implied" && /reference tape/i.test(item.text))).toBe(true);
    const freshness = challenge.assessments.find((item) => item.kind === "freshness.current");
    expect(freshness?.source).toBe("assumption");
  });

  it("surfaces unknowns, caveats, and tensions in What Am I Missing", () => {
    const { challenge } = challengeFrom("rAAPL fell because of news.");
    expect(challenge.whatAmIMissing.some((item) => item.kind === "unknown")).toBe(true);
    expect(challenge.whatAmIMissing.some((item) => item.kind === "tension")).toBe(true);
    expect(challenge.whatAmIMissing.some((item) => item.kind === "does-not-establish")).toBe(true);
    expect(challenge.whatAmIMissing.some((item) => item.evidenceIds.includes(EVIDENCE_IDS.newsContext))).toBe(true);
  });

  it("keeps every cited evidence ID inside the pack", () => {
    const { challenge, pack } = challengeFrom(
      "rAAPL fell because of earnings and is cheap versus the US stock. Buy it. The moon phase confirms the move.",
      {},
      { reason: "The public book is liquid Reality depth.", assumptions: ["The last print is current."] },
    );
    const known = new Set(pack.items.map((item) => item.id));
    for (const assessment of challenge.assessments) {
      for (const id of assessment.evidenceIds) {
        expect(known.has(id)).toBe(true);
      }
    }
    for (const id of Object.keys(challenge.citations)) {
      expect(known.has(id)).toBe(true);
    }
    for (const attack of challenge.attackMyThesis) {
      expect(attack.invented).toBe(false);
      for (const id of attack.evidenceIds) {
        expect(known.has(id)).toBe(true);
      }
    }
  });

  it("challenges a current-print claim when last price is stale", () => {
    const ticker: RealityTicker = {
      ...(baseRaw().ticker as RealityTicker),
      sourceTimestampMs: retrievedAt.getTime() - 45_000,
      sourceTimestamp: new Date(retrievedAt.getTime() - 45_000).toISOString(),
    };
    const { challenge } = challengeFrom("The current last price is live right now.", { ticker });
    const freshness = challenge.assessments.find((item) => item.kind === "freshness.current");
    expect(freshness?.status).toBe("challenged");
    expect(freshness?.challengingEvidence.some((item) => item.evidenceId === EVIDENCE_IDS.priceLast)).toBe(true);
    expect(freshness?.challengingEvidence[0]?.status).toBe("stale");
    expect(freshness?.challengingEvidence[0]?.freshnessSeconds).toBeGreaterThan(15);
  });

  it("treats a directional claim as unsupported when the ticker failed, not as false", () => {
    const { challenge } = challengeFrom("rAAPL rose.", {
      ticker: null,
      tickerError: "timeout",
      failures: [{ resource: "ticker", message: "timeout" }],
    });
    const direction = challenge.assessments.find((item) => item.kind === "price.direction");
    expect(direction?.status).toBe("unsupported");
    expect(direction?.reasoning).toMatch(/not shown to be false/i);
    expect(challenge.failures).toHaveLength(1);
    expect(challenge.whatAmIMissing.some((item) => item.kind === "failure")).toBe(true);
    expect(JSON.stringify(challenge.attackMyThesis)).not.toMatch(/therefore the thesis is false/i);
  });

  it("does not invent opposing US tape, news, or prices in attack points", () => {
    const { challenge } = challengeFrom("rAAPL rose because Apple is cheap versus the tape.");
    const blob = JSON.stringify(challenge.attackMyThesis);
    expect(blob).not.toMatch(ENGINE_FABRICATION_RE);
    expect(challenge.attackMyThesis.every((point) => point.invented === false)).toBe(true);
    expect(challenge.attackMyThesis.every((point) => point.evidenceIds.length > 0)).toBe(true);
    expect(blob).not.toMatch(/US tape shows|news says otherwise|stock printed/i);
  });

  it("does not emit buy/sell recommendations or price predictions", () => {
    const { challenge } = challengeFrom("Buy rAAPL; it will go to 400 because of earnings.");
    const generated = JSON.stringify({
      assessments: challenge.assessments.map((item) => item.reasoning),
      attack: challenge.attackMyThesis,
      missing: challenge.whatAmIMissing,
      limitations: challenge.limitations,
    });
    expect(challenge.advisory).toBe(false);
    expect(challenge.milestone).toBe("5-interpretation-challenge");
    expect(generated).not.toMatch(ENGINE_FABRICATION_RE);
    expect(challenge.assessments.find((item) => item.kind === "trade.action")?.status).toBe("unassessed");
    expect(challenge.limitations.some((line) => /not a trade recommendation/i.test(line))).toBe(true);
  });

  it("does not treat uncertainty as proof against the thesis", () => {
    const { challenge } = challengeFrom("rAAPL fell because of earnings.");
    const attack = challenge.attackMyThesis.find(
      (item) => /without a cause/i.test(item.title) || /does not establish why price moved/i.test(item.text),
    );
    expect(attack).toBeTruthy();
    expect(attack?.text).toMatch(/not treated as proof the thesis is false/i);
    const causation = challenge.assessments.find((item) => item.kind === "causation");
    expect(causation?.status).toBe("unsupported");
  });

  it("marks negated directional language as unassessed", () => {
    const { challenge } = challengeFrom("rAAPL has not fallen.");
    const direction = challenge.assessments.find((item) => item.kind === "price.direction");
    expect(direction?.status).toBe("unassessed");
    expect(direction?.requiresClarification).toBe(true);
  });

  it("limits a convention underlying instead of treating it as a verified listing", () => {
    const { challenge } = challengeFrom("This token tracks the AAPL underlying.", { stock: null });
    const named = challenge.assessments.find((item) => item.kind === "underlying.named");
    expect(named?.status).toBe("challenged");
    expect(named?.challengingEvidence[0]?.classification).toBe("ASSUMPTION");
  });

  it("supports an explicit US-closed claim against derived overnight session", () => {
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
    const { challenge } = challengeFrom("The US stock market is closed.", { session });
    const sessionClaim = challenge.assessments.find((item) => item.kind === "session.us");
    expect(sessionClaim?.status).toBe("supported");
    expect(sessionClaim?.evidenceIds).toContain(EVIDENCE_IDS.sessionCurrent);
  });

  it("challenges a US-open claim when the derived session is closed", () => {
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
    const { challenge } = challengeFrom("The US stock market is open.", { session });
    expect(challenge.assessments.find((item) => item.kind === "session.us")?.status).toBe("challenged");
  });

  it("preserves source timestamps and caveats on evidence refs", () => {
    const { challenge } = challengeFrom("rAAPL fell.");
    const support = challenge.assessments[0]?.supportingEvidence[0];
    expect(support?.observedAt).toBeTruthy();
    expect(support?.caveats.length).toBeGreaterThan(0);
    expect(support?.sources[0]?.field).toBeTruthy();
  });
});

describe("parseThesisInput", () => {
  it("requires a thesis", () => {
    expect(() => parseThesisInput({})).toThrow(/thesis/i);
    expect(() => parseThesisInput({ thesis: "   " })).toThrow(/thesis/i);
  });

  it("accepts assumptions as a newline string", () => {
    const input = parseThesisInput({ thesis: "rAAPL fell.", assumptions: "Last print is current.\nBook is deep." });
    expect(input.assumptions).toEqual(["Last print is current.", "Book is deep."]);
  });
});

describe("status distinctions", () => {
  it("keeps supported, challenged, unsupported, and unassessed distinct on a mixed thesis", () => {
    const { challenge } = challengeFrom(
      "rAAPL fell because of earnings and is cheap versus the US stock. Buy it. The moon phase confirms the move.",
    );
    const byKind = Object.fromEntries(
      challenge.assessments.map((item) => [item.kind ?? "unmapped", item.status]),
    );
    expect(byKind["price.direction"]).toBe("supported");
    expect(byKind.causation).toBe("unsupported");
    expect(byKind["reference.tape"]).toBe("unsupported");
    expect(byKind["trade.action"]).toBe("unassessed");
    expect(byKind.unmapped).toBe("unassessed");
    expect(statuses(challenge).some((item) => item.status === "challenged")).toBe(false);
  });
});
