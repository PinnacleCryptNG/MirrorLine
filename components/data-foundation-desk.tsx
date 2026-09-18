"use client";

import { useMemo, useState } from "react";
import { MarketContextPanel } from "@/components/market-context-panel";
import { EvidencePackPanel } from "@/components/evidence-pack-panel";
import { InvestigationBriefPanel } from "@/components/investigation-brief-panel";
import { InterpretationChallengePanel } from "@/components/interpretation-challenge-panel";
import { InvestigationReportPanel } from "@/components/investigation-report-panel";
import { MultiSymbolComparisonPanel } from "@/components/multi-symbol-comparison-panel";
import { HowMirrorlineWorksModal } from "@/components/how-mirrorline-works-modal";
import { buildEvidencePack } from "@/lib/evidence/pack";
import { buildInvestigationBrief } from "@/lib/brief/generate";
import { DEMO_SCENARIO_LIST, getDemoScenario, SUPPORTED_DEMO_SYMBOLS } from "@/lib/fixtures";
import type { DemoScenarioId } from "@/lib/fixtures/types";
import type { InterpretationChallenge } from "@/lib/challenge/types";
import type { ThesisRevision } from "@/lib/revision/types";
import type { MarketContext, MarketSnapshotPayload, ResourceFailure } from "@/lib/market/types";

export type CheckStatus = "pass" | "fail" | "skipped";

export interface VerificationReport {
  symbol: string;
  startedAt: string;
  finishedAt: string;
  credentialsConfigured: boolean;
  summary: { passed: number; failed: number; skipped: number; total: number };
  checks: Array<{
    id: string;
    title: string;
    endpoint: string;
    access: string;
    status: CheckStatus;
    detail: string;
    sample?: unknown;
  }>;
  notes: string[];
}

export interface InstrumentRow {
  symbol: string;
  tokenSymbol: string;
  underlyingSymbol: string;
  displayName: string | null;
  status: string;
  weekendTradable: boolean | null;
}

const QUICK_PICK_SYMBOLS = ["rAAPL", "rNVDA", "rTSLA", "rMSFT", "rCOIN"];

function statusColor(status: CheckStatus) {
  if (status === "pass") return "text-[#36D399] border-[#36D399]/30 bg-[#36D399]/10";
  if (status === "fail") return "text-[#FF6B7A] border-[#FF6B7A]/30 bg-[#FF6B7A]/10";
  return "text-[#F4C95D] border-[#F4C95D]/30 bg-[#F4C95D]/10";
}

function snapshotContext(snapshot: MarketSnapshotPayload | Record<string, unknown> | null): MarketContext | null {
  if (!snapshot || typeof snapshot !== "object") {
    return null;
  }
  const context = "context" in snapshot ? snapshot.context : null;
  return context && typeof context === "object" ? (context as MarketContext) : null;
}

function snapshotFailures(snapshot: MarketSnapshotPayload | Record<string, unknown> | null): ResourceFailure[] {
  if (!snapshot || typeof snapshot !== "object" || !("failures" in snapshot) || !Array.isArray(snapshot.failures)) {
    return [];
  }
  return snapshot.failures as ResourceFailure[];
}

export function DataFoundationDesk({
  initialSymbol,
  initialReport,
  initialInstruments,
  initialInstrumentTotal,
  initialSnapshot,
  initialError,
}: {
  initialSymbol: string;
  initialReport: VerificationReport | null;
  initialInstruments: InstrumentRow[];
  initialInstrumentTotal?: number | null;
  initialSnapshot: MarketSnapshotPayload | Record<string, unknown> | null;
  initialError: string | null;
}) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [query, setQuery] = useState("");
  const [report, setReport] = useState<VerificationReport | null>(initialReport);
  const [instruments, setInstruments] = useState<InstrumentRow[]>(initialInstruments);
  const [instrumentTotal, setInstrumentTotal] = useState<number | null | undefined>(initialInstrumentTotal);
  const [snapshot, setSnapshot] = useState<MarketSnapshotPayload | Record<string, unknown> | null>(initialSnapshot);
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState<InterpretationChallenge | null>(null);
  const [revisions, setRevisions] = useState<ThesisRevision[]>([]);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [activeDemoScenarioId, setActiveDemoScenarioId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "challenge" | "compare" | "export">("overview");
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const loadDemoScenario = async (scenarioId: DemoScenarioId) => {
    const scenario = DEMO_SCENARIO_LIST.find((s) => s.id === scenarioId);
    if (!scenario) return;
    setIsDemoMode(true);
    setActiveDemoScenarioId(scenario.id);
    setSymbol(scenario.symbol);
    setLoading(true);
    setError(null);
    setChallenge(null);
    setRevisions([]);
    try {
      const res = await fetch(`/api/market/demo/snapshot/${encodeURIComponent(scenario.symbol)}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        setSnapshot(null);
        setError(json.message ?? "Failed to load demo scenario");
      } else {
        setSnapshot(json);
      }
    } catch (err) {
      setSnapshot(null);
      setError(err instanceof Error ? err.message : "Unable to load demo fixture");
    } finally {
      setLoading(false);
    }
  };

  const load = async (nextSymbol: string, nextQuery = query) => {
    setLoading(true);
    setError(null);
    setChallenge(null);
    setRevisions([]);

    if (isDemoMode) {
      try {
        const res = await fetch(`/api/market/demo/snapshot/${encodeURIComponent(nextSymbol)}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) {
          setSnapshot(null);
          setError(
            json.message ??
              `Symbol '${nextSymbol}' not available in demo fixture mode. Supported fixtures: ${SUPPORTED_DEMO_SYMBOLS.join(", ")}. Demo mode does not fall back to live data.`,
          );
        } else {
          setSnapshot(json);
          const matched = getDemoScenario(nextSymbol);
          setActiveDemoScenarioId(matched?.id ?? null);
        }
      } catch (err) {
        setSnapshot(null);
        setError(err instanceof Error ? err.message : "Unable to load demo snapshot");
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const [verifyRes, instrumentsRes, snapshotRes] = await Promise.all([
        fetch(`/api/market/verify?symbol=${encodeURIComponent(nextSymbol)}`, { cache: "no-store" }),
        fetch(
          `/api/market/instruments?query=${encodeURIComponent(nextQuery)}&limit=12`,
          { cache: "no-store" },
        ),
        fetch(`/api/market/snapshot/${encodeURIComponent(nextSymbol)}`, { cache: "no-store" }),
      ]);

      const verifyJson = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyJson.message ?? "Verification request failed");
      }
      setReport(verifyJson);

      const instrumentsJson = await instrumentsRes.json();
      if (!instrumentsRes.ok) {
        throw new Error(instrumentsJson.message ?? "Instrument discovery failed");
      }
      setInstruments(instrumentsJson.instruments ?? []);
      setInstrumentTotal(instrumentsJson.total ?? null);

      const snapshotJson = await snapshotRes.json();
      if (!snapshotRes.ok) {
        setSnapshot(null);
        setError(snapshotJson.message ?? "Snapshot request failed");
      } else {
        setSnapshot(snapshotJson);
      }
    } catch (err) {
      setSnapshot(null);
      setReport(null);
      setError(err instanceof Error ? err.message : "Unable to load Bitget data");
    } finally {
      setLoading(false);
    }
  };

  const context = snapshotContext(snapshot);
  const failures = snapshotFailures(snapshot);
  const pack = useMemo(() => (context ? buildEvidencePack(context) : null), [context]);
  const brief = useMemo(() => (pack ? buildInvestigationBrief(pack) : null), [pack]);
  const last = context?.price.last;
  const change = context?.price.change24hPercent;
  const session = context?.session.marketSession;
  const changeNumber = typeof change?.value === "number" ? change.value : undefined;
  const lastDisplay =
    last && last.value !== null && last.status !== "missing" && last.status !== "error"
      ? String(last.value)
      : "—";
  const summary = useMemo(() => report?.summary, [report]);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-8 md:px-8">
      {/* 1. Restrained Mirrorline Header */}
      <header className="flex flex-col gap-4 border-b border-[#252B36] pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-data text-xs font-semibold tracking-wider text-[#8B7CFF]">MIRRORLINE</span>
            <span className="text-xs text-[#626B7A]">/</span>
            <span className="font-data text-xs text-[#9BA3B2]">AI Trading Desk</span>
            {isDemoMode ? (
              <span className="rounded-full border border-[#F4C95D]/40 bg-[#F4C95D]/10 px-2 py-0.5 font-data text-[10px] text-[#F4C95D]">
                FIXTURE MODE
              </span>
            ) : null}
          </div>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-[#F5F7FA]">
            Evidence-First Investigation Desk
          </h1>
          <p className="mt-1 max-w-2xl text-xs text-[#9BA3B2]">
            Stress-test trading interpretations against loaded 24/7 Bitget Reality rToken market context. Non-advisory decision support.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* How Mirrorline Works Entry Button */}
          <button
            type="button"
            onClick={() => setIsHelpOpen(true)}
            aria-label="How Mirrorline works and judge walkthrough"
            className="flex items-center gap-1.5 rounded-md border border-[#252B36] bg-[#10131A] px-3 py-2 text-xs text-[#9BA3B2] hover:border-[#8B7CFF] hover:text-[#F5F7FA] transition-colors"
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#8B7CFF]/20 font-data text-[10px] font-bold text-[#8B7CFF]">
              ?
            </span>
            <span>How it works</span>
          </button>

          {/* Mode Switcher */}
          <button
            type="button"
            onClick={() => {
              const nextMode = !isDemoMode;
              setIsDemoMode(nextMode);
              setError(null);
              if (nextMode && !activeDemoScenarioId) {
                void loadDemoScenario("scenario-raapl-session-down");
              } else if (!nextMode && snapshot) {
                void load(symbol);
              }
            }}
            aria-label={isDemoMode ? "Switch to live Bitget data" : "Switch to reproducible demo fixture mode"}
            className={`rounded-md border px-3 py-2 font-data text-xs transition-colors ${
              isDemoMode
                ? "border-[#F4C95D] bg-[#F4C95D]/10 text-[#F4C95D]"
                : "border-[#252B36] bg-[#10131A] text-[#9BA3B2] hover:border-[#8B7CFF]"
            }`}
          >
            {isDemoMode ? "◆ Demo Fixture Mode" : "● Live Bitget Mode"}
          </button>
        </div>
      </header>

      {/* 2. Workspace Symbol Input & Entry State Bar */}
      <section className="rounded-xl border border-[#252B36] bg-[#10131A] p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <form
            className="flex flex-1 flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              void load(symbol, query);
            }}
          >
            <div className="relative flex-1">
              <input
                value={symbol}
                onChange={(event) => setSymbol(event.target.value)}
                className="h-10 w-full rounded-md border border-[#252B36] bg-[#080A0F] px-3 font-data text-sm outline-none focus:border-[#8B7CFF]"
                placeholder={isDemoMode ? "rAAPL, rNVDA, rTSLA" : "rAAPL or RAAPLUSDT"}
                aria-label="rToken symbol"
              />
            </div>
            <button
              type="submit"
              className="h-10 rounded-md bg-[#8B7CFF] px-4 text-sm font-medium text-[#080A0F] hover:bg-[#8B7CFF]/90 disabled:opacity-60 transition-colors"
              disabled={loading}
            >
              {loading ? (isDemoMode ? "Loading fixture…" : "Loading Bitget…") : isDemoMode ? "Load fixture" : "Load live snapshot"}
            </button>
          </form>

          {/* Quick options: demo fixtures or live quick pick */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-data text-[11px] text-[#626B7A]">
              {isDemoMode ? "Fixtures:" : "Suggestions:"}
            </span>
            {isDemoMode ? (
              DEMO_SCENARIO_LIST.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => void loadDemoScenario(sc.id)}
                  className={`rounded border px-2.5 py-1 font-data text-xs transition-colors ${
                    activeDemoScenarioId === sc.id && snapshot
                      ? "border-[#F4C95D] bg-[#F4C95D]/15 text-[#F4C95D]"
                      : "border-[#252B36] bg-[#080A0F] text-[#9BA3B2] hover:border-[#F4C95D]/60 hover:text-[#F4C95D]"
                  }`}
                >
                  {sc.symbol}
                </button>
              ))
            ) : (
              <>
                {QUICK_PICK_SYMBOLS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setSymbol(item);
                      void load(item, query);
                    }}
                    className={`rounded border px-2.5 py-1 font-data text-xs transition-colors ${
                      symbol.toUpperCase() === item.toUpperCase() && snapshot
                        ? "border-[#8B7CFF] bg-[#8B7CFF]/15 text-[#8B7CFF]"
                        : "border-[#252B36] bg-[#080A0F] text-[#9BA3B2] hover:border-[#8B7CFF]/60 hover:text-[#F5F7FA]"
                    }`}
                  >
                    {item}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => void loadDemoScenario("scenario-raapl-session-down")}
                  className="rounded border border-[#F4C95D]/40 bg-[#F4C95D]/10 px-2.5 py-1 font-data text-xs text-[#F4C95D] hover:bg-[#F4C95D]/20 transition-colors"
                >
                  Try Demo
                </button>
              </>
            )}
          </div>
        </div>

        {/* Live / Demo Mode Active Banner */}
        {isDemoMode || context?.isDemoFixture ? (
          <div
            role="status"
            className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#F4C95D]/40 bg-[#F4C95D]/10 px-3 py-2 text-xs text-[#F4C95D]"
          >
            <div className="flex items-center gap-2">
              <span className="rounded bg-[#F4C95D] px-1.5 py-0.5 font-data text-[10px] font-bold text-[#080A0F]">
                DEMO FIXTURE
              </span>
              <span className="font-semibold">
                {context?.fixtureLabel ?? "Deterministic Demo Fixture"}
              </span>
              <span className="hidden sm:inline text-[#F4C95D]/80">
                — Preserved timestamp: {context?.retrievedAt ?? "frozen snapshot"}
              </span>
            </div>
            <span className="font-data text-[11px] text-[#F4C95D]/80">
              Not live Bitget data · Zero API calls
            </span>
          </div>
        ) : null}

        {error ? (
          <div
            role="alert"
            aria-live="polite"
            className="mt-3 rounded-lg border border-[#FF6B7A]/40 bg-[#FF6B7A]/10 px-4 py-2.5 text-xs text-[#FF6B7A]"
          >
            <strong>{isDemoMode ? "Demo fixture error: " : "Market data error: "}</strong>
            {error}
          </div>
        ) : null}
      </section>

      {/* 3. Empty / Initial Ready State (When no snapshot is loaded yet) */}
      {!snapshot && !loading && !error && (
        <section className="rounded-xl border border-[#252B36] bg-[#10131A] p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#8B7CFF]/10 text-[#8B7CFF] mb-4">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[#F5F7FA]">Ready to Start an Investigation</h2>
          <p className="mx-auto mt-2 max-w-md text-xs text-[#9BA3B2]">
            Select an rToken or try a reproducible demo scenario to load market context, inspect evidence classifications, and stress-test your trading thesis.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => void load("rAAPL")}
              className="rounded-md bg-[#8B7CFF] px-4 py-2 text-xs font-medium text-[#080A0F] hover:bg-[#8B7CFF]/90 transition-colors"
            >
              Load Live rAAPL Snapshot
            </button>
            <button
              type="button"
              onClick={() => void loadDemoScenario("scenario-raapl-session-down")}
              className="rounded-md border border-[#F4C95D]/40 bg-[#F4C95D]/10 px-4 py-2 text-xs font-medium text-[#F4C95D] hover:bg-[#F4C95D]/20 transition-colors"
            >
              Try Demo Fixture (rAAPL Down)
            </button>
            <button
              type="button"
              onClick={() => setIsHelpOpen(true)}
              className="rounded-md border border-[#252B36] bg-[#080A0F] px-4 py-2 text-xs text-[#9BA3B2] hover:text-[#F5F7FA] transition-colors"
            >
              How Mirrorline Works
            </button>
          </div>
        </section>
      )}

      {/* 4. Loaded State: Market Stats Strip */}
      {snapshot && (
        <section className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <Stat
            label={isDemoMode ? "Mode" : "Token Pair"}
            value={isDemoMode ? "Demo Fixture" : context?.pair ?? symbol}
            mono
            hint={context?.isDemoFixture ? (context.fixtureLabel ?? "Deterministic Fixture") : "Bitget UTA Spot"}
          />
          <Stat
            label="Last price"
            value={lastDisplay}
            mono
            hint={
              last
                ? `${context?.isDemoFixture ? "fixture · " : ""}${last.kind}${last.status !== "ok" ? ` · ${last.status}` : ""}`
                : undefined
            }
          />
          <Stat
            label="24h change"
            value={changeNumber === undefined ? "—" : `${(changeNumber * 100).toFixed(2)}%`}
            tone={changeNumber === undefined ? "muted" : changeNumber >= 0 ? "positive" : "negative"}
            hint={
              change
                ? `${context?.isDemoFixture ? "fixture · " : ""}${change.kind}${change.status !== "ok" ? ` · ${change.status}` : ""}`
                : undefined
            }
          />
          <Stat
            label="US session"
            value={typeof session?.value === "string" ? session.value : "UNKNOWN"}
            hint={
              session
                ? `${context?.isDemoFixture ? "fixture · " : ""}${session.kind}${session.status !== "ok" ? ` · ${session.status}` : ""}`
                : undefined
            }
          />
        </section>
      )}

      {/* 5. Tabbed Workspace Structure */}
      {snapshot && (
        <div className="flex flex-col gap-6">
          {/* Navigation Bar */}
          <nav aria-label="Workspace Tabs" className="flex border-b border-[#252B36] bg-[#10131A] rounded-t-xl overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-2 border-b-2 py-3 px-5 font-data text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === "overview"
                  ? "border-[#8B7CFF] text-[#8B7CFF] bg-[#8B7CFF]/5"
                  : "border-transparent text-[#9BA3B2] hover:text-[#F5F7FA]"
              }`}
            >
              <span>1. Overview & Brief</span>
              {brief && (
                <span className="rounded-full bg-[#252B36] px-1.5 py-0.2 text-[10px] text-[#9BA3B2]">
                  {brief.tensions.length} tensions
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("challenge")}
              className={`flex items-center gap-2 border-b-2 py-3 px-5 font-data text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === "challenge"
                  ? "border-[#8B7CFF] text-[#8B7CFF] bg-[#8B7CFF]/5"
                  : "border-transparent text-[#9BA3B2] hover:text-[#F5F7FA]"
              }`}
            >
              <span>2. Claims & Challenge</span>
              {challenge && (
                <span className="rounded-full bg-[#8B7CFF]/20 px-1.5 py-0.2 text-[10px] text-[#8B7CFF]">
                  {challenge.assessments.length} claims
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("compare")}
              className={`flex items-center gap-2 border-b-2 py-3 px-5 font-data text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === "compare"
                  ? "border-[#8B7CFF] text-[#8B7CFF] bg-[#8B7CFF]/5"
                  : "border-transparent text-[#9BA3B2] hover:text-[#F5F7FA]"
              }`}
            >
              <span>3. Compare Symbols</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("export")}
              className={`flex items-center gap-2 border-b-2 py-3 px-5 font-data text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === "export"
                  ? "border-[#8B7CFF] text-[#8B7CFF] bg-[#8B7CFF]/5"
                  : "border-transparent text-[#9BA3B2] hover:text-[#F5F7FA]"
              }`}
            >
              <span>4. Export Report</span>
            </button>
          </nav>

          {/* TAB 1: Overview & Investigation Brief */}
          {activeTab === "overview" && (
            <div className="flex flex-col gap-6">
              {/* Top Summary Card: Context & Questions */}
              {brief ? (
                <section className="rounded-xl border border-[#252B36] bg-[#10131A] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#252B36] pb-3">
                    <div>
                      <p className="font-data text-[10px] uppercase tracking-wider text-[#8B7CFF]">
                        Investigation Brief
                      </p>
                      <h2 className="mt-1 text-base font-semibold text-[#F5F7FA]">{brief.question}</h2>
                    </div>
                    <div className="flex items-center gap-2 font-data text-xs text-[#9BA3B2]">
                      <span>Retrieved: {brief.retrievedAt}</span>
                    </div>
                  </div>

                  {/* Evidence coverage summary pills */}
                  {pack && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="font-data text-xs text-[#626B7A]">Evidence Breakdown:</span>
                      <span className="rounded border border-[#5EA7FF]/30 bg-[#5EA7FF]/10 px-2 py-0.5 font-data text-[11px] text-[#5EA7FF]">
                        FACT {pack.summary.fact}
                      </span>
                      <span className="rounded border border-[#8B7CFF]/30 bg-[#8B7CFF]/10 px-2 py-0.5 font-data text-[11px] text-[#8B7CFF]">
                        INFERENCE {pack.summary.inference}
                      </span>
                      <span className="rounded border border-[#F4C95D]/30 bg-[#F4C95D]/10 px-2 py-0.5 font-data text-[11px] text-[#F4C95D]">
                        ASSUMPTION {pack.summary.assumption}
                      </span>
                      <span className="rounded border border-[#626B7A]/40 bg-[#171B24] px-2 py-0.5 font-data text-[11px] text-[#9BA3B2]">
                        UNKNOWN {pack.summary.unknown}
                      </span>
                      {pack.summary.stale > 0 && (
                        <span className="rounded border border-[#F4C95D]/40 bg-[#F4C95D]/10 px-2 py-0.5 font-data text-[11px] text-[#F4C95D]">
                          STALE {pack.summary.stale}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions shortcut */}
                  <div className="mt-4 flex flex-wrap gap-2 pt-2 border-t border-[#252B36]">
                    <button
                      type="button"
                      onClick={() => setActiveTab("challenge")}
                      className="rounded-md bg-[#8B7CFF] px-3.5 py-1.5 text-xs font-medium text-[#080A0F] hover:bg-[#8B7CFF]/90 transition-colors"
                    >
                      Compose & Challenge Thesis →
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("compare")}
                      className="rounded-md border border-[#252B36] bg-[#080A0F] px-3.5 py-1.5 text-xs text-[#9BA3B2] hover:text-[#F5F7FA] transition-colors"
                    >
                      Compare Across Symbols
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("export")}
                      className="rounded-md border border-[#252B36] bg-[#080A0F] px-3.5 py-1.5 text-xs text-[#9BA3B2] hover:text-[#F5F7FA] transition-colors"
                    >
                      Preview Report Export
                    </button>
                  </div>
                </section>
              ) : null}

              {/* Investigation Brief */}
              <InvestigationBriefPanel brief={brief} hideHeader={true} />

              {/* Progressive Disclosure: Technical Evidence Pack and Market Context */}
              <details className="group rounded-xl border border-[#252B36] bg-[#10131A] overflow-hidden">
                <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-xs font-medium text-[#9BA3B2] hover:bg-[#171B24] transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="font-data text-[11px] text-[#8B7CFF]">TECHNICAL AUDITABILITY</span>
                    <span className="text-[#F5F7FA]">Detailed Evidence Pack & Raw Market Fields</span>
                    {pack && (
                      <span className="text-[10px] text-[#626B7A]">({pack.items.length} items)</span>
                    )}
                  </div>
                  <span className="font-data text-[11px] text-[#8B7CFF] group-open:rotate-180 transition-transform">
                    ▼
                  </span>
                </summary>
                <div className="border-t border-[#252B36] p-4 flex flex-col gap-6">
                  <EvidencePackPanel pack={pack} />
                  <MarketContextPanel context={context} failures={failures} />
                </div>
              </details>
            </div>
          )}

          {/* TAB 2: Claims & Challenge */}
          {activeTab === "challenge" && (
            <div className="flex flex-col gap-6">
              <InterpretationChallengePanel
                key={pack?.investigation.retrievedAt ?? symbol}
                symbol={pack?.investigation.tokenSymbol ?? symbol}
                pack={pack}
                brief={brief}
                onInvestigationChange={(state) => {
                  setChallenge(state.challenge);
                  setRevisions(state.history);
                }}
              />
            </div>
          )}

          {/* TAB 3: Multi-Symbol Comparison */}
          {activeTab === "compare" && (
            <div className="flex flex-col gap-6">
              <MultiSymbolComparisonPanel />
            </div>
          )}

          {/* TAB 4: Investigation Report & Export */}
          {activeTab === "export" && (
            <div className="flex flex-col gap-6">
              <InvestigationReportPanel
                pack={pack}
                brief={brief}
                context={context}
                challenge={challenge}
                revisions={revisions}
              />
            </div>
          )}
        </div>
      )}

      {/* 6. Operator & Discovery Tools (Progressive Disclosure) */}
      <details className="group rounded-xl border border-[#252B36] bg-[#10131A] overflow-hidden">
        <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-xs font-medium text-[#626B7A] hover:bg-[#171B24] transition-colors">
          <div className="flex items-center gap-2">
            <span className="font-data text-[10px] uppercase text-[#626B7A]">Operator & Provider Inspection</span>
            <span className="text-xs text-[#9BA3B2]">Bitget Verification Checks & Token Directory</span>
            {summary && (
              <span className="text-[10px] text-[#626B7A]">({summary.passed} passed)</span>
            )}
          </div>
          <span className="font-data text-[10px] text-[#626B7A] group-open:rotate-180 transition-transform">
            ▼
          </span>
        </summary>
        <div className="border-t border-[#252B36] p-4">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-xl border border-[#252B36] bg-[#080A0F]">
              <div className="flex items-center justify-between border-b border-[#252B36] px-4 py-3">
                <h2 className="text-xs font-medium text-[#F5F7FA]">Verification checks</h2>
                {summary ? (
                  <p className="font-data text-[11px] text-[#9BA3B2]">
                    {summary.passed} passed · {summary.failed} failed · {summary.skipped} skipped
                  </p>
                ) : (
                  <p className="text-[11px] text-[#626B7A]">Waiting for Bitget…</p>
                )}
              </div>
              <div className="divide-y divide-[#252B36]">
                {report?.checks.map((check) => (
                  <article key={check.id} className="px-4 py-3">
                    <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="text-xs text-[#F5F7FA]">{check.title}</h3>
                        <p className="mt-0.5 font-data text-[10px] text-[#626B7A]">{check.endpoint}</p>
                      </div>
                      <span className={`w-fit rounded-full border px-2 py-0.2 font-data text-[10px] uppercase ${statusColor(check.status)}`}>
                        {check.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#9BA3B2]">{check.detail}</p>
                  </article>
                ))}
                {loading && !report ? (
                  <p className="px-4 py-6 text-xs text-[#9BA3B2]">Reading market conditions from Bitget.</p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-[#252B36] bg-[#080A0F]">
                <div className="border-b border-[#252B36] px-4 py-3">
                  <h2 className="text-xs font-medium text-[#F5F7FA]">
                    Discovered instruments{instrumentTotal != null ? ` (${instrumentTotal})` : ""}
                  </h2>
                  <form
                    className="mt-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void load(symbol, query);
                    }}
                  >
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      className="h-8 w-full rounded border border-[#252B36] bg-[#10131A] px-2.5 text-xs outline-none focus:border-[#8B7CFF]"
                      placeholder="Filter by rNVDA, AAPL, Tesla…"
                      aria-label="Filter instruments"
                    />
                  </form>
                </div>
                <ul className="max-h-60 overflow-auto">
                  {instruments.length === 0 ? (
                    <li className="px-4 py-4 text-xs text-[#9BA3B2]">No Reality instruments matched that filter.</li>
                  ) : (
                    instruments.map((item) => (
                      <li key={item.symbol}>
                        <button
                          type="button"
                          onClick={() => {
                            setSymbol(item.tokenSymbol);
                            void load(item.tokenSymbol, query);
                          }}
                          className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-[#171B24]"
                        >
                          <span>
                            <span className="font-data text-xs text-[#F5F7FA]">{item.tokenSymbol}</span>
                            <span className="ml-2 text-[11px] text-[#626B7A]">
                              {item.displayName ?? item.underlyingSymbol}
                            </span>
                          </span>
                          <span className="font-data text-[10px] text-[#9BA3B2]">{item.status}</span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <div className="rounded-xl border border-[#252B36] bg-[#080A0F] px-4 py-3 text-xs text-[#9BA3B2]">
                <h2 className="mb-1 text-xs font-medium text-[#F5F7FA]">Provider notes</h2>
                <ul className="space-y-1">
                  {(report?.notes ?? ["Verification runs when loading live Bitget data."]).map((note) => (
                    <li key={note}>• {note}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </details>

      {/* 7. Footer: Clean non-advisory disclaimer & hackathon submission attribution */}
      <footer className="mt-8 border-t border-[#252B36] pt-6 pb-12 flex flex-col gap-3 md:flex-row md:items-center md:justify-between text-xs text-[#626B7A]">
        <div>
          <p className="font-medium text-[#9BA3B2]">
            Mirrorline · Non-advisory decision support desk for Bitget Reality rTokens
          </p>
          <p className="mt-0.5">
            Evaluates trader interpretations against loaded Bitget context. Does not provide trading advice, forecast prices, or execute trades.
          </p>
        </div>
        <div className="flex items-center gap-3 font-data text-[11px]">
          <span>Bitget AI Hackathon Genesis S2</span>
          <span>·</span>
          <button
            type="button"
            onClick={() => setIsHelpOpen(true)}
            className="text-[#8B7CFF] hover:underline"
          >
            Evaluator Guide
          </button>
        </div>
      </footer>

      {/* Help Modal */}
      <HowMirrorlineWorksModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        onSelectDemoScenario={loadDemoScenario}
        activeScenarioId={activeDemoScenarioId}
      />
    </main>
  );
}

function Stat({
  label,
  value,
  mono,
  tone = "muted",
  hint,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "muted" | "positive" | "negative";
  hint?: string;
}) {
  const color =
    tone === "positive" ? "text-[#36D399]" : tone === "negative" ? "text-[#FF6B7A]" : "text-[#F5F7FA]";
  return (
    <div className="rounded-xl border border-[#252B36] bg-[#10131A] px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-[#626B7A]">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${mono ? "font-data" : ""} ${color}`}>{value}</p>
      {hint ? (
        <p className="mt-1 font-data text-[10px] uppercase text-[#626B7A] truncate" title={hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
