"use client";

import { useMemo, useState } from "react";
import { MarketContextPanel } from "@/components/market-context-panel";
import { EvidencePackPanel } from "@/components/evidence-pack-panel";
import { InvestigationBriefPanel } from "@/components/investigation-brief-panel";
import { InterpretationChallengePanel } from "@/components/interpretation-challenge-panel";
import { InvestigationReportPanel } from "@/components/investigation-report-panel";
import { MultiSymbolComparisonPanel } from "@/components/multi-symbol-comparison-panel";
import { FirstTimeOrientation } from "@/components/first-time-orientation";
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

const DEMO_SYMBOLS = ["rAAPL", "rNVDA", "rTSLA", "rMSFT", "rCOIN"];

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
  initialInstrumentTotal: number | null;
  initialSnapshot: MarketSnapshotPayload | Record<string, unknown> | null;
  initialError: string | null;
}) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [query, setQuery] = useState("");
  const [report, setReport] = useState<VerificationReport | null>(initialReport);
  const [instruments, setInstruments] = useState<InstrumentRow[]>(initialInstruments);
  const [instrumentTotal, setInstrumentTotal] = useState<number | null>(initialInstrumentTotal);
  const [snapshot, setSnapshot] = useState<MarketSnapshotPayload | Record<string, unknown> | null>(initialSnapshot);
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState<InterpretationChallenge | null>(null);
  const [revisions, setRevisions] = useState<ThesisRevision[]>([]);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [activeDemoScenarioId, setActiveDemoScenarioId] = useState<string | null>(null);

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
      <header className="flex flex-col gap-4 border-b border-[#252B36] pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-data text-xs tracking-[0.24em] text-[#8B7CFF]">MIRRORLINE · MILESTONE 11</p>
            {isDemoMode ? (
              <span className="rounded-full border border-[#F4C95D]/40 bg-[#F4C95D]/10 px-2 py-0.5 font-data text-[10px] text-[#F4C95D]">
                FIXTURE MODE
              </span>
            ) : null}
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Hackathon Demo & Investigation Desk</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#9BA3B2]">
            Evidence-first, non-advisory investigation desk for 24/7 Bitget Reality rTokens. Features reproducible demo
            fixtures with preserved timestamps and live market verification.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                const nextMode = !isDemoMode;
                setIsDemoMode(nextMode);
                setError(null);
                if (nextMode && !activeDemoScenarioId) {
                  void loadDemoScenario("scenario-raapl-session-down");
                } else if (!nextMode) {
                  void load(symbol);
                }
              }}
              aria-label={isDemoMode ? "Switch to live Bitget data" : "Switch to reproducible demo fixture mode"}
              className={`rounded-full border px-3 py-1 font-data text-xs transition-colors ${
                isDemoMode
                  ? "border-[#F4C95D] bg-[#F4C95D]/10 text-[#F4C95D]"
                  : "border-[#252B36] bg-[#171B24] text-[#9BA3B2] hover:border-[#8B7CFF]"
              }`}
            >
              {isDemoMode ? "◆ Demo Fixture Mode" : "● Live Bitget Mode"}
            </button>
          </div>
          <form
            className="flex w-full flex-col gap-2 md:w-auto md:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              void load(symbol, query);
            }}
          >
            <input
              value={symbol}
              onChange={(event) => setSymbol(event.target.value)}
              className="h-10 rounded-md border border-[#252B36] bg-[#10131A] px-3 font-data text-sm outline-none focus:border-[#8B7CFF]"
              placeholder={isDemoMode ? "rAAPL, rNVDA, rTSLA" : "rAAPL or RAAPLUSDT"}
              aria-label="rToken symbol"
            />
            <button
              type="submit"
              className="h-10 rounded-md bg-[#8B7CFF] px-4 text-sm font-medium text-[#080A0F] disabled:opacity-60"
              disabled={loading}
            >
              {loading ? (isDemoMode ? "Loading fixture…" : "Reading Bitget…") : isDemoMode ? "Load fixture" : "Verify live data"}
            </button>
          </form>
        </div>
      </header>

      {/* First-time user orientation and guide */}
      <FirstTimeOrientation
        onSelectDemoScenario={loadDemoScenario}
        activeScenarioId={activeDemoScenarioId}
        isDemoMode={isDemoMode}
      />

      {/* Unmistakable Demo Fixture Banner */}
      {isDemoMode || context?.isDemoFixture ? (
        <div
          role="status"
          className="rounded-lg border border-[#F4C95D]/40 bg-[#F4C95D]/10 px-4 py-3 text-sm text-[#F4C95D]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="rounded bg-[#F4C95D] px-2 py-0.5 font-data text-[10px] font-bold text-[#080A0F]">
                DEMO / FIXTURE DATA
              </span>
              <span className="font-semibold text-xs md:text-sm">
                Scenario active: {context?.fixtureLabel ?? "Deterministic Demo Fixture"}
              </span>
            </div>
            <span className="font-data text-xs text-[#F4C95D]/80">
              Preserved timestamp: {context?.retrievedAt ?? "frozen snapshot"}
            </span>
          </div>
          <p className="mt-1 text-xs text-[#F4C95D]/90">
            This snapshot uses fixed fixture data for reproducible hackathon demonstration. It was not retrieved from live Bitget APIs.
          </p>
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-4">
        <Stat
          label={isDemoMode ? "Demo mode instruments" : "Discovered rTokens"}
          value={isDemoMode ? "3 fixtures" : instrumentTotal === null ? "—" : String(instrumentTotal)}
        />
        <Stat
          label="Last price"
          value={lastDisplay}
          mono
          hint={last ? `${context?.isDemoFixture ? "fixture · " : ""}${last.kind} · ${last.status}` : undefined}
        />
        <Stat
          label="24h change"
          value={changeNumber === undefined ? "—" : `${(changeNumber * 100).toFixed(2)}%`}
          tone={changeNumber === undefined ? "muted" : changeNumber >= 0 ? "positive" : "negative"}
          hint={change ? `${context?.isDemoFixture ? "fixture · " : ""}${change.kind} · ${change.status}` : undefined}
        />
        <Stat
          label="US session"
          value={typeof session?.value === "string" ? session.value : "UNKNOWN"}
          hint={session ? `${context?.isDemoFixture ? "fixture · " : ""}${session.kind} · ${session.status}` : undefined}
        />
      </section>

      {error ? (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-lg border border-[#FF6B7A]/40 bg-[#FF6B7A]/10 px-4 py-3 text-sm text-[#FF6B7A]"
        >
          {isDemoMode ? "Demo fixture unavailable: " : "Market data unavailable: "}
          {error}
        </div>
      ) : null}

      <section className="flex flex-wrap gap-2">
        {isDemoMode ? (
          <>
            <span className="self-center font-data text-xs text-[#626B7A]">Demo fixtures:</span>
            {DEMO_SCENARIO_LIST.map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                onClick={() => void loadDemoScenario(scenario.id)}
                className={`rounded-full border px-3 py-1 font-data text-xs transition-colors ${
                  activeDemoScenarioId === scenario.id || symbol === scenario.symbol
                    ? "border-[#F4C95D] bg-[#F4C95D]/10 text-[#F4C95D]"
                    : "border-[#252B36] text-[#9BA3B2] hover:border-[#8B7CFF]"
                }`}
              >
                {scenario.title}
              </button>
            ))}
          </>
        ) : (
          <>
            <span className="self-center font-data text-xs text-[#626B7A]">Live quick-pick:</span>
            {DEMO_SYMBOLS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setSymbol(item);
                  void load(item, query);
                }}
                className={`rounded-full border px-3 py-1 font-data text-xs ${
                  symbol.toUpperCase().includes(item.slice(1).toUpperCase())
                    ? "border-[#8B7CFF] text-[#8B7CFF]"
                    : "border-[#252B36] text-[#9BA3B2]"
                }`}
              >
                {item}
              </button>
            ))}
          </>
        )}
      </section>

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

      <MultiSymbolComparisonPanel />

      <InvestigationReportPanel
        pack={pack}
        brief={brief}
        context={context}
        challenge={challenge}
        revisions={revisions}
      />

      <InvestigationBriefPanel brief={brief} />

      <EvidencePackPanel pack={pack} />

      <MarketContextPanel context={context} failures={failures} />

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border border-[#252B36] bg-[#10131A]">
          <div className="flex items-center justify-between border-b border-[#252B36] px-4 py-3">
            <h2 className="text-sm font-medium">Verification checks</h2>
            {summary ? (
              <p className="font-data text-xs text-[#9BA3B2]">
                {summary.passed} passed · {summary.failed} failed · {summary.skipped} skipped
              </p>
            ) : (
              <p className="text-xs text-[#626B7A]">Waiting for Bitget…</p>
            )}
          </div>
          <div className="divide-y divide-[#252B36]">
            {report?.checks.map((check) => (
              <article key={check.id} className="px-4 py-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-sm">{check.title}</h3>
                    <p className="mt-1 font-data text-[11px] text-[#626B7A]">{check.endpoint}</p>
                  </div>
                  <span className={`w-fit rounded-full border px-2 py-0.5 font-data text-[11px] uppercase ${statusColor(check.status)}`}>
                    {check.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[#9BA3B2]">{check.detail}</p>
              </article>
            ))}
            {loading && !report ? (
              <p className="px-4 py-6 text-sm text-[#9BA3B2]">Reading market conditions from Bitget.</p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-[#252B36] bg-[#10131A]">
            <div className="border-b border-[#252B36] px-4 py-3">
              <h2 className="text-sm font-medium">Discovered instruments</h2>
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
                  className="h-9 w-full rounded-md border border-[#252B36] bg-[#080A0F] px-3 text-sm outline-none focus:border-[#8B7CFF]"
                  placeholder="Filter by rNVDA, AAPL, Tesla…"
                  aria-label="Filter instruments"
                />
              </form>
            </div>
            <ul className="max-h-80 overflow-auto">
              {instruments.length === 0 ? (
                <li className="px-4 py-6 text-sm text-[#9BA3B2]">No Reality instruments matched that filter.</li>
              ) : (
                instruments.map((item) => (
                  <li key={item.symbol}>
                    <button
                      type="button"
                      onClick={() => {
                        setSymbol(item.tokenSymbol);
                        void load(item.tokenSymbol, query);
                      }}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-[#171B24]"
                    >
                      <span>
                        <span className="font-data text-sm">{item.tokenSymbol}</span>
                        <span className="ml-2 text-xs text-[#626B7A]">
                          {item.displayName ?? item.underlyingSymbol}
                        </span>
                      </span>
                      <span className="font-data text-[11px] text-[#9BA3B2]">{item.status}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-[#252B36] bg-[#10131A] px-4 py-3 text-sm text-[#9BA3B2]">
            <h2 className="mb-2 text-sm font-medium text-[#F5F7FA]">Provider notes</h2>
            <ul className="space-y-2">
              {(report?.notes ?? ["Verification has not completed yet."]).map((note) => (
                <li key={note}>• {note}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
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
      <p className="text-xs uppercase tracking-wide text-[#626B7A]">{label}</p>
      <p className={`mt-1 text-xl ${mono ? "font-data" : ""} ${color}`}>{value}</p>
      {hint ? <p className="mt-1 font-data text-[11px] uppercase text-[#626B7A]">{hint}</p> : null}
    </div>
  );
}
