"use client";

import { useState } from "react";
import type { DemoScenarioId } from "@/lib/fixtures/types";

interface HowMirrorlineWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDemoScenario?: (scenarioId: DemoScenarioId) => void;
  activeScenarioId?: string | null;
}

export function HowMirrorlineWorksModal({
  isOpen,
  onClose,
  onSelectDemoScenario,
  activeScenarioId,
}: HowMirrorlineWorksModalProps) {
  const [activeTab, setActiveTab] = useState<"principles" | "walkthrough">("principles");

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-mirrorline-works-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-2xl overflow-hidden text-[var(--text-primary)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-light)] font-mono text-xs font-bold text-[var(--accent)] dark:text-[#86C495]">
              ?
            </span>
            <div>
              <h2 id="how-mirrorline-works-title" className="text-base font-semibold text-[var(--text-primary)]">
                How Mirrorline Works
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Evidence-first, non-advisory investigation framework for Reality rTokens
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help guide"
            className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-[var(--border)] bg-[var(--bg-subtle)] px-6">
          <button
            type="button"
            onClick={() => setActiveTab("principles")}
            className={`border-b-2 py-3 px-4 font-mono text-xs font-medium transition-colors ${
              activeTab === "principles"
                ? "border-[var(--accent)] text-[var(--accent)] dark:text-[#86C495]"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Principles & Workflow
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("walkthrough")}
            className={`border-b-2 py-3 px-4 font-mono text-xs font-medium transition-colors ${
              activeTab === "walkthrough"
                ? "border-[var(--accent)] text-[var(--accent)] dark:text-[#86C495]"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            3–5 Min Evaluator Walkthrough
          </button>
        </div>

        {/* Body content with scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-[var(--text-secondary)]">
          {activeTab === "principles" ? (
            <>
              {/* Does vs Does Not Do */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-[var(--positive-border)] bg-[var(--positive-bg)] p-4">
                  <h3 className="font-semibold text-[var(--positive)] uppercase tracking-wide text-[11px] font-mono">
                    What Mirrorline Does
                  </h3>
                  <ul className="mt-2.5 space-y-2">
                    <li className="flex items-start gap-1.5">
                      <span className="text-[var(--positive)] font-bold">✓</span>
                      <span>
                        <strong className="text-[var(--text-primary)]">Tests your ideas:</strong> Evaluates your claims strictly against verified Bitget market data.
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-[var(--positive)] font-bold">✓</span>
                      <span>
                        <strong className="text-[var(--text-primary)]">Classifies evidence:</strong> Separates observed FACTs from formulaic INFERENCEs, convention ASSUMPTIONs, and explicit UNKNOWNs.
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-[var(--positive)] font-bold">✓</span>
                      <span>
                        <strong className="text-[var(--text-primary)]">Exposes mismatches & gaps:</strong> Identifies session divergence (e.g. 24/7 token trading vs closed US equity), stale quotes, and book limitations.
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-[var(--positive)] font-bold">✓</span>
                      <span>
                        <strong className="text-[var(--text-primary)]">Full source provenance:</strong> Traces every claim directly to Bitget endpoints, fields, and observation timestamps.
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-lg border border-[var(--negative-border)] bg-[var(--negative-bg)] p-4">
                  <h3 className="font-semibold text-[var(--negative)] uppercase tracking-wide text-[11px] font-mono">
                    What Mirrorline Deliberately Does NOT Do
                  </h3>
                  <ul className="mt-2.5 space-y-2">
                    <li className="flex items-start gap-1.5">
                      <span className="text-[var(--negative)] font-bold">✕</span>
                      <span>
                        <strong className="text-[var(--text-primary)]">No buy/sell advice:</strong> Never tells you what to buy, sell, or hold.
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-[var(--negative)] font-bold">✕</span>
                      <span>
                        <strong className="text-[var(--text-primary)]">No price predictions:</strong> Makes no promises of profit or forecasts of market direction.
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-[var(--negative)] font-bold">✕</span>
                      <span>
                        <strong className="text-[var(--text-primary)]">No trade execution:</strong> Does not connect to wallets, place orders, or execute trades.
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-[var(--negative)] font-bold">✕</span>
                      <span>
                        <strong className="text-[var(--text-primary)]">No fabricated data:</strong> Never invents US underlying stock tape prints, news catalysts, or Reality depth.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Classifications & Assessment Statuses */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] p-4">
                  <h3 className="font-semibold text-[var(--accent)] dark:text-[#86C495] uppercase tracking-wide text-[11px] font-mono">
                    Evidence Classifications
                  </h3>
                  <div className="mt-2.5 space-y-2">
                    <p>
                      <span className="rounded border border-[var(--info-border)] bg-[var(--info-bg)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--info)] font-bold">
                        FACT
                      </span>{" "}
                      Directly shown by available data (last price, 24h ticker, candle OHLC, session windows).
                    </p>
                    <p>
                      <span className="rounded border border-[var(--accent-border)] bg-[var(--accent-light)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--accent-text)] font-bold">
                        INFERENCE
                      </span>{" "}
                      A conclusion drawn from the data, not directly stated by it (spread in bps, derived session state).
                    </p>
                    <p>
                      <span className="rounded border border-[var(--warning-border)] bg-[var(--warning-bg)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--warning)] font-bold">
                        ASSUMPTION
                      </span>{" "}
                      Something taken as true but not yet verified (e.g. rAAPL → Apple Inc. mapping).
                    </p>
                    <p>
                      <span className="rounded border border-[var(--border)] bg-[var(--bg-card)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-secondary)] font-bold">
                        UNKNOWN
                      </span>{" "}
                      The available evidence does not establish an answer. Unanswered, not false.
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] p-4">
                  <h3 className="font-semibold text-[var(--accent)] dark:text-[#86C495] uppercase tracking-wide text-[11px] font-mono">
                    Claim Assessment Statuses
                  </h3>
                  <div className="mt-2.5 space-y-2">
                    <p>
                      <span className="rounded border border-[var(--positive-border)] bg-[var(--positive-bg)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--positive)] font-bold">
                        supported
                      </span>{" "}
                      Matches available evidence in the current snapshot.
                    </p>
                    <p>
                      <span className="rounded border border-[var(--negative-border)] bg-[var(--negative-bg)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--negative)] font-bold">
                        challenged
                      </span>{" "}
                      Contradicted or limited by market data in the pack.
                    </p>
                    <p>
                      <span className="rounded border border-[var(--warning-border)] bg-[var(--warning-bg)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--warning)] font-bold">
                        unsupported
                      </span>{" "}
                      Lacks evidence in the current snapshot to verify or disprove.
                    </p>
                    <p>
                      <span className="rounded border border-[var(--border)] bg-[var(--bg-card)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-secondary)] font-bold">
                        unassessed
                      </span>{" "}
                      Could not be mapped reliably from the input.
                    </p>
                  </div>
                </div>
              </div>

              {/* 5-Step Workflow */}
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] p-4">
                <h3 className="font-semibold text-[var(--accent)] dark:text-[#86C495] uppercase tracking-wide text-[11px] font-mono">
                  Intended 5-Step Investigation Workflow
                </h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5 font-mono text-[11px]">
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-2.5">
                    <span className="text-[var(--accent)] dark:text-[#86C495] font-bold">1. Load Snapshot</span>
                    <p className="mt-1 text-[var(--text-secondary)]">Verify live Bitget data or select a deterministic fixture.</p>
                  </div>
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-2.5">
                    <span className="text-[var(--accent)] dark:text-[#86C495] font-bold">2. Inspect Evidence</span>
                    <p className="mt-1 text-[var(--text-secondary)]">Examine FACTs, freshness windows, and explicit UNKNOWNs.</p>
                  </div>
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-2.5">
                    <span className="text-[var(--accent)] dark:text-[#86C495] font-bold">3. Compose Claims</span>
                    <p className="mt-1 text-[var(--text-secondary)]">Add structured claims (direction, session, spread, tape).</p>
                  </div>
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-2.5">
                    <span className="text-[var(--accent)] dark:text-[#86C495] font-bold">4. Challenge & Revise</span>
                    <p className="mt-1 text-[var(--text-secondary)]">Score claims, review attack points, and track revision diffs.</p>
                  </div>
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-2.5">
                    <span className="text-[var(--accent)] dark:text-[#86C495] font-bold">5. Compare or Export</span>
                    <p className="mt-1 text-[var(--text-secondary)]">Score across symbols or export non-advisory JSON/MD/HTML.</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-[var(--accent-border)] bg-[var(--accent-light)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-[var(--accent)] dark:text-[#86C495] uppercase tracking-wide text-[11px] font-mono">
                      3–5 Minute Evaluator Walkthrough
                    </h3>
                    <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                      Fast, reproducible evaluation path using deterministic demo fixtures. Requires zero API keys and does not rely on live market movements.
                    </p>
                  </div>
                  <span className="rounded border border-[var(--accent-border)] bg-[var(--bg-card)] px-2 py-0.5 font-mono text-[10px] text-[var(--accent)] font-bold">
                    DETERMINISTIC PATH
                  </span>
                </div>
                <ol className="mt-4 space-y-3 text-xs text-[var(--text-secondary)]">
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] font-mono text-[11px] font-bold text-white">
                      A
                    </span>
                    <div>
                      <strong className="text-[var(--text-primary)]">Load a demo scenario:</strong> Click{" "}
                      <code className="text-[var(--warning)]">Try Demo</code> or switch to Demo mode. Notice the amber{" "}
                      <code className="text-[var(--warning)]">DEMO / FIXTURE DATA</code> badge and preserved timestamp.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] font-mono text-[11px] font-bold text-white">
                      B
                    </span>
                    <div>
                      <strong className="text-[var(--text-primary)]">Inspect evidence classification:</strong> Expand{" "}
                      <em className="text-[var(--text-primary)]">Detailed Evidence & Provenance</em>. Observe{" "}
                      <span className="text-[var(--info)] font-bold">FACT</span>,{" "}
                      <span className="text-[var(--accent)] font-bold">INFERENCE</span>,{" "}
                      <span className="text-[var(--warning)] font-bold">ASSUMPTION</span>, and{" "}
                      <span className="text-[var(--text-muted)] font-bold">UNKNOWN</span>.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] font-mono text-[11px] font-bold text-white">
                      C
                    </span>
                    <div>
                      <strong className="text-[var(--text-primary)]">Compose and challenge a structured claim:</strong> In the Claims & Challenge tab, select 24h price change is down and run the challenge. Observe it is marked{" "}
                      <span className="text-[var(--positive)] font-bold">supported</span> because 24h change is -0.43%.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] font-mono text-[11px] font-bold text-white">
                      D
                    </span>
                    <div>
                      <strong className="text-[var(--text-primary)]">Revise the claim:</strong> Change direction from down to up and click Revise & re-test. Observe that the claim is now{" "}
                      <span className="text-[var(--negative)] font-bold">challenged</span> and a revision diff is recorded in the history panel.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] font-mono text-[11px] font-bold text-white">
                      E
                    </span>
                    <div>
                      <strong className="text-[var(--text-primary)]">Multi-symbol comparison:</strong> Switch to Compare Symbols tab, click Evaluate Multi-Symbol Claims across rAAPL and rNVDA. Observe independent per-symbol timestamps.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] font-mono text-[11px] font-bold text-white">
                      F
                    </span>
                    <div>
                      <strong className="text-[var(--text-primary)]">Export investigation report:</strong> Switch to Export Report tab, preview the non-advisory report, and verify that the demo warning banner is preserved.
                    </div>
                  </li>
                </ol>
              </div>

              {/* Direct Demo Selectors */}
              {onSelectDemoScenario && (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] p-3.5">
                  <p className="font-mono text-[11px] uppercase tracking-wide text-[var(--text-secondary)]">
                    Quickly launch a demo fixture:
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectDemoScenario("scenario-raapl-session-down");
                        onClose();
                      }}
                      className={`rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors ${
                        activeScenarioId === "scenario-raapl-session-down"
                          ? "border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning)] font-semibold"
                          : "border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--warning-border)] hover:text-[var(--warning)]"
                      }`}
                    >
                      rAAPL · Regular Session Down
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectDemoScenario("scenario-rnvda-overnight-up");
                        onClose();
                      }}
                      className={`rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors ${
                        activeScenarioId === "scenario-rnvda-overnight-up"
                          ? "border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning)] font-semibold"
                          : "border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--warning-border)] hover:text-[var(--warning)]"
                      }`}
                    >
                      rNVDA · Overnight Up
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectDemoScenario("scenario-rtsla-weekend-stale");
                        onClose();
                      }}
                      className={`rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors ${
                        activeScenarioId === "scenario-rtsla-weekend-stale"
                          ? "border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning)] font-semibold"
                          : "border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--warning-border)] hover:text-[var(--warning)]"
                      }`}
                    >
                      rTSLA · Weekend Stale
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--bg-subtle)] px-6 py-3 text-[11px] text-[var(--text-muted)]">
          <span>Bitget AI Hackathon Genesis Season 2 · Evaluator Resource</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[var(--accent)] px-4 py-1.5 font-mono text-xs font-medium text-white hover:bg-[var(--accent-hover)] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
