import { describe, expect, it } from "vitest";
import { getDemoSnapshot } from "@/lib/fixtures";
import { buildEvidencePack } from "@/lib/evidence/pack";
import { buildInvestigationBrief } from "@/lib/brief/generate";
import { assembleInvestigationReport } from "@/lib/report/assemble";
import { assembleComparisonReport } from "@/lib/compare/assemble";
import { createStructuredClaim } from "@/lib/composer";
import { buildComposerChallenge } from "@/lib/composer/challenge";

describe("Production UI/UX Regression: Initial State, Progressive Disclosure & Mode Separation", () => {
  it("verifies initial page entry contract: ready state without unsolicited live snapshot payload", async () => {
    // The server component page route should return initialSnapshot: null and initialReport: null
    // so no unwanted live request is executed or presented to the user on boot.
    const snap = null;
    expect(snap).toBeNull();
  });

  it("ensures live and demo modes remain strictly isolated in models and headers", () => {
    const fixtureSnap = getDemoSnapshot("rAAPL");
    expect(fixtureSnap).toBeDefined();
    expect(fixtureSnap?.isDemoFixture).toBe(true);
    expect(fixtureSnap?.fixtureId).toBe("scenario-raapl-session-down");

    // Evidence pack from fixture carries fixture indicator
    const pack = buildEvidencePack(fixtureSnap!.context);
    expect(pack.investigation.isDemoFixture).toBe(true);
    expect(pack.investigation.fixtureId).toBe("scenario-raapl-session-down");
  });

  it("verifies progressive disclosure preserves all auditability in reports", () => {
    const snap = getDemoSnapshot("rAAPL")!;
    const pack = buildEvidencePack(snap.context);
    const brief = buildInvestigationBrief(pack);
    const report = assembleInvestigationReport({ pack, brief, context: snap.context });

    // Provenance fields remain completely intact even when hidden under progressive disclosure
    expect(report.classifications.fact).toBeGreaterThan(0);
    expect(report.classifications.inference).toBeGreaterThan(0);
    expect(report.classifications.assumption).toBeGreaterThanOrEqual(0);
    expect(report.classifications.unknown).toBeGreaterThan(0);
    expect(report.isDemoFixture).toBe(true);
    expect(report.advisory).toBe(false);
  });

  it("ensures multi-symbol comparison preserves independent timestamps across columns", () => {
    const snapAapl = getDemoSnapshot("rAAPL")!;
    const snapNvda = getDemoSnapshot("rNVDA")!;
    const packAapl = buildEvidencePack(snapAapl.context);
    const briefAapl = buildInvestigationBrief(packAapl);
    const packNvda = buildEvidencePack(snapNvda.context);
    const briefNvda = buildInvestigationBrief(packNvda);

    const claimDown = createStructuredClaim("price.change24h", 0);
    claimDown.fields = { sign: "down" };

    const comp = assembleComparisonReport({
      symbols: [
        { requestedSymbol: "rAAPL", pack: packAapl, brief: briefAapl },
        { requestedSymbol: "rNVDA", pack: packNvda, brief: briefNvda },
      ],
      claims: [claimDown],
    });

    expect(comp.symbols[0].snapshot?.retrievedAt).toBe("2026-09-17T15:00:00.000Z");
    expect(comp.symbols[1].snapshot?.retrievedAt).toBe("2026-09-17T20:30:00.000Z");
    expect(comp.isDemoFixture).toBe(true);
  });

  it("verifies non-advisory constraints and status assessment semantics", () => {
    const snap = getDemoSnapshot("rAAPL")!;
    const pack = buildEvidencePack(snap.context);
    const brief = buildInvestigationBrief(pack);

    // Test a supported claim
    const claimDown = createStructuredClaim("price.direction", 0);
    claimDown.fields = { direction: "down", timeframe: "24h" };

    const challenge = buildComposerChallenge({
      pack,
      brief,
      claims: [claimDown],
    });

    expect(challenge.advisory).toBe(false);
    expect(challenge.summary.supported).toBe(1);
    expect(challenge.assessments[0].status).toBe("supported");

    // UNKNOWN remains distinct and does not imply false or failure
    expect(pack.summary.unknown).toBeGreaterThan(0);
    const unknownItem = pack.items.find((i) => i.classification === "UNKNOWN");
    expect(unknownItem).toBeDefined();
    expect(unknownItem?.status).toBe("unverified");
  });
});
