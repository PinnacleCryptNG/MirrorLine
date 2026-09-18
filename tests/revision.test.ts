import { describe, expect, it } from "vitest";
import { buildEvidencePack } from "@/lib/evidence/pack";
import { buildInvestigationBrief } from "@/lib/brief/generate";
import { buildInterpretationChallenge, parseThesisInput } from "@/lib/challenge/engine";
import { normalizeMarketContext } from "@/lib/market/normalize";
import type { MarketRawInput } from "@/lib/market/types";
import type { RealityTicker } from "@/lib/bitget/types";
import type { InterpretationChallenge } from "@/lib/challenge/types";
import { buildThesisRevision } from "@/lib/revision/diff";
import { extractClaimUnits, fingerprintClaim, joinClaimSentences } from "@/lib/revision/claims";
import { matchClaimUnits } from "@/lib/revision/match";
import { parseRevisionRequest } from "@/lib/revision/get-revision";

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
  return buildInterpretationChallenge({
    pack,
    brief,
    input: { thesis, reason: extra.reason, assumptions: extra.assumptions },
  });
}

function cloneWithSnapshot(
  challenge: InterpretationChallenge,
  retrievedAtIso: string,
  tweak?: (item: InterpretationChallenge) => InterpretationChallenge,
): InterpretationChallenge {
  const next: InterpretationChallenge = {
    ...challenge,
    retrievedAt: retrievedAtIso,
  };
  return tweak ? tweak(next) : next;
}

describe("claim identity matching", () => {
  it("fingerprints ignore punctuation and case", () => {
    expect(fingerprintClaim("rAAPL fell.")).toBe(fingerprintClaim("Raapl Fell"));
  });

  it("joins claim sentences with terminal punctuation", () => {
    expect(joinClaimSentences(["rAAPL fell", "Buy it."])).toBe("rAAPL fell. Buy it.");
  });

  it("keeps identity across reorder", () => {
    const previous = extractClaimUnits(challengeFrom("rAAPL fell. Buy it."));
    const current = extractClaimUnits(challengeFrom("Buy it. rAAPL fell."));
    const { matches, unmatchedPrevious, unmatchedCurrent } = matchClaimUnits(previous, current);
    expect(unmatchedPrevious).toHaveLength(0);
    expect(unmatchedCurrent).toHaveLength(0);
    expect(matches).toHaveLength(2);
    expect(matches.every((match) => match.reason === "exactFingerprint")).toBe(true);
  });

  it("treats a shortened sentence as an edit via containment, not as a new claim", () => {
    const previous = extractClaimUnits(challengeFrom("rAAPL fell because of earnings news."));
    const current = extractClaimUnits(challengeFrom("rAAPL fell."));
    const { matches, unmatchedPrevious, unmatchedCurrent } = matchClaimUnits(previous, current);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.reason).toBe("containment");
    expect(unmatchedPrevious).toHaveLength(0);
    expect(unmatchedCurrent).toHaveLength(0);
  });
});

describe("buildThesisRevision", () => {
  it("records added, removed, edited, and reordered claims", () => {
    const previous = challengeFrom("rAAPL fell. Buy it. The moon phase confirms the move.");
    const current = challengeFrom("Buy it. rAAPL fell today.");
    const revision = buildThesisRevision({ previous, current, sequence: 1, createdAt: retrievedAt.toISOString() });
    expect(revision.milestone).toBe("6-thesis-revision-loop");
    expect(revision.advisory).toBe(false);
    expect(revision.snapshotChanged).toBe(false);
    expect(revision.summary.removed).toBeGreaterThan(0);
    expect(revision.summary.edited + revision.summary.unchanged).toBeGreaterThan(0);
    expect(revision.claims.some((item) => item.reordered)).toBe(true);
    expect(revision.claims.some((item) => item.change === "removed" && /moon phase/i.test(item.previousText ?? ""))).toBe(true);
  });

  it("preserves stable identity for lightly edited directional language", () => {
    const previous = challengeFrom("rAAPL fell because of earnings.");
    const current = challengeFrom("rAAPL rose because of earnings.");
    const revision = buildThesisRevision({ previous, current, sequence: 1, createdAt: retrievedAt.toISOString() });
    const edited = revision.claims.find((item) => item.change === "edited");
    expect(edited).toBeTruthy();
    expect(edited?.statusChanged).toBe(true);
    expect(edited?.attribution).toBe("thesis-edit");
    expect(revision.snapshotChanged).toBe(false);
    expect(revision.summary.added).toBe(0);
    expect(revision.summary.removed).toBe(0);
  });

  it("detects evidence-reference changes on the same snapshot when a kind drops out", () => {
    const previous = challengeFrom("rAAPL fell because of earnings.");
    const current = challengeFrom("rAAPL fell.");
    const revision = buildThesisRevision({ previous, current, sequence: 2, createdAt: retrievedAt.toISOString() });
    const edited = revision.claims.find((item) => item.change === "edited");
    expect(edited?.evidenceRefsChanged).toBe(true);
    expect(edited?.currentAssessments.some((slice) => slice.kind === "causation")).toBe(false);
    expect(edited?.previousAssessments.some((slice) => slice.kind === "causation")).toBe(true);
  });

  it("marks a same-snapshot comparison when retrievedAt is unchanged", () => {
    const previous = challengeFrom("rAAPL fell.");
    const current = challengeFrom("rAAPL fell. The US stock market is open.");
    const revision = buildThesisRevision({ previous, current, sequence: 1, createdAt: retrievedAt.toISOString() });
    expect(revision.previousSnapshot.id).toBe(revision.currentSnapshot.id);
    expect(revision.snapshotChanged).toBe(false);
    expect(revision.snapshotWarning).toBeNull();
    expect(revision.claims.some((item) => item.change === "added")).toBe(true);
  });

  it("warns when the evidence snapshot changed and does not blame the thesis", () => {
    const previous = challengeFrom("rAAPL fell.");
    const current = cloneWithSnapshot(previous, "2026-09-18T16:00:00.000Z", (challenge) => ({
      ...challenge,
      assessments: challenge.assessments.map((item) =>
        item.kind === "price.direction"
          ? {
              ...item,
              status: item.status === "supported" ? "challenged" : "supported",
              supportingEvidence: item.challengingEvidence,
              challengingEvidence: item.supportingEvidence,
            }
          : item,
      ),
    }));
    const revision = buildThesisRevision({ previous, current, sequence: 1, createdAt: "2026-09-18T16:00:00.000Z" });
    expect(revision.snapshotChanged).toBe(true);
    expect(revision.snapshotWarning).toMatch(/not attributed to the thesis edit/i);
    const direction = revision.claims.find((item) => item.statusChanged);
    expect(direction?.attribution).toBe("evidence-snapshot");
    expect(direction?.change).toBe("unchanged");
  });

  it("uses mixed attribution when both the thesis and the snapshot changed", () => {
    const previous = challengeFrom("rAAPL fell.");
    const upTicker: RealityTicker = {
      ...(baseRaw().ticker as RealityTicker),
      change24hPercentNumber: 0.02,
    };
    const current = cloneWithSnapshot(
      challengeFrom("rAAPL fell today.", { ticker: upTicker }),
      "2026-09-18T16:00:00.000Z",
    );
    const revision = buildThesisRevision({ previous, current, sequence: 1, createdAt: "2026-09-18T16:00:00.000Z" });
    expect(revision.snapshotChanged).toBe(true);
    const edited = revision.claims.find((item) => item.change === "edited");
    expect(edited).toBeTruthy();
    expect(edited?.statusChanged).toBe(true);
    expect(edited?.attribution).toBe("mixed");
    expect(revision.limitations.join(" ")).toMatch(/does not mean the thesis improved/i);
  });

  it("handles an empty revised thesis as removed claims, not as a false finding", () => {
    const previous = challengeFrom("rAAPL fell because of earnings.");
    const current = challengeFrom("");
    const revision = buildThesisRevision({ previous, current, sequence: 1, createdAt: retrievedAt.toISOString() });
    expect(revision.summary.removed).toBeGreaterThan(0);
    expect(revision.claims.every((item) => item.attribution !== "evidence-snapshot" || revision.snapshotChanged)).toBe(true);
    expect(current.assessments[0]?.status).toBe("unassessed");
    expect(JSON.stringify(revision.claims)).not.toMatch(/therefore false/i);
  });

  it("keeps duplicate sentences as separate units", () => {
    const previous = challengeFrom("rAAPL fell. rAAPL fell.");
    expect(extractClaimUnits(previous).length).toBeGreaterThanOrEqual(2);
    const current = challengeFrom("rAAPL fell.");
    const revision = buildThesisRevision({ previous, current, sequence: 1, createdAt: retrievedAt.toISOString() });
    expect(revision.summary.removed).toBeGreaterThanOrEqual(1);
    expect(revision.claims.some((item) => item.change === "unchanged" || item.change === "edited")).toBe(true);
  });

  it("preserves partial data and stale evidence through a revision", () => {
    const staleTicker: RealityTicker = {
      ...(baseRaw().ticker as RealityTicker),
      sourceTimestampMs: retrievedAt.getTime() - 45_000,
      sourceTimestamp: new Date(retrievedAt.getTime() - 45_000).toISOString(),
    };
    const previous = challengeFrom("The current last price is live right now.", {
      ticker: staleTicker,
      failures: [{ resource: "candles", message: "timeout" }],
      candles: null,
    });
    const current = challengeFrom("The current last price is live right now. rAAPL fell.", {
      ticker: staleTicker,
      failures: [{ resource: "candles", message: "timeout" }],
      candles: null,
    });
    const revision = buildThesisRevision({ previous, current, sequence: 1, createdAt: retrievedAt.toISOString() });
    expect(revision.currentChallenge.failures.some((item) => item.resource === "candles")).toBe(true);
    expect(revision.previousChallenge.assessments.some((item) => item.status === "challenged")).toBe(true);
    expect(revision.snapshotChanged).toBe(false);
  });

  it("does not fabricate claims, counterpoints, or recommendations", () => {
    const previous = challengeFrom("rAAPL is cheap versus the US stock. Buy it.");
    const current = challengeFrom("rAAPL fell. The US stock market is open.");
    const revision = buildThesisRevision({ previous, current, sequence: 1, createdAt: retrievedAt.toISOString() });
    const generated = JSON.stringify({
      matchReasons: revision.claims.map((item) => item.matchReason),
      warning: revision.snapshotWarning,
      limitations: revision.limitations,
      summary: revision.summary,
    });
    expect(generated).not.toMatch(/NYSE print showed|NASDAQ print of|Bloomberg reports|should buy|should sell|buy this|sell this|price will|price target|I recommend/i);
    expect(revision.limitations.some((line) => /not a score/i.test(line))).toBe(true);
  });
});

describe("parseRevisionRequest", () => {
  it("requires a previous challenge", () => {
    expect(() => parseRevisionRequest({ thesis: "rAAPL fell." })).toThrow(/previous challenge/i);
  });

  it("allows an empty revised thesis", () => {
    const previous = challengeFrom("rAAPL fell.");
    const parsed = parseRevisionRequest({ previous, thesis: "" });
    expect(parsed.input?.thesis).toBe("");
  });

  it("diffs two provided challenges without requiring a thesis field", () => {
    const previous = challengeFrom("rAAPL fell.");
    const current = challengeFrom("rAAPL rose.");
    const parsed = parseRevisionRequest({ previous, current, sequence: 3 });
    expect(parsed.sequence).toBe(3);
    expect(parsed.current?.input.thesis).toContain("rose");
  });
});

describe("parseThesisInput allowEmpty", () => {
  it("still requires a thesis for the original challenge parser", () => {
    expect(() => parseThesisInput({ thesis: "" })).toThrow(/thesis/i);
    expect(parseThesisInput({ thesis: "" }, { allowEmpty: true }).thesis).toBe("");
  });
});
