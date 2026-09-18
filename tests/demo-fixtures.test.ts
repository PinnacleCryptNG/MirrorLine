import { describe, expect, it } from "vitest";
import {
  getDemoScenario,
  getDemoSnapshot,
  isDemoSymbol,
  listDemoScenarios,
  SUPPORTED_DEMO_SYMBOLS,
} from "@/lib/fixtures";
import { buildEvidencePack } from "@/lib/evidence/pack";
import { buildInvestigationBrief } from "@/lib/brief/generate";
import { assembleInvestigationReport } from "@/lib/report/assemble";
import { serializeInvestigationReportMarkdown } from "@/lib/report/markdown";
import { serializeInvestigationReportHtml } from "@/lib/report/html";
import { serializeInvestigationReportJson } from "@/lib/report/json";
import { assembleComparisonReport } from "@/lib/compare/assemble";
import { serializeComparisonReportMarkdown } from "@/lib/compare/markdown";
import { serializeComparisonReportHtml } from "@/lib/compare/html";
import { serializeComparisonReportJson } from "@/lib/compare/json";
import { createStructuredClaim } from "@/lib/composer";
import { scoreSharedClaims } from "@/lib/compare/score";
import { GET as getDemoScenariosRoute } from "@/app/api/market/demo/scenarios/route";
import { GET as getDemoSnapshotRoute } from "@/app/api/market/demo/snapshot/[symbol]/route";

describe("Milestone 11: Demo Fixtures & Reproducible Demo Mode", () => {
  describe("Fixture catalog and deterministic output", () => {
    it("lists all supported demo scenarios with metadata", () => {
      const list = listDemoScenarios();
      expect(list).toHaveLength(3);
      expect(list.map((s) => s.symbol)).toEqual(["rAAPL", "rNVDA", "rTSLA"]);
      for (const scenario of list) {
        expect(scenario.id).toBeTruthy();
        expect(scenario.title).toBeTruthy();
        expect(scenario.description).toBeTruthy();
        expect(scenario.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(scenario.scenarioHighlights.length).toBeGreaterThan(0);
        expect(scenario.recommendedClaims.length).toBeGreaterThan(0);
      }
    });

    it("matches scenarios by id, symbol, pair, or casing", () => {
      expect(getDemoScenario("rAAPL")?.id).toBe("scenario-raapl-session-down");
      expect(getDemoScenario("RAAPLUSDT")?.id).toBe("scenario-raapl-session-down");
      expect(getDemoScenario("scenario-raapl-session-down")?.symbol).toBe("rAAPL");
      expect(getDemoScenario("rnvda")?.id).toBe("scenario-rnvda-overnight-up");
      expect(getDemoScenario("rTSLA")?.id).toBe("scenario-rtsla-weekend-stale");
      expect(getDemoScenario("rMSFT")).toBeUndefined();
    });

    it("identifies supported demo symbols correctly", () => {
      expect(isDemoSymbol("rAAPL")).toBe(true);
      expect(isDemoSymbol("rNVDA")).toBe(true);
      expect(isDemoSymbol("rTSLA")).toBe(true);
      expect(isDemoSymbol("rMSFT")).toBe(false);
      expect(isDemoSymbol("BTCUSDT")).toBe(false);
    });

    it("produces deterministic, identical snapshots without Date.now() drift", () => {
      const snap1 = getDemoSnapshot("rAAPL");
      const snap2 = getDemoSnapshot("rAAPL");
      expect(snap1).toBeDefined();
      expect(snap2).toBeDefined();
      expect(snap1?.context.retrievedAt).toBe("2026-09-17T15:00:00.000Z");
      expect(snap1?.context.retrievedAt).toBe(snap2?.context.retrievedAt);
      expect(snap1?.context.price.last.value).toBe(332.9);
      expect(snap1?.context.price.sourceTimestamp.value).toBe("2026-09-17T14:59:57.000Z");
      expect(snap1?.isDemoFixture).toBe(true);
      expect(snap1?.fixtureId).toBe("scenario-raapl-session-down");
    });
  });

  describe("Fixture timestamp and freshness integrity", () => {
    it("preserves fresh state for rAAPL (3s old ticker)", () => {
      const snap = getDemoSnapshot("rAAPL")!;
      expect(snap.context.price.last.status).toBe("ok");
      expect(snap.context.session.marketSession.value).toBe("US_REGULAR");
      expect(snap.context.session.underlyingUsEquity.value).toBe("regular");
    });

    it("preserves session divergence for rNVDA (overnight vs closed underlying)", () => {
      const snap = getDemoSnapshot("rNVDA")!;
      expect(snap.context.session.marketSession.value).toBe("US_CLOSED");
      expect(snap.context.session.underlyingUsEquity.value).toBe("closed");
      expect(snap.context.price.change24hPercent.value).toBe(0.012);
    });

    it("preserves stale state and partial failure for rTSLA (48s old ticker vs 15s window)", () => {
      const snap = getDemoSnapshot("rTSLA")!;
      expect(snap.context.price.last.status).toBe("stale");
      expect(snap.context.failures).toHaveLength(1);
      expect(snap.context.failures[0].resource).toBe("publicOrderBook");

      const pack = buildEvidencePack(snap.context);
      expect(pack.summary.stale).toBeGreaterThan(0);
      expect(pack.failures).toHaveLength(1);
      expect(pack.limitations.some((l) => l.includes("DEMO / FIXTURE DATA"))).toBe(true);
    });

    it("does not fabricate unavailable US tape, reference prices, or 40-level depth in fixtures", () => {
      for (const sym of SUPPORTED_DEMO_SYMBOLS) {
        const snap = getDemoSnapshot(sym)!;
        expect(snap.context.reference.referencePrice.value).toBeNull();
        expect(snap.context.reference.referencePrice.status).toBe("unverified");
        expect(snap.context.reference.divergence.value).toBeNull();
        expect(snap.context.reference.divergence.status).toBe("unverified");
        expect(snap.realityOrderBook?.availability).toBe("unauthorized");
      }
    });
  });

  describe("Structured claim assessments on fixtures", () => {
    it("scores supported, challenged, unsupported, and unassessed claims deterministically", () => {
      const snapAapl = getDemoSnapshot("rAAPL")!;
      const packAapl = buildEvidencePack(snapAapl.context);
      const briefAapl = buildInvestigationBrief(packAapl);

      // Claim 1: 24h change is down -> matches -0.43% -> supported
      const claimDown = createStructuredClaim("price.change24h", 0);
      claimDown.fields = { sign: "down" };

      // Claim 2: 24h change is up -> contradicts -0.43% -> challenged
      const claimUp = createStructuredClaim("price.change24h", 1);
      claimUp.fields = { sign: "up" };

      // Claim 3: reference tape divergence -> unverified in pack -> unsupported
      const claimTape = createStructuredClaim("reference.tape", 2);
      claimTape.fields = { comparison: "divergence" };

      // Claim 4: intraday direction -> cannot be scored from 24h ticker -> unassessed
      const claimIntraday = createStructuredClaim("price.direction", 3);
      claimIntraday.fields = { direction: "down", timeframe: "intraday" };

      const challenge = scoreSharedClaims({
        pack: packAapl,
        brief: briefAapl,
        claims: [claimDown, claimUp, claimTape, claimIntraday],
      });

      expect(challenge.assessments[0].status).toBe("supported");
      expect(challenge.assessments[1].status).toBe("challenged");
      expect(challenge.assessments[2].status).toBe("unsupported");
      expect(challenge.assessments[3].status).toBe("unassessed");
    });
  });

  describe("Single-symbol Investigation Report export labeling", () => {
    it("labels report and serializers with unmistakable DEMO / FIXTURE DATA markers", () => {
      const snap = getDemoSnapshot("rAAPL")!;
      const pack = buildEvidencePack(snap.context);
      const brief = buildInvestigationBrief(pack);
      const report = assembleInvestigationReport({
        pack,
        brief,
        context: snap.context,
      });

      expect(report.isDemoFixture).toBe(true);
      expect(report.fixtureId).toBe("scenario-raapl-session-down");
      expect(report.disclaimers.some((d) => d.includes("DEMO / FIXTURE DATA"))).toBe(true);
      expect(report.limitations.some((l) => l.includes("DEMO / FIXTURE DATA"))).toBe(true);
      expect(report.advisory).toBe(false);

      // Markdown export
      const md = serializeInvestigationReportMarkdown(report);
      expect(md).toContain("> **DEMO / FIXTURE DATA**");
      expect(md).toContain("scenario-raapl-session-down");
      expect(md).toContain("Non-advisory");

      // HTML export
      const html = serializeInvestigationReportHtml(report);
      expect(html).toContain("demo-banner");
      expect(html).toContain("DEMO / FIXTURE DATA");
      expect(html).toContain("scenario-raapl-session-down");

      // JSON export
      const jsonStr = serializeInvestigationReportJson(report);
      const json = JSON.parse(jsonStr);
      expect(json.isDemoFixture).toBe(true);
      expect(json.fixtureId).toBe("scenario-raapl-session-down");
      expect(json.advisory).toBe(false);
    });
  });

  describe("Multi-symbol Comparison Report export labeling & snapshot independence", () => {
    it("preserves independent timestamps and labels comparison export as fixture data", () => {
      const snapAapl = getDemoSnapshot("rAAPL")!;
      const snapNvda = getDemoSnapshot("rNVDA")!;
      const packAapl = buildEvidencePack(snapAapl.context);
      const briefAapl = buildInvestigationBrief(packAapl);
      const packNvda = buildEvidencePack(snapNvda.context);
      const briefNvda = buildInvestigationBrief(packNvda);

      const claimDown = createStructuredClaim("price.change24h", 0);
      claimDown.fields = { sign: "down" };

      const comparison = assembleComparisonReport({
        symbols: [
          { requestedSymbol: "rAAPL", pack: packAapl, brief: briefAapl },
          { requestedSymbol: "rNVDA", pack: packNvda, brief: briefNvda },
        ],
        claims: [claimDown],
      });

      expect(comparison.isDemoFixture).toBe(true);
      expect(comparison.symbols[0].isDemoFixture).toBe(true);
      expect(comparison.symbols[1].isDemoFixture).toBe(true);

      // Preserves distinct, unmerged timestamps
      expect(comparison.symbols[0].snapshot?.retrievedAt).toBe("2026-09-17T15:00:00.000Z");
      expect(comparison.symbols[1].snapshot?.retrievedAt).toBe("2026-09-17T20:30:00.000Z");

      // Cell evaluation: rAAPL is down (-0.43%) -> supported; rNVDA is up (+1.20%) -> challenged
      const row = comparison.table[0];
      expect(row.cells["RAAPLUSDT"].statuses).toContain("supported");
      expect(row.cells["RNVDAUSDT"].statuses).toContain("challenged");

      // Disclaimers and serializers
      expect(comparison.disclaimers.some((d) => d.includes("DEMO / FIXTURE DATA"))).toBe(true);

      const md = serializeComparisonReportMarkdown(comparison);
      expect(md).toContain("> **DEMO / FIXTURE DATA**");
      expect(md).toContain("FIXTURE DATA");

      const html = serializeComparisonReportHtml(comparison);
      expect(html).toContain("DEMO / FIXTURE DATA");
      expect(html).toContain("FIXTURE");

      const jsonStr = serializeComparisonReportJson(comparison);
      const parsed = JSON.parse(jsonStr);
      expect(parsed.isDemoFixture).toBe(true);
      expect(parsed.advisory).toBe(false);
    });
  });

  describe("API separation and no live fallback", () => {
    it("GET /api/market/demo/scenarios returns all scenarios", async () => {
      const res = await getDemoScenariosRoute();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.total).toBe(3);
      expect(data.scenarios).toHaveLength(3);
      expect(data.disclaimer).toContain("DEMO / FIXTURE DATA");
    });

    it("GET /api/market/demo/snapshot/[symbol] returns fixture data for supported symbols", async () => {
      const res = await getDemoSnapshotRoute(new Request("http://localhost/api/market/demo/snapshot/rAAPL"), {
        params: Promise.resolve({ symbol: "rAAPL" }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.isDemoFixture).toBe(true);
      expect(data.fixtureId).toBe("scenario-raapl-session-down");
      expect(data.context.requestedSymbol).toBe("rAAPL");
    });

    it("GET /api/market/demo/snapshot/[symbol] returns 404 with no-fallback message for unknown symbols", async () => {
      const res = await getDemoSnapshotRoute(new Request("http://localhost/api/market/demo/snapshot/rMSFT"), {
        params: Promise.resolve({ symbol: "rMSFT" }),
      });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("DEMO_FIXTURE_NOT_FOUND");
      expect(data.message).toContain("Demo mode does not fall back to live data");
      expect(data.supportedSymbols).toEqual(["rAAPL", "rNVDA", "rTSLA"]);
    });
  });
});
