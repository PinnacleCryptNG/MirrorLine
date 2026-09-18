"use client";

import { useState } from "react";
import type { DemoScenarioId } from "@/lib/fixtures/types";

interface OrientationProps {
  onSelectDemoScenario?: (scenarioId: DemoScenarioId) => void;
  activeScenarioId?: string | null;
  isDemoMode?: boolean;
}

export function FirstTimeOrientation({
  onSelectDemoScenario,
  activeScenarioId,
  isDemoMode,
}: OrientationProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <section
      aria-labelledby="orientation-heading"
      className="rounded-xl border border-[#252B36] bg-[#10131A] overflow-hidden transition-all"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#252B36] px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#8B7CFF]/20 font-data text-xs font-semibold text-[#8B7CFF]">
            i
          </span>
          <div>
            <h2 id="orientation-heading" className="text-sm font-semibold tracking-wide text-[#F5F7FA]">
              Orientation & Evidence Principles
            </h2>
            <p className="text-xs text-[#9BA3B2]">
              Non-advisory decision support for 24/7 Bitget Reality rTokens.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDemoMode ? (
            <span className="rounded-full border border-[#F4C95D]/40 bg-[#F4C95D]/10 px-2.5 py-0.5 font-data text-[11px] font-medium text-[#F4C95D]">
              DEMO / FIXTURE MODE ACTIVE
            </span>
          ) : (
            <span className="rounded-full border border-[#36D399]/40 bg-[#36D399]/10 px-2.5 py-0.5 font-data text-[11px] font-medium text-[#36D399]">
              LIVE BITGET DATA
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            aria-controls="orientation-content"
            aria-label={isOpen ? "Collapse orientation guide" : "Expand orientation guide"}
            className="rounded-md border border-[#252B36] bg-[#171B24] px-3 py-1 font-data text-xs text-[#9BA3B2] hover:border-[#8B7CFF] hover:text-[#F5F7FA]"
          >
            {isOpen ? "Hide guide" : "Show guide"}
          </button>
        </div>
      </div>

      {isOpen && (
        <div id="orientation-content" className="space-y-5 p-4 text-xs md:p-6">
          {/* Section 1: Does vs Does Not Do */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-[#36D399]/20 bg-[#36D399]/5 p-3.5">
              <h3 className="font-semibold text-[#36D399] uppercase tracking-wide text-[11px]">
                What Mirrorline Does
              </h3>
              <ul className="mt-2 space-y-1.5 text-[#9BA3B2]">
                <li className="flex items-start gap-1.5">
                  <span className="text-[#36D399] font-bold">✓</span>
                  <span><strong>Stress-tests interpretations:</strong> Evaluates trader claims strictly against loaded Bitget market context.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[#36D399] font-bold">✓</span>
                  <span><strong>Classifies evidence:</strong> Separates observed FACTs from formulaic INFERENCEs, ASSUMPTIONs, and UNKNOWNs.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[#36D399] font-bold">✓</span>
                  <span><strong>Exposes structural tensions:</strong> Identifies session divergence, stale quotes, and book-depth limitations.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[#36D399] font-bold">✓</span>
                  <span><strong>Preserves audit trail:</strong> Traces every claim to Bitget source fields, endpoints, and timestamps.</span>
                </li>
              </ul>
            </div>

            <div className="rounded-lg border border-[#FF6B7A]/20 bg-[#FF6B7A]/5 p-3.5">
              <h3 className="font-semibold text-[#FF6B7A] uppercase tracking-wide text-[11px]">
                What Mirrorline Deliberately Does NOT Do
              </h3>
              <ul className="mt-2 space-y-1.5 text-[#9BA3B2]">
                <li className="flex items-start gap-1.5">
                  <span className="text-[#FF6B7A] font-bold">✕</span>
                  <span><strong>No buy/sell advice:</strong> Does not recommend trades, entry/exit targets, or position sizing.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[#FF6B7A] font-bold">✕</span>
                  <span><strong>No price predictions:</strong> Does not forecast direction or claim a thesis will be profitable.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[#FF6B7A] font-bold">✕</span>
                  <span><strong>No trade execution:</strong> Has no order placement, wallet keys, or autonomous trading logic.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[#FF6B7A] font-bold">✕</span>
                  <span><strong>No fabricated tape:</strong> Does not invent US underlying prints, news catalysts, or 40-level depth.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Section 2: Key Concepts */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-[#252B36] bg-[#080A0F] p-3.5">
              <h3 className="font-semibold text-[#8B7CFF] uppercase tracking-wide text-[11px]">
                Evidence Classifications
              </h3>
              <div className="mt-2 space-y-2 text-[#9BA3B2]">
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
                  Unanswered question (e.g. live US tape, news catalyst). UNKNOWN means evidence is absent, not that the claim is false.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-[#252B36] bg-[#080A0F] p-3.5">
              <h3 className="font-semibold text-[#8B7CFF] uppercase tracking-wide text-[11px]">
                Claim Assessment Statuses
              </h3>
              <div className="mt-2 space-y-2 text-[#9BA3B2]">
                <p>
                  <span className="rounded border border-[#36D399]/40 bg-[#36D399]/10 px-1.5 py-0.5 font-data text-[10px] text-[#36D399]">
                    supported
                  </span>{" "}
                  Loaded snapshot evidence directly aligns with the claim.{" "}
                  <strong className="text-[#F5F7FA]">
                    Supported by evidence only — not proof of a profitable trading outcome.
                  </strong>
                </p>
                <p>
                  <span className="rounded border border-[#FF6B7A]/40 bg-[#FF6B7A]/10 px-1.5 py-0.5 font-data text-[10px] text-[#FF6B7A]">
                    challenged
                  </span>{" "}
                  Loaded snapshot evidence directly contradicts the claim (e.g. claiming upside when 24h change is negative).
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

          {/* Section 3: Recommended Workflow */}
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

          {/* Section 4: Quick Demo Scenarios */}
          {onSelectDemoScenario && (
            <div className="rounded-lg border border-[#F4C95D]/30 bg-[#F4C95D]/5 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-[#F4C95D] uppercase tracking-wide text-[11px]">
                    Reproducible Demo Fixture Scenarios
                  </h3>
                  <p className="mt-0.5 text-xs text-[#9BA3B2]">
                    Frozen Bitget snapshots with preserved timestamps for deterministic judging and offline verification.
                  </p>
                </div>
                <span className="font-data text-[10px] uppercase text-[#626B7A]">
                  Deterministic · No Live Bitget Calls
                </span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => onSelectDemoScenario("scenario-raapl-session-down")}
                  aria-label="Load rAAPL regular session downside demo fixture"
                  className={`flex flex-col items-start rounded-md border p-2.5 text-left transition-colors ${
                    activeScenarioId === "scenario-raapl-session-down"
                      ? "border-[#8B7CFF] bg-[#8B7CFF]/10"
                      : "border-[#252B36] bg-[#10131A] hover:border-[#8B7CFF]/50"
                  }`}
                >
                  <span className="font-data text-xs font-semibold text-[#F5F7FA]">
                    rAAPL · Regular Session Down
                  </span>
                  <span className="mt-1 text-[11px] text-[#9BA3B2]">
                    -0.43% 24h change · US_REGULAR session · Fresh ticker · Tight spread (2.4 bps)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectDemoScenario("scenario-rnvda-overnight-up")}
                  aria-label="Load rNVDA post-close overnight upside demo fixture"
                  className={`flex flex-col items-start rounded-md border p-2.5 text-left transition-colors ${
                    activeScenarioId === "scenario-rnvda-overnight-up"
                      ? "border-[#8B7CFF] bg-[#8B7CFF]/10"
                      : "border-[#252B36] bg-[#10131A] hover:border-[#8B7CFF]/50"
                  }`}
                >
                  <span className="font-data text-xs font-semibold text-[#F5F7FA]">
                    rNVDA · Overnight Upside
                  </span>
                  <span className="mt-1 text-[11px] text-[#9BA3B2]">
                    +1.20% 24h change · US_CLOSED / overnight · Wider spread · Session divergence tension
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectDemoScenario("scenario-rtsla-weekend-stale")}
                  aria-label="Load rTSLA weekend token session with stale ticker demo fixture"
                  className={`flex flex-col items-start rounded-md border p-2.5 text-left transition-colors ${
                    activeScenarioId === "scenario-rtsla-weekend-stale"
                      ? "border-[#8B7CFF] bg-[#8B7CFF]/10"
                      : "border-[#252B36] bg-[#10131A] hover:border-[#8B7CFF]/50"
                  }`}
                >
                  <span className="font-data text-xs font-semibold text-[#F5F7FA]">
                    rTSLA · Weekend & Stale Ticker
                  </span>
                  <span className="mt-1 text-[11px] text-[#9BA3B2]">
                    WEEKEND session · Stale ticker flag (48s old) · Partial book timeout resilience
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
