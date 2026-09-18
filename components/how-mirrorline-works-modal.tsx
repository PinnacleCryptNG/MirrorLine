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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border border-[#252B36] bg-[#10131A] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#252B36] px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#8B7CFF]/20 font-data text-xs font-semibold text-[#8B7CFF]">
              ?
            </span>
            <div>
              <h2 id="how-mirrorline-works-title" className="text-base font-semibold text-[#F5F7FA]">
                How Mirrorline Works
              </h2>
              <p className="text-xs text-[#9BA3B2]">
                Evidence-first, non-advisory investigation framework for Reality rTokens
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help guide"
            className="rounded-md p-1.5 text-[#9BA3B2] hover:bg-[#171B24] hover:text-[#F5F7FA]"
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
        <div className="flex border-b border-[#252B36] bg-[#080A0F] px-6">
          <button
            type="button"
            onClick={() => setActiveTab("principles")}
            className={`border-b-2 py-3 px-4 font-data text-xs font-medium transition-colors ${
              activeTab === "principles"
                ? "border-[#8B7CFF] text-[#8B7CFF]"
                : "border-transparent text-[#9BA3B2] hover:text-[#F5F7FA]"
            }`}
          >
            Principles & Workflow
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("walkthrough")}
            className={`border-b-2 py-3 px-4 font-data text-xs font-medium transition-colors ${
              activeTab === "walkthrough"
                ? "border-[#8B7CFF] text-[#8B7CFF]"
                : "border-transparent text-[#9BA3B2] hover:text-[#F5F7FA]"
            }`}
          >
            3–5 Min Evaluator Walkthrough
          </button>
        </div>

        {/* Body content with scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-[#9BA3B2]">
          {activeTab === "principles" ? (
            <>
              {/* Does vs Does Not Do */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-[#36D399]/20 bg-[#36D399]/5 p-3.5">
                  <h3 className="font-semibold text-[#36D399] uppercase tracking-wide text-[11px]">
                    What Mirrorline Does
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    <li className="flex items-start gap-1.5">
                      <span className="text-[#36D399] font-bold">✓</span>
                      <span>
                        <strong className="text-[#F5F7FA]">Stress-tests interpretations:</strong> Evaluates trader claims
                        strictly against loaded Bitget market context.
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-[#36D399] font-bold">✓</span>
                      <span>
                        <strong className="text-[#F5F7FA]">Classifies evidence:</strong> Separates observed FACTs from
                        formulaic INFERENCEs, convention ASSUMPTIONs, and explicit UNKNOWNs.
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-[#36D399] font-bold">✓</span>
                      <span>
                        <strong className="text-[#F5F7FA]">Exposes structural tensions:</strong> Identifies session
                        divergence (e.g. overnight token trading vs closed US equity), stale quotes, and book limitations.
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-[#36D399] font-bold">✓</span>
                      <span>
                        <strong className="text-[#F5F7FA]">Preserves provenance audit trail:</strong> Traces every claim
                        to Bitget source fields, endpoints, and observation timestamps.
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-lg border border-[#FF6B7A]/20 bg-[#FF6B7A]/5 p-3.5">
                  <h3 className="font-semibold text-[#FF6B7A] uppercase tracking-wide text-[11px]">
                    What Mirrorline Deliberately Does NOT Do
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    <li className="flex items-start gap-1.5">
                      <span className="text-[#FF6B7A] font-bold">✕</span>
                      <span>
                        <strong className="text-[#F5F7FA]">No buy/sell advice:</strong> Does not recommend trades, entry
                        points, price targets, or sizing.
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-[#FF6B7A] font-bold">✕</span>
                      <span>
                        <strong className="text-[#F5F7FA]">No price predictions:</strong> Does not forecast direction or
                        claim a thesis will prove profitable.
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-[#FF6B7A] font-bold">✕</span>
                      <span>
                        <strong className="text-[#F5F7FA]">No trade execution:</strong> Has no order placement, private
                        wallet keys, or autonomous trading agents.
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-[#FF6B7A] font-bold">✕</span>
                      <span>
                        <strong className="text-[#F5F7FA]">No fabricated data:</strong> Does not invent US underlying
                        tape prints, news catalysts, or 40-level depth.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Classifications & Assessment Statuses */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-[#252B36] bg-[#080A0F] p-3.5">
                  <h3 className="font-semibold text-[#8B7CFF] uppercase tracking-wide text-[11px]">
                    Evidence Classifications
                  </h3>
                  <div className="mt-2 space-y-2">
                    <p>
                      <span className="rounded border border-[#5EA7FF]/40 bg-[#5EA7FF]/10 px-1.5 py-0.5 font-data text-[10px] text-[#5EA7FF]">
                        FACT
                      </span>{" "}
                      Directly returned Bitget payload field (last price, 24h ticker, candle OHLC, session windows).
                    </p>
                    <p>
                      <span className="rounded border border-[#8B7CFF]/40 bg-[#8B7CFF]/10 px-1.5 py-0.5 font-data text-[10px] text-[#8B7CFF]">
                        INFERENCE
                      </span>{" "}
                      Formulaic calculation strictly over facts (spread in bps, derived session state, bar close vs open).
                    </p>
                    <p>
                      <span className="rounded border border-[#F4C95D]/40 bg-[#F4C95D]/10 px-1.5 py-0.5 font-data text-[10px] text-[#F4C95D]">
                        ASSUMPTION
                      </span>{" "}
                      Convention-based mapping (e.g. rAAPL → AAPL) without Bitget confirmation. Not verified proof.
                    </p>
                    <p>
                      <span className="rounded border border-[#626B7A]/40 bg-[#171B24] px-1.5 py-0.5 font-data text-[10px] text-[#9BA3B2]">
                        UNKNOWN
                      </span>{" "}
                      Unanswered question (e.g. live US tape, news catalyst). UNKNOWN means evidence is absent, not that
                      the claim is false.
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-[#252B36] bg-[#080A0F] p-3.5">
                  <h3 className="font-semibold text-[#8B7CFF] uppercase tracking-wide text-[11px]">
                    Claim Assessment Statuses
                  </h3>
                  <div className="mt-2 space-y-2">
                    <p>
                      <span className="rounded border border-[#36D399]/40 bg-[#36D399]/10 px-1.5 py-0.5 font-data text-[10px] text-[#36D399]">
                        supported
                      </span>{" "}
                      Loaded snapshot evidence directly aligns with the claim.{" "}
                      <strong className="text-[#F5F7FA]">
                        Supported by evidence only — not proof of a profitable outcome.
                      </strong>
                    </p>
                    <p>
                      <span className="rounded border border-[#FF6B7A]/40 bg-[#FF6B7A]/10 px-1.5 py-0.5 font-data text-[10px] text-[#FF6B7A]">
                        challenged
                      </span>{" "}
                      Loaded snapshot evidence contradicts the claim (e.g. claiming upside when 24h change is negative).
                    </p>
                    <p>
                      <span className="rounded border border-[#F4C95D]/40 bg-[#F4C95D]/10 px-1.5 py-0.5 font-data text-[10px] text-[#F4C95D]">
                        unsupported
                      </span>{" "}
                      Loaded snapshot lacks evidence to verify or disprove the claim. Remains unverified.
                    </p>
                    <p>
                      <span className="rounded border border-[#8B7CFF]/40 bg-[#8B7CFF]/10 px-1.5 py-0.5 font-data text-[10px] text-[#8B7CFF]">
                        unassessed
                      </span>{" "}
                      Claim parameters cannot be scored by the deterministic engine (e.g. intraday timeframe vs 24h change).
                    </p>
                  </div>
                </div>
              </div>

              {/* 5-Step Workflow */}
              <div className="rounded-lg border border-[#252B36] bg-[#080A0F] p-3.5">
                <h3 className="font-semibold text-[#8B7CFF] uppercase tracking-wide text-[11px]">
                  Intended 5-Step Investigation Workflow
                </h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5 font-data text-[11px]">
                  <div className="rounded border border-[#252B36] bg-[#10131A] p-2">
                    <span className="text-[#8B7CFF] font-bold">1. Load Snapshot</span>
                    <p className="mt-1 text-[#9BA3B2]">Verify live Bitget data or select a deterministic fixture.</p>
                  </div>
                  <div className="rounded border border-[#252B36] bg-[#10131A] p-2">
                    <span className="text-[#8B7CFF] font-bold">2. Inspect Evidence</span>
                    <p className="mt-1 text-[#9BA3B2]">Examine FACTs, freshness windows, and explicit UNKNOWNs.</p>
                  </div>
                  <div className="rounded border border-[#252B36] bg-[#10131A] p-2">
                    <span className="text-[#8B7CFF] font-bold">3. Compose Claims</span>
                    <p className="mt-1 text-[#9BA3B2]">Add structured claims (direction, session, spread, tape).</p>
                  </div>
                  <div className="rounded border border-[#252B36] bg-[#10131A] p-2">
                    <span className="text-[#8B7CFF] font-bold">4. Challenge & Revise</span>
                    <p className="mt-1 text-[#9BA3B2]">Score claims, review attack points, and track thesis revision diffs.</p>
                  </div>
                  <div className="rounded border border-[#252B36] bg-[#10131A] p-2">
                    <span className="text-[#8B7CFF] font-bold">5. Compare or Export</span>
                    <p className="mt-1 text-[#9BA3B2]">Score across symbols or export non-advisory JSON/MD/HTML.</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-[#8B7CFF]/30 bg-[#8B7CFF]/5 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-[#8B7CFF] uppercase tracking-wide text-[11px]">
                      3–5 Minute Evaluator Walkthrough
                    </h3>
                    <p className="mt-0.5 text-xs text-[#9BA3B2]">
                      Fast, reproducible evaluation path using deterministic demo fixtures. Requires zero API keys and does
                      not rely on live market movements.
                    </p>
                  </div>
                  <span className="rounded border border-[#8B7CFF]/40 bg-[#8B7CFF]/10 px-2 py-0.5 font-data text-[10px] text-[#8B7CFF]">
                    DETERMINISTIC PATH
                  </span>
                </div>
                <ol className="mt-4 space-y-3 text-xs text-[#9BA3B2]">
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#8B7CFF]/20 font-data text-[11px] font-bold text-[#8B7CFF]">
                      A
                    </span>
                    <div>
                      <strong className="text-[#F5F7FA]">Load a demo scenario:</strong> Select{" "}
                      <code className="text-[#F4C95D]">rAAPL · Regular Session Down</code> using the Demo buttons on the desk.
                      Notice the prominent amber <code className="text-[#F4C95D]">DEMO / FIXTURE DATA</code> badge and
                      preserved timestamp.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#8B7CFF]/20 font-data text-[11px] font-bold text-[#8B7CFF]">
                      B
                    </span>
                    <div>
                      <strong className="text-[#F5F7FA]">Inspect evidence classification:</strong> Expand the{" "}
                      <em className="text-[#F5F7FA]">Detailed Evidence & Provenance</em> section. Observe{" "}
                      <span className="text-[#5EA7FF]">FACT</span> (direct ticker fields),{" "}
                      <span className="text-[#8B7CFF]">INFERENCE</span> (derived session & spread),{" "}
                      <span className="text-[#F4C95D]">ASSUMPTION</span> (mapping conventions), and{" "}
                      <span className="text-[#9BA3B2]">UNKNOWN</span> (unavailable US tape & news).
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#8B7CFF]/20 font-data text-[11px] font-bold text-[#8B7CFF]">
                      C
                    </span>
                    <div>
                      <strong className="text-[#F5F7FA]">Compose and challenge a structured claim:</strong> In the Claims &
                      Challenge tab, select <code className="text-[#8B7CFF]">24h price change</code> is{" "}
                      <code className="text-[#8B7CFF]">down</code> and run the challenge. Observe it is marked{" "}
                      <span className="text-[#36D399]">supported</span> because the 24h change is -0.43%.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#8B7CFF]/20 font-data text-[11px] font-bold text-[#8B7CFF]">
                      D
                    </span>
                    <div>
                      <strong className="text-[#F5F7FA]">Revise the claim:</strong> Change direction from{" "}
                      <code className="text-[#8B7CFF]">down</code> to <code className="text-[#8B7CFF]">up</code> and click{" "}
                      <em className="text-[#F5F7FA]">Revise and re-challenge</em>. Observe that the claim is now{" "}
                      <span className="text-[#FF6B7A]">challenged</span> and a revision diff is recorded in the history panel.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#8B7CFF]/20 font-data text-[11px] font-bold text-[#8B7CFF]">
                      E
                    </span>
                    <div>
                      <strong className="text-[#F5F7FA]">Multi-symbol comparison:</strong> Switch to the{" "}
                      <em className="text-[#F5F7FA]">Compare Symbols</em> tab and click{" "}
                      <code className="text-[#8B7CFF]">Load Demo Comparison (rAAPL vs rNVDA)</code>. Observe the side-by-side
                      comparison table where independent timestamps are preserved per column with explicit fixture tags.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#8B7CFF]/20 font-data text-[11px] font-bold text-[#8B7CFF]">
                      F
                    </span>
                    <div>
                      <strong className="text-[#F5F7FA]">Export non-advisory report:</strong> In the Export tab, click{" "}
                      <em className="text-[#F5F7FA]">Preview report</em> or export to Markdown/HTML/JSON. Confirm the report
                      includes the unmistakable <code className="text-[#F4C95D]">DEMO / FIXTURE DATA</code> disclaimer and
                      preserved snapshot timestamps.
                    </div>
                  </li>
                </ol>
              </div>

              {onSelectDemoScenario && (
                <div className="rounded-lg border border-[#F4C95D]/30 bg-[#F4C95D]/5 p-3.5">
                  <h4 className="font-semibold text-[#F4C95D] uppercase tracking-wide text-[11px]">
                    Quick Demo Scenario Launcher
                  </h4>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectDemoScenario("scenario-raapl-session-down");
                        onClose();
                      }}
                      className={`flex flex-col items-start rounded-md border p-2 text-left transition-colors ${
                        activeScenarioId === "scenario-raapl-session-down"
                          ? "border-[#8B7CFF] bg-[#8B7CFF]/10"
                          : "border-[#252B36] bg-[#10131A] hover:border-[#8B7CFF]/50"
                      }`}
                    >
                      <span className="font-data text-xs font-semibold text-[#F5F7FA]">rAAPL Down</span>
                      <span className="mt-0.5 text-[10px] text-[#9BA3B2]">Regular session, -0.43% change</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectDemoScenario("scenario-rnvda-overnight-up");
                        onClose();
                      }}
                      className={`flex flex-col items-start rounded-md border p-2 text-left transition-colors ${
                        activeScenarioId === "scenario-rnvda-overnight-up"
                          ? "border-[#8B7CFF] bg-[#8B7CFF]/10"
                          : "border-[#252B36] bg-[#10131A] hover:border-[#8B7CFF]/50"
                      }`}
                    >
                      <span className="font-data text-xs font-semibold text-[#F5F7FA]">rNVDA Overnight Up</span>
                      <span className="mt-0.5 text-[10px] text-[#9BA3B2]">US_CLOSED, +1.20% move</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectDemoScenario("scenario-rtsla-weekend-stale");
                        onClose();
                      }}
                      className={`flex flex-col items-start rounded-md border p-2 text-left transition-colors ${
                        activeScenarioId === "scenario-rtsla-weekend-stale"
                          ? "border-[#8B7CFF] bg-[#8B7CFF]/10"
                          : "border-[#252B36] bg-[#10131A] hover:border-[#8B7CFF]/50"
                      }`}
                    >
                      <span className="font-data text-xs font-semibold text-[#F5F7FA]">rTSLA Stale & Weekend</span>
                      <span className="mt-0.5 text-[10px] text-[#9BA3B2]">48s old ticker, partial book</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#252B36] bg-[#080A0F] px-6 py-3">
          <p className="font-data text-[11px] text-[#626B7A]">
            Bitget AI Hackathon Genesis Season 2 · Non-Advisory Decision Support
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-[#8B7CFF] px-4 py-1.5 text-xs font-medium text-[#080A0F] hover:bg-[#8B7CFF]/90"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
