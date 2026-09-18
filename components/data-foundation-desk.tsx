"use client";

import { useMemo, useState, useEffect } from "react";
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
  if (status === "pass") return "text-[#226D3B] border-[#A3D8B4] bg-[#EAF5EE] dark:text-[#36D399] dark:border-[#36D399]/30 dark:bg-[#36D399]/10";
  if (status === "fail") return "text-[#A83232] border-[#F5B8B8] bg-[#FDF1F1] dark:text-[#FF6B7A] dark:border-[#FF6B7A]/30 dark:bg-[#FF6B7A]/10";
  return "text-[#8F5E15] border-[#E8D3A7] bg-[#FCF7EE] dark:text-[#F4C95D] dark:border-[#F4C95D]/30 dark:bg-[#F4C95D]/10";
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
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Sync theme with document html
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
    }
  }, [theme]);

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

  const context = useMemo(() => snapshotContext(snapshot), [snapshot]);
  const failures = useMemo(() => snapshotFailures(snapshot), [snapshot]);

  const pack = useMemo(() => {
    if (!context) {
      return null;
    }
    return buildEvidencePack(context);
  }, [context]);

  const brief = useMemo(() => {
    if (!pack) {
      return null;
    }
    return buildInvestigationBrief(pack);
  }, [pack]);

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
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-8 md:px-8 text-[var(--text-primary)]">
      {/* 1. Restrained Mirrorline Header & Mode Banner */}
      <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold tracking-wider text-[var(--accent)] dark:text-[#86C495]">
              MIRRORLINE
            </span>
            <span className="text-xs text-[var(--text-muted)]">/</span>
            <span className="text-xs font-medium text-[var(--text-secondary)]">Research Trading Desk</span>
            {isDemoMode ? (
              <span className="rounded-full border border-[var(--warning-border)] bg-[var(--warning-bg)] px-2.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--warning)]">
                DEMO MODE
              </span>
            ) : (
              <span className="rounded-full border border-[var(--positive-border)] bg-[var(--positive-bg)] px-2.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--positive)]">
                LIVE MODE
              </span>
            )}
          </div>
          
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            Check if your trading idea matches Bitget’s real data
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-[var(--text-secondary)] leading-relaxed">
            Mirrorline helps you check what Bitget’s market data supports—and what it doesn’t—before you act. See exactly what Bitget evidence supports (and what it does not) before you make a trade.
          </p>
        </div>

        {/* Action Controls & Theme Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Theme switcher */}
          <button
            type="button"
            onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)] transition-colors"
          >
            {theme === "light" ? (
              <>
                <span>🌙</span>
                <span>Dark</span>
              </>
            ) : (
              <>
                <span>☀️</span>
                <span>Light</span>
              </>
            )}
          </button>

          {/* How Mirrorline Works Entry Button */}
          <button
            type="button"
            onClick={() => setIsHelpOpen(true)}
            aria-label="How Mirrorline works and evaluator guide"
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)] transition-colors"
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent-light)] font-mono text-[10px] font-bold text-[var(--accent)] dark:text-[#86C495]">
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
            className={`rounded-lg border px-3 py-2 font-mono text-xs font-medium transition-colors ${
              isDemoMode
                ? "border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning)]"
                : "border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
            }`}
          >
            {isDemoMode ? "◆ Demo Fixture Mode" : "● Live Bitget Mode"}
          </button>
        </div>
      </header>

      {/* Persistent plain-English mode indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] px-3.5 py-2 text-xs text-[var(--text-secondary)]">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${isDemoMode ? "bg-[#E5A93C]" : "bg-[#2E5C38] dark:bg-[#36D399]"}`} />
          <span className="font-semibold text-[var(--text-primary)]">
            {isDemoMode
              ? "DEMO — Showing example data, not live market data."
              : "LIVE — Showing data retrieved from Bitget UTA markets."}
          </span>
        </div>
        <div className="text-[11px] text-[var(--text-muted)]">
          Free research tool. No buy/sell signals. No trade execution.
        </div>
      </div>

      {/* 2. Workspace Symbol Input & Entry State Bar */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-sm">
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
                className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 font-mono text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] transition-colors"
                placeholder={isDemoMode ? "rAAPL, rNVDA, rTSLA" : "rAAPL or RAAPLUSDT"}
                aria-label="rToken symbol"
              />
            </div>
            <button
              type="submit"
              className="h-10 rounded-lg bg-[var(--accent)] px-4 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60 transition-colors shadow-xs"
              disabled={loading}
            >
              {loading
                ? isDemoMode
                  ? "Loading example…"
                  : "Checking Bitget…"
                : isDemoMode
                  ? "Load demo data"
                  : `Load live ${symbol || "token"} data`}
            </button>
          </form>

          {/* Quick options: demo fixtures or live quick pick */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-mono text-[11px] text-[var(--text-muted)]">
              {isDemoMode ? "Fixtures:" : "Quick pick:"}
            </span>
            {isDemoMode ? (
              DEMO_SCENARIO_LIST.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => void loadDemoScenario(sc.id)}
                  className={`rounded-md border px-2.5 py-1 font-mono text-xs transition-colors ${
                    activeDemoScenarioId === sc.id && snapshot
                      ? "border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning)] font-semibold"
                      : "border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:border-[var(--warning-border)] hover:text-[var(--warning)]"
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
                    className={`rounded-md border px-2.5 py-1 font-mono text-xs transition-colors ${
                      symbol.toUpperCase() === item.toUpperCase() && snapshot
                        ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent-text)] font-semibold"
                        : "border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {item}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => void loadDemoScenario("scenario-raapl-session-down")}
                  className="rounded-md border border-[var(--warning-border)] bg-[var(--warning-bg)] px-2.5 py-1 font-mono text-xs font-semibold text-[var(--warning)] hover:opacity-90 transition-opacity"
                >
                  Try Demo
                </button>
              </>
            )}
          </div>
        </div>

        {/* Explain rToken definition inline */}
        <p className="mt-3 text-[11px] text-[var(--text-muted)] border-t border-[var(--border-subtle)] pt-2.5">
          <strong className="text-[var(--text-secondary)]">What is an rToken?</strong> A Reality Token (rToken) is a Bitget token that tracks a real-world asset, such as a stock, and can trade 24/7.
        </p>

        {/* Live / Demo Mode Active Banner */}
        {isDemoMode || context?.isDemoFixture ? (
          <div
            role="status"
            className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--warning-border)] bg-[var(--warning-bg)] px-3 py-2 text-xs text-[var(--warning)]"
          >
            <div className="flex items-center gap-2">
              <span className="rounded bg-[var(--warning)] px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                DEMO EXAMPLE
              </span>
              <span className="font-semibold">
                {context?.fixtureLabel ?? "Deterministic Demo Scenario"}
              </span>
              <span className="hidden sm:inline text-xs opacity-90">
                — You’re viewing a clearly labeled example using demo data. It shows how Mirrorline compares an idea with the evidence—it is not live market data.
              </span>
            </div>
            <span className="font-mono text-[11px] font-medium opacity-90">
              Preserved snapshot: {context?.retrievedAt ?? "frozen fixture"}
            </span>
          </div>
        ) : null}

        {error ? (
          <div
            role="alert"
            aria-live="polite"
            className="mt-3 rounded-lg border border-[var(--negative-border)] bg-[var(--negative-bg)] px-4 py-2.5 text-xs text-[var(--negative)]"
          >
            <strong>{isDemoMode ? "Demo fixture error: " : "Market data notice: "}</strong>
            {error}
          </div>
        ) : null}
      </section>

      {/* 3. Empty / Initial Homepage Structure (When no snapshot is loaded yet) */}
      {!snapshot && !loading && !error && (
        <div className="flex flex-col gap-6">
          {/* Friendly invitation & primary actions */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 md:p-8 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-light)] text-[var(--accent)] dark:text-[#86C495] mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl md:text-2xl font-semibold text-[var(--text-primary)]">
              Ready to test your trading idea?
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed">
              Load live Bitget market data for any 24/7 Reality rToken, or try our instant 60-second interactive example to see how Mirrorline separates facts from assumptions.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => void load("rAAPL")}
                className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-xs md:text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors shadow-xs"
              >
                Load live rAAPL data & check my thesis
              </button>
              <button
                type="button"
                onClick={() => void loadDemoScenario("scenario-raapl-session-down")}
                className="rounded-lg border border-[var(--warning-border)] bg-[var(--warning-bg)] px-4 py-2.5 text-xs md:text-sm font-medium text-[var(--warning)] hover:opacity-90 transition-opacity"
              >
                Try the 60-second demo – see how it works
              </button>
              <button
                type="button"
                onClick={() => setIsHelpOpen(true)}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-2.5 text-xs md:text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors"
              >
                Read How Mirrorline Works
              </button>
            </div>
          </section>

          {/* 3-Step Visual Guide */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] font-mono">
              How It Works In 3 Simple Steps
            </h3>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 flex flex-col justify-between">
                <div>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-white font-mono text-xs font-bold mb-3">
                    1
                  </span>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">Choose a Bitget Reality Token</h4>
                  <p className="mt-1.5 text-xs text-[var(--text-secondary)] leading-relaxed">
                    Pick an rToken like rAAPL, rNVDA, or rTSLA. Live market data is fetched directly from Bitget’s 24/7 markets.
                  </p>
                </div>
              </div>
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 flex flex-col justify-between">
                <div>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-white font-mono text-xs font-bold mb-3">
                    2
                  </span>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">Review the available evidence</h4>
                  <p className="mt-1.5 text-xs text-[var(--text-secondary)] leading-relaxed">
                    See verified prices, 24h ticker changes, and derived sessions classified into FACT, INFERENCE, ASSUMPTION, and UNKNOWN.
                  </p>
                </div>
              </div>
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 flex flex-col justify-between">
                <div>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-white font-mono text-xs font-bold mb-3">
                    3
                  </span>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">Test your idea against the data</h4>
                  <p className="mt-1.5 text-xs text-[var(--text-secondary)] leading-relaxed">
                    Enter what you believe (e.g. price direction, session, spread). The engine scores whether evidence supports or challenges your idea.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* "What you can do here" Section */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] font-mono">
              What You Can Do Here
            </h3>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-[var(--border)] p-4 hover:border-[var(--accent)] transition-colors">
                <div className="text-lg font-semibold text-[var(--text-primary)]">1. Check market evidence</div>
                <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                  Understand what the available Bitget data shows. Inspect direct prices, order books, and underlying market states without guessing.
                </p>
              </div>
              <div className="rounded-lg border border-[var(--border)] p-4 hover:border-[var(--accent)] transition-colors">
                <div className="text-lg font-semibold text-[var(--text-primary)]">2. Test your idea</div>
                <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                  Compare your own interpretation with the evidence and see where it holds up, where it is challenged, and where information is missing.
                </p>
              </div>
              <div className="rounded-lg border border-[var(--border)] p-4 hover:border-[var(--accent)] transition-colors">
                <div className="text-lg font-semibold text-[var(--text-primary)]">3. Compare and review</div>
                <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                  Examine multiple tokens separately with independent timestamps, track your thesis revisions, and export clean audit reports.
                </p>
              </div>
            </div>
          </section>

          {/* Who this is for & Who this is not for */}
          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-[var(--positive-border)] bg-[var(--positive-bg)] p-5">
              <h3 className="font-semibold text-[var(--positive)] font-mono text-xs uppercase tracking-wide">
                ✓ Who Mirrorline Is For
              </h3>
              <ul className="mt-3 space-y-2 text-xs text-[var(--text-primary)]">
                <li className="flex items-start gap-2">
                  <span className="text-[var(--positive)] font-bold">✓</span>
                  <span><strong>Thoughtful traders:</strong> Anyone who wants to test their assumptions against real Bitget market evidence before acting.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--positive)] font-bold">✓</span>
                  <span><strong>Research-driven investigators:</strong> Those seeking clear auditability of what data is established and what remains unknown.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--positive)] font-bold">✓</span>
                  <span><strong>Reality rToken explorers:</strong> Anyone learning how 24/7 token trading differs from traditional equity market hours.</span>
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-[var(--negative-border)] bg-[var(--negative-bg)] p-5">
              <h3 className="font-semibold text-[var(--negative)] font-mono text-xs uppercase tracking-wide">
                ✕ Who Mirrorline Is NOT For
              </h3>
              <ul className="mt-3 space-y-2 text-xs text-[var(--text-primary)]">
                <li className="flex items-start gap-2">
                  <span className="text-[var(--negative)] font-bold">✕</span>
                  <span><strong>People looking for buy/sell signals:</strong> Mirrorline never tells you what to buy, sell, or trade.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--negative)] font-bold">✕</span>
                  <span><strong>People expecting guaranteed returns:</strong> We make no price forecasts or promises of profitability.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--negative)] font-bold">✕</span>
                  <span><strong>Automated trading execution:</strong> There is no wallet connection, order execution, or trade placement.</span>
                </li>
              </ul>
            </div>
          </section>
        </div>
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
          <nav aria-label="Workspace Tabs" className="flex border-b border-[var(--border)] bg-[var(--bg-card)] rounded-t-xl overflow-x-auto shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-2 border-b-2 py-3 px-5 font-mono text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === "overview"
                  ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-light)]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <span>1. Overview & Brief</span>
              {brief && (
                <span className="rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]">
                  {brief.tensions.length} mismatches
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("challenge")}
              className={`flex items-center gap-2 border-b-2 py-3 px-5 font-mono text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === "challenge"
                  ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-light)]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <span>2. Test My Idea</span>
              {challenge && (
                <span className="rounded-full bg-[var(--accent-light)] px-2 py-0.5 text-[10px] text-[var(--accent)]">
                  {challenge.assessments.length} claims
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("compare")}
              className={`flex items-center gap-2 border-b-2 py-3 px-5 font-mono text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === "compare"
                  ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-light)]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <span>3. Compare Symbols</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("export")}
              className={`flex items-center gap-2 border-b-2 py-3 px-5 font-mono text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === "export"
                  ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-light)]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
                <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] dark:text-[#86C495]">
                        Market Investigation Brief
                      </p>
                      <h2 className="mt-1 text-base font-semibold text-[var(--text-primary)]">
                        What does the data show for {context?.tokenSymbol ?? symbol}?
                      </h2>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-xs text-[var(--text-muted)]">
                      <span>Observed: {brief.retrievedAt}</span>
                    </div>
                  </div>

                  {/* Evidence coverage summary pills & Plain English Legend */}
                  {pack && (
                    <div className="mt-4 flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-[var(--text-secondary)]">Evidence Breakdown:</span>
                        <span className="rounded-md border border-[var(--info-border)] bg-[var(--info-bg)] px-2 py-0.5 font-mono text-[11px] text-[var(--info)]" title="FACT: directly shown by the available data">
                          FACT {pack.summary.fact}
                        </span>
                        <span className="rounded-md border border-[var(--accent-border)] bg-[var(--accent-light)] px-2 py-0.5 font-mono text-[11px] text-[var(--accent-text)]" title="INFERENCE: a conclusion drawn from the data, not directly stated by it">
                          INFERENCE {pack.summary.inference}
                        </span>
                        <span className="rounded-md border border-[var(--warning-border)] bg-[var(--warning-bg)] px-2 py-0.5 font-mono text-[11px] text-[var(--warning)]" title="ASSUMPTION: something being taken as true but not yet verified">
                          ASSUMPTION {pack.summary.assumption}
                        </span>
                        <span className="rounded-md border border-[var(--border)] bg-[var(--bg-subtle)] px-2 py-0.5 font-mono text-[11px] text-[var(--text-secondary)]" title="UNKNOWN: the available evidence does not establish an answer">
                          UNKNOWN {pack.summary.unknown}
                        </span>
                        {pack.summary.stale > 0 && (
                          <span className="rounded-md border border-[var(--warning-border)] bg-[var(--warning-bg)] px-2 py-0.5 font-mono text-[11px] text-[var(--warning)]" title="STALE: timestamp older than freshness window">
                            STALE {pack.summary.stale}
                          </span>
                        )}
                      </div>

                      {/* 5-second Plain-English classification legend */}
                      <div className="mt-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3 text-[11px] text-[var(--text-secondary)] grid gap-1 sm:grid-cols-2 lg:grid-cols-4">
                        <div><strong className="text-[var(--info)]">FACT:</strong> Directly shown by data</div>
                        <div><strong className="text-[var(--accent)] dark:text-[#86C495]">INFERENCE:</strong> Derived calculation</div>
                        <div><strong className="text-[var(--warning)]">ASSUMPTION:</strong> Unverified convention</div>
                        <div><strong className="text-[var(--text-muted)]">UNKNOWN:</strong> Data doesn&apos;t answer yet</div>
                      </div>
                    </div>
                  )}

                  {/* Actions shortcut */}
                  <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={() => setActiveTab("challenge")}
                      className="rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[var(--accent-hover)] transition-colors shadow-xs"
                    >
                      Test my own idea against this data →
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("compare")}
                      className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors"
                    >
                      Compare Across Symbols
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("export")}
                      className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors"
                    >
                      Preview Report Export
                    </button>
                  </div>
                </section>
              ) : null}

              {/* Investigation Brief */}
              <InvestigationBriefPanel brief={brief} hideHeader={true} />

              {/* Next Step Banner After Demo Results */}
              {isDemoMode && (
                <div className="rounded-xl border border-[var(--accent-border)] bg-[var(--accent-light)] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">Ready to test a real token?</h4>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Switch to Live Bitget Mode to test current market prices and order books for live Reality tokens.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDemoMode(false);
                        void load("rAAPL");
                      }}
                      className="rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[var(--accent-hover)] transition-colors shadow-xs"
                    >
                      Switch to Live rAAPL
                    </button>
                    <button
                      type="button"
                      onClick={() => void loadDemoScenario("scenario-rnvda-overnight-up")}
                      className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      Try rNVDA Scenario
                    </button>
                  </div>
                </div>
              )}

              {/* Progressive Disclosure: Technical Evidence Pack and Market Context */}
              <details className="group rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden shadow-xs">
                <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-[var(--accent)] dark:text-[#86C495]">TECHNICAL AUDITABILITY</span>
                    <span className="text-[var(--text-primary)]">Detailed Evidence Pack & Raw Market Fields</span>
                    {pack && (
                      <span className="text-[10px] text-[var(--text-muted)]">({pack.items.length} items)</span>
                    )}
                  </div>
                  <span className="font-mono text-[11px] text-[var(--accent)] dark:text-[#86C495] group-open:rotate-180 transition-transform">
                    ▼
                  </span>
                </summary>
                <div className="border-t border-[var(--border)] p-4 flex flex-col gap-6">
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
      <details className="group rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden shadow-xs">
        <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] transition-colors">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase text-[var(--text-muted)]">Technical Verification</span>
            <span className="text-xs text-[var(--text-secondary)]">Bitget API Verification Checks & Token Directory</span>
            {summary && (
              <span className="text-[10px] text-[var(--text-muted)]">({summary.passed} passed)</span>
            )}
          </div>
          <span className="font-mono text-[10px] text-[var(--text-muted)] group-open:rotate-180 transition-transform">
            ▼
          </span>
        </summary>
        <div className="border-t border-[var(--border)] p-4">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)]">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                <h2 className="text-xs font-medium text-[var(--text-primary)]">Verification checks</h2>
                {summary ? (
                  <p className="font-mono text-[11px] text-[var(--text-secondary)]">
                    {summary.passed} passed · {summary.failed} failed · {summary.skipped} skipped
                  </p>
                ) : (
                  <p className="text-[11px] text-[var(--text-muted)]">Waiting for Bitget…</p>
                )}
              </div>
              <div className="divide-y divide-[var(--border)]">
                {report?.checks.map((check) => (
                  <article key={check.id} className="px-4 py-3">
                    <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="text-xs text-[var(--text-primary)]">{check.title}</h3>
                        <p className="mt-0.5 font-mono text-[10px] text-[var(--text-muted)]">{check.endpoint}</p>
                      </div>
                      <span className={`w-fit rounded-full border px-2 py-0.2 font-mono text-[10px] uppercase ${statusColor(check.status)}`}>
                        {check.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">{check.detail}</p>
                  </article>
                ))}
                {loading && !report ? (
                  <p className="px-4 py-6 text-xs text-[var(--text-secondary)]">Reading market conditions from Bitget.</p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)]">
                <div className="border-b border-[var(--border)] px-4 py-3">
                  <h2 className="text-xs font-medium text-[var(--text-primary)]">
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
                      className="h-8 w-full rounded border border-[var(--border)] bg-[var(--bg-secondary)] px-2.5 text-xs outline-none focus:border-[var(--accent)]"
                      placeholder="Filter by rNVDA, AAPL, Tesla…"
                      aria-label="Filter instruments"
                    />
                  </form>
                </div>
                <ul className="max-h-60 overflow-auto">
                  {instruments.length === 0 ? (
                    <li className="px-4 py-4 text-xs text-[var(--text-secondary)]">No Reality instruments matched that filter.</li>
                  ) : (
                    instruments.map((item) => (
                      <li key={item.symbol}>
                        <button
                          type="button"
                          onClick={() => {
                            setSymbol(item.tokenSymbol);
                            void load(item.tokenSymbol, query);
                          }}
                          className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-[var(--bg-subtle)]"
                        >
                          <span>
                            <span className="font-mono text-xs text-[var(--text-primary)]">{item.tokenSymbol}</span>
                            <span className="ml-2 text-[11px] text-[var(--text-muted)]">
                              {item.displayName ?? item.underlyingSymbol}
                            </span>
                          </span>
                          <span className="font-mono text-[10px] text-[var(--text-secondary)]">{item.status}</span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-xs text-[var(--text-secondary)]">
                <h2 className="mb-1 text-xs font-medium text-[var(--text-primary)]">Provider notes</h2>
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

      {/* 7. Footer: Short prominent disclaimer paragraph & credibility line */}
      <footer className="mt-8 border-t border-[var(--border)] pt-6 pb-12 flex flex-col gap-4 text-xs text-[var(--text-secondary)]">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-2xs">
          <p className="font-medium text-[var(--text-primary)]">
            Mirrorline is a free research tool. It never tells you to buy or sell, and it cannot guarantee an outcome. It helps you examine the available evidence, assumptions, and unknowns so you can make your own decisions.
          </p>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-[11px] text-[var(--text-muted)]">
          <div>
            <span>Mirrorline Research Desk · Built for the Bitget AI Hackathon Genesis Season 2 using Bitget Reality rToken public APIs.</span>
          </div>
          <div className="flex items-center gap-3 font-mono">
            <span>Free research tool</span>
            <span>·</span>
            <span>No buy/sell signals</span>
            <span>·</span>
            <span>No trade execution</span>
            <span>·</span>
            <button
              type="button"
              onClick={() => setIsHelpOpen(true)}
              className="text-[var(--accent)] dark:text-[#86C495] hover:underline"
            >
              Evaluator Guide
            </button>
          </div>
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
    tone === "positive"
      ? "text-[var(--positive)]"
      : tone === "negative"
        ? "text-[var(--negative)]"
        : "text-[var(--text-primary)]";
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 shadow-xs">
      <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)] font-mono">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${mono ? "font-mono" : ""} ${color}`}>{value}</p>
      {hint ? (
        <p className="mt-1 font-mono text-[10px] uppercase text-[var(--text-muted)] truncate" title={hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
