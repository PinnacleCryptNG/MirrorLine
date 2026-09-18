"use client";

import { useMemo, useState } from "react";
import { StructuredClaimComposer } from "@/components/structured-claim-composer";
import { buildEvidencePack } from "@/lib/evidence/pack";
import { buildInvestigationBrief } from "@/lib/brief/generate";
import type { EvidencePack } from "@/lib/evidence/types";
import type { InvestigationBrief } from "@/lib/brief/types";
import type { MarketContext, MarketSnapshotPayload } from "@/lib/market/types";
import type { StructuredClaim } from "@/lib/challenge/types";
import { createStructuredClaim } from "@/lib/composer";
import { SUPPORTED_DEMO_SYMBOLS } from "@/lib/fixtures";
import {
  MAX_COMPARISON_SYMBOLS,
  SUGGESTED_COMPARE_SYMBOLS,
  assembleComparisonReport,
  parseComparisonSymbol,
  serializeComparisonReportHtml,
  serializeComparisonReportJson,
  serializeComparisonReportMarkdown,
  type ComparisonReport,
} from "@/lib/compare";

type SlotStatus = "idle" | "loading" | "loaded" | "error";

interface SymbolSlot {
  requested: string;
  pair: string;
  tokenSymbol: string;
  status: SlotStatus;
  error: string | null;
  pack: EvidencePack | null;
  brief: InvestigationBrief | null;
  context: MarketContext | null;
}

function snapshotContext(snapshot: MarketSnapshotPayload | Record<string, unknown> | null): MarketContext | null {
  if (!snapshot || typeof snapshot !== "object" || !("context" in snapshot)) {
    return null;
  }
  const context = snapshot.context;
  return context && typeof context === "object" ? (context as MarketContext) : null;
}

function downloadFile(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function statusColor(status: string) {
  if (status === "supported") return "border-[#36D399]/40 bg-[#36D399]/10 text-[#36D399]";
  if (status === "challenged") return "border-[#FF6B7A]/40 bg-[#FF6B7A]/10 text-[#FF6B7A]";
  if (status === "unsupported") return "border-[#F4C95D]/40 bg-[#F4C95D]/10 text-[#F4C95D]";
  if (status === "unavailable" || status === "error") return "border-[#626B7A]/40 bg-[#171B24] text-[#9BA3B2]";
  return "border-[#8B7CFF]/40 bg-[#8B7CFF]/10 text-[#8B7CFF]";
}

export function MultiSymbolComparisonPanel() {
  const [slots, setSlots] = useState<SymbolSlot[]>([]);
  const [draft, setDraft] = useState("rNVDA");
  const [claims, setClaims] = useState<StructuredClaim[]>([]);
  const [freeText, setFreeText] = useState("");
  const [comparison, setComparison] = useState<ComparisonReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"load" | "run" | null>(null);
  const [useDemoMode, setUseDemoMode] = useState(false);

  const endpointFor = (tokenSymbol: string) =>
    useDemoMode
      ? `/api/market/demo/snapshot/${encodeURIComponent(tokenSymbol)}`
      : `/api/market/snapshot/${encodeURIComponent(tokenSymbol)}`;

  const addSymbol = (raw: string) => {
    setError(null);
    if (slots.length >= MAX_COMPARISON_SYMBOLS) {
      setError(`A comparison is limited to ${MAX_COMPARISON_SYMBOLS} rTokens.`);
      return;
    }
    try {
      const parsed = parseComparisonSymbol(raw);
      if (slots.some((slot) => slot.pair === parsed.pair)) {
        setError(`Duplicate symbol '${parsed.tokenSymbol}'. Each column must be a distinct rToken.`);
        return;
      }
      setSlots((current) => [
        ...current,
        {
          requested: parsed.requested,
          pair: parsed.pair,
          tokenSymbol: parsed.tokenSymbol,
          status: "idle",
          error: null,
          pack: null,
          brief: null,
          context: null,
        },
      ]);
      setDraft("");
      setComparison(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add that symbol.");
    }
  };

  const loadSingleSnapshot = async (pair: string) => {
    const slot = slots.find((s) => s.pair === pair);
    if (!slot) return;
    setError(null);
    setSlots((current) =>
      current.map((s) => (s.pair === pair ? { ...s, status: "loading", error: null } : s))
    );
    try {
      const response = await fetch(endpointFor(slot.tokenSymbol), {
        cache: "no-store",
      });
      const json = (await response.json()) as MarketSnapshotPayload & { message?: string };
      if (!response.ok) {
        setSlots((current) =>
          current.map((s) =>
            s.pair === pair
              ? {
                  ...s,
                  status: "error",
                  error: json.message ?? `Snapshot request failed (${response.status})`,
                  pack: null,
                  brief: null,
                  context: null,
                }
              : s
          )
        );
        return;
      }
      const context = snapshotContext(json);
      if (!context) {
        setSlots((current) =>
          current.map((s) =>
            s.pair === pair
              ? {
                  ...s,
                  status: "error",
                  error: "Snapshot did not include a market context.",
                  pack: null,
                  brief: null,
                  context: null,
                }
              : s
          )
        );
        return;
      }
      const pack = buildEvidencePack(context);
      const brief = buildInvestigationBrief(pack);
      const updatedSlots = slots.map((s) =>
        s.pair === pair
          ? {
              ...s,
              status: "loaded" as const,
              error: null,
              pack,
              brief,
              context,
            }
          : s
      );
      setSlots(updatedSlots);
      if (comparison && (claims.length > 0 || freeText.trim())) {
        try {
          const report = assembleComparisonReport({
            symbols: updatedSlots.map((s) => ({
              requestedSymbol: s.tokenSymbol,
              pack: s.pack,
              brief: s.brief,
              error: s.error ?? (s.status === "loaded" ? null : "Evidence snapshot was not loaded for this symbol."),
            })),
            claims,
            freeText: freeText.trim() || undefined,
          });
          setComparison(report);
        } catch {
          // Keep prior report if reassembly fails
        }
      }
    } catch (err) {
      setSlots((current) =>
        current.map((s) =>
          s.pair === pair
            ? {
                ...s,
                status: "error",
                error: err instanceof Error ? err.message : "Unable to load this snapshot.",
                pack: null,
                brief: null,
                context: null,
              }
            : s
        )
      );
    }
  };

  const loadSnapshots = async () => {
    if (slots.length < 2) {
      setError("Select at least two rTokens to compare.");
      return;
    }
    setBusy("load");
    setError(null);
    setComparison(null);
    setSlots((current) => current.map((slot) => ({ ...slot, status: "loading", error: null })));
    const next = await Promise.all(
      slots.map(async (slot) => {
        const loading: SymbolSlot = { ...slot, status: "loading", error: null };
        try {
          const response = await fetch(endpointFor(slot.tokenSymbol), {
            cache: "no-store",
          });
          const json = (await response.json()) as MarketSnapshotPayload & { message?: string };
          if (!response.ok) {
            return {
              ...loading,
              status: "error" as const,
              error: json.message ?? `Snapshot request failed (${response.status})`,
              pack: null,
              brief: null,
              context: null,
            };
          }
          const context = snapshotContext(json);
          if (!context) {
            return {
              ...loading,
              status: "error" as const,
              error: "Snapshot did not include a market context.",
              pack: null,
              brief: null,
              context: null,
            };
          }
          const pack = buildEvidencePack(context);
          const brief = buildInvestigationBrief(pack);
          return {
            ...loading,
            status: "loaded" as const,
            error: null,
            pack,
            brief,
            context,
          };
        } catch (err) {
          return {
            ...loading,
            status: "error" as const,
            error: err instanceof Error ? err.message : "Unable to load this snapshot.",
            pack: null,
            brief: null,
            context: null,
          };
        }
      }),
    );
    setSlots(next);
    setBusy(null);
  };

  const loadDemoComparison = async () => {
    setUseDemoMode(true);
    setBusy("load");
    setError(null);
    setComparison(null);

    const demoPairSymbols = ["rAAPL", "rNVDA"];
    const initialSlots: SymbolSlot[] = demoPairSymbols.map((sym) => {
      const parsed = parseComparisonSymbol(sym);
      return {
        requested: parsed.requested,
        pair: parsed.pair,
        tokenSymbol: parsed.tokenSymbol,
        status: "loading",
        error: null,
        pack: null,
        brief: null,
        context: null,
      };
    });
    setSlots(initialSlots);

    try {
      const loaded = await Promise.all(
        initialSlots.map(async (slot) => {
          const res = await fetch(`/api/market/demo/snapshot/${encodeURIComponent(slot.tokenSymbol)}`, {
            cache: "no-store",
          });
          const json = (await res.json()) as MarketSnapshotPayload & { message?: string };
          if (!res.ok) {
            return {
              ...slot,
              status: "error" as const,
              error: json.message ?? "Demo snapshot failed",
            };
          }
          const ctx = snapshotContext(json);
          if (!ctx) {
            return {
              ...slot,
              status: "error" as const,
              error: "Missing market context in demo snapshot",
            };
          }
          const pack = buildEvidencePack(ctx);
          const brief = buildInvestigationBrief(pack);
          return {
            ...slot,
            status: "loaded" as const,
            error: null,
            pack,
            brief,
            context: ctx,
          };
        }),
      );
      setSlots(loaded);

      const demoClaims: StructuredClaim[] = [
        createStructuredClaim("price.change24h", 0),
        createStructuredClaim("session.us", 1),
        createStructuredClaim("reference.tape", 2),
      ];
      demoClaims[0].fields = { sign: "down" };
      demoClaims[1].fields = { state: "regular" };
      demoClaims[2].fields = { comparison: "divergence" };
      setClaims(demoClaims);

      const report = assembleComparisonReport({
        symbols: loaded.map((s) => ({
          requestedSymbol: s.tokenSymbol,
          pack: s.pack,
          brief: s.brief,
          error: s.error ?? (s.status === "loaded" ? null : "Snapshot not loaded"),
        })),
        claims: demoClaims,
      });
      setComparison(report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load demo comparison.");
    } finally {
      setBusy(null);
    }
  };

  const handleClaimsChange = (nextClaims: StructuredClaim[]) => {
    setClaims(nextClaims);
    if (comparison && slots.length >= 2 && (nextClaims.length > 0 || freeText.trim())) {
      try {
        const report = assembleComparisonReport({
          symbols: slots.map((slot) => ({
            requestedSymbol: slot.tokenSymbol,
            pack: slot.pack,
            brief: slot.brief,
            error: slot.error ?? (slot.status === "loaded" ? null : "Evidence snapshot was not loaded for this symbol."),
          })),
          claims: nextClaims,
          freeText: freeText.trim() || undefined,
        });
        setComparison(report);
      } catch {
        // Intermediate edit states can be manually scored via Run comparison
      }
    }
  };

  const handleFreeTextChange = (nextFreeText: string) => {
    setFreeText(nextFreeText);
    if (comparison && slots.length >= 2 && (claims.length > 0 || nextFreeText.trim())) {
      try {
        const report = assembleComparisonReport({
          symbols: slots.map((slot) => ({
            requestedSymbol: slot.tokenSymbol,
            pack: slot.pack,
            brief: slot.brief,
            error: slot.error ?? (slot.status === "loaded" ? null : "Evidence snapshot was not loaded for this symbol."),
          })),
          claims,
          freeText: nextFreeText.trim() || undefined,
        });
        setComparison(report);
      } catch {
        // Ignore intermediate edit error
      }
    }
  };

  const runComparison = () => {
    if (slots.length < 2) {
      setError("Select at least two rTokens to compare.");
      return;
    }
    if (claims.length === 0 && !freeText.trim()) {
      setError("Add at least one shared structured claim.");
      return;
    }
    setBusy("run");
    setError(null);
    try {
      const report = assembleComparisonReport({
        symbols: slots.map((slot) => ({
          requestedSymbol: slot.tokenSymbol,
          pack: slot.pack,
          brief: slot.brief,
          error: slot.error ?? (slot.status === "loaded" ? null : "Evidence snapshot was not loaded for this symbol."),
        })),
        claims,
        freeText: freeText.trim() || undefined,
      });
      setComparison(report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to assemble the comparison.");
    } finally {
      setBusy(null);
    }
  };

  const exportReport = (format: "markdown" | "json" | "html" | "print") => {
    if (!comparison) {
      setError("Run the comparison against the loaded snapshots before exporting.");
      return;
    }
    setError(null);
    if (format === "markdown") {
      downloadFile("mirrorline-comparison.md", serializeComparisonReportMarkdown(comparison), "text/markdown;charset=utf-8");
      return;
    }
    if (format === "json") {
      downloadFile("mirrorline-comparison.json", serializeComparisonReportJson(comparison), "application/json;charset=utf-8");
      return;
    }
    const html = serializeComparisonReportHtml(comparison);
    if (format === "html") {
      downloadFile("mirrorline-comparison.html", html, "text/html;charset=utf-8");
      return;
    }
    const popup = window.open("", "_blank", "width=1000,height=800");
    if (!popup) {
      setError("The browser blocked the print window. Allow popups for this site, or download the HTML report to print.");
      return;
    }
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  const loadedCount = slots.filter((slot) => slot.status === "loaded").length;
  const failedCount = slots.filter((slot) => slot.status === "error").length;
  const timestamps = useMemo(
    () => slots.filter((slot) => slot.pack).map((slot) => slot.pack?.investigation.retrievedAt),
    [slots],
  );

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-xl border border-[#252B36] bg-[#10131A] px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-data text-xs tracking-[0.24em] text-[#8B7CFF]">MULTI-SYMBOL COMPARISON · NON-ADVISORY</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setUseDemoMode((prev) => !prev);
                setError(null);
              }}
              className={`rounded-full border px-3 py-0.5 font-data text-xs transition-colors ${
                useDemoMode
                  ? "border-[#F4C95D] bg-[#F4C95D]/10 text-[#F4C95D]"
                  : "border-[#252B36] bg-[#171B24] text-[#9BA3B2] hover:border-[#8B7CFF]"
              }`}
            >
              {useDemoMode ? "◆ Demo Fixture Mode" : "● Live Bitget Mode"}
            </button>
            <button
              type="button"
              onClick={loadDemoComparison}
              disabled={busy !== null}
              className="rounded-full border border-[#8B7CFF]/50 bg-[#8B7CFF]/10 px-3 py-0.5 font-data text-xs text-[#8B7CFF] hover:bg-[#8B7CFF]/20 disabled:opacity-40"
            >
              Load Demo Comparison (rAAPL vs rNVDA)
            </button>
          </div>
        </div>

        <h2 className="mt-2 text-lg font-medium">Compare the same claims across rTokens</h2>
        <p className="mt-1 text-sm text-[#9BA3B2]">
          Each symbol keeps its own evidence snapshot and timestamp. This view does not rank tokens, blend prints, or
          recommend trades. Export uses the currently loaded columns only.
        </p>

        {useDemoMode ? (
          <div className="mt-3 rounded-md border border-[#F4C95D]/40 bg-[#F4C95D]/10 px-3 py-2 text-xs text-[#F4C95D]">
            <strong>DEMO / FIXTURE MODE ACTIVE</strong>: Snapshots will load from deterministic test fixtures ({SUPPORTED_DEMO_SYMBOLS.join(", ")}).
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTED_COMPARE_SYMBOLS.map((item) => {
            const alreadyAdded = slots.some((s) => s.tokenSymbol === item);
            return (
              <button
                key={item}
                type="button"
                disabled={alreadyAdded || slots.length >= MAX_COMPARISON_SYMBOLS}
                className={`rounded-full border px-3 py-1 font-data text-[11px] ${
                  alreadyAdded
                    ? "border-[#252B36] text-[#626B7A] opacity-50 cursor-not-allowed"
                    : "border-[#252B36] text-[#9BA3B2] hover:border-[#8B7CFF] hover:text-[#8B7CFF]"
                }`}
                onClick={() => addSymbol(item)}
              >
                {alreadyAdded ? `✓ ${item}` : `+ ${item}`}
              </button>
            );
          })}
        </div>
        <form
          className="mt-3 flex flex-col gap-2 md:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            if (draft.trim()) {
              addSymbol(draft);
            }
          }}
        >
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={slots.length >= MAX_COMPARISON_SYMBOLS}
            className="h-10 flex-1 rounded-md border border-[#252B36] bg-[#080A0F] px-3 font-data text-sm outline-none focus:border-[#8B7CFF] disabled:opacity-50"
            placeholder={
              slots.length >= MAX_COMPARISON_SYMBOLS
                ? `Maximum ${MAX_COMPARISON_SYMBOLS} symbols reached`
                : "Add rToken (rAAPL or RAAPLUSDT)"
            }
            aria-label="Add comparison rToken"
          />
          <button
            type="submit"
            disabled={slots.length >= MAX_COMPARISON_SYMBOLS || !draft.trim()}
            className="h-10 rounded-md border border-[#252B36] px-4 text-sm text-[#F5F7FA] disabled:opacity-40"
          >
            Add symbol
          </button>
        </form>

        <ul className="mt-3 space-y-2">
          {slots.length === 0 ? (
            <li className="text-sm text-[#9BA3B2]">No symbols yet. Add at least two distinct rTokens.</li>
          ) : (
            slots.map((slot) => (
              <li
                key={slot.pair}
                className="flex flex-col gap-2 rounded-md border border-[#252B36] bg-[#080A0F] px-3 py-2 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-[#F5F7FA]">
                      {slot.tokenSymbol} <span className="font-data text-[11px] text-[#626B7A]">{slot.pair}</span>
                    </p>
                    {slot.context?.isDemoFixture ? (
                      <span className="rounded border border-[#F4C95D]/40 bg-[#F4C95D]/10 px-1.5 py-0.2 font-data text-[10px] text-[#F4C95D]">
                        FIXTURE DATA
                      </span>
                    ) : null}
                  </div>
                  <p className="font-data text-[11px] text-[#9BA3B2]">
                    {slot.status === "loaded"
                      ? `loaded · retrieved ${slot.pack?.investigation.retrievedAt}${slot.context?.isDemoFixture ? " (fixture timestamp)" : ""}`
                      : slot.status === "loading"
                        ? "loading snapshot…"
                        : slot.status === "error"
                          ? `error · ${slot.error}`
                          : "not loaded"}
                    {slot.pack?.summary
                      ? ` · UNKNOWN ${slot.pack.summary.unknown} · stale ${slot.pack.summary.stale}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {slot.status === "loaded" ? (
                    <button
                      type="button"
                      aria-label={`Reload snapshot for ${slot.tokenSymbol}`}
                      disabled={busy !== null}
                      className="font-data text-[11px] text-[#8B7CFF] hover:underline disabled:opacity-40"
                      onClick={() => void loadSingleSnapshot(slot.pair)}
                    >
                      Reload
                    </button>
                  ) : slot.status === "error" ? (
                    <button
                      type="button"
                      aria-label={`Retry loading snapshot for ${slot.tokenSymbol}`}
                      disabled={busy !== null}
                      className="font-data text-[11px] text-[#F4C95D] hover:underline disabled:opacity-40"
                      onClick={() => void loadSingleSnapshot(slot.pair)}
                    >
                      Retry
                    </button>
                  ) : slot.status === "idle" ? (
                    <button
                      type="button"
                      aria-label={`Load snapshot for ${slot.tokenSymbol}`}
                      disabled={busy !== null}
                      className="font-data text-[11px] text-[#5EA7FF] hover:underline disabled:opacity-40"
                      onClick={() => void loadSingleSnapshot(slot.pair)}
                    >
                      Load
                    </button>
                  ) : null}
                  <button
                    type="button"
                    aria-label={`Remove ${slot.tokenSymbol} from comparison`}
                    className="font-data text-[11px] text-[#FF6B7A] hover:underline"
                    onClick={() => {
                      setSlots((current) => current.filter((item) => item.pair !== slot.pair));
                      setComparison(null);
                    }}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
        <p className="mt-2 text-xs text-[#626B7A]">
          Loaded {loadedCount} · failed {failedCount} · selected {slots.length}. Snapshot times stay per column
          {timestamps.length > 1 ? `: ${timestamps.join(" · ")}` : "."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="h-10 rounded-md bg-[#8B7CFF] px-4 text-sm font-medium text-[#080A0F] disabled:opacity-60"
            disabled={busy !== null || slots.length < 2}
            onClick={() => void loadSnapshots()}
          >
            {busy === "load" ? "Loading snapshots…" : "Load snapshots"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[#252B36] bg-[#10131A] px-4 py-4">
        <p className="text-xs uppercase tracking-wide text-[#626B7A]">Shared claims</p>
        <p className="mt-1 text-sm text-[#9BA3B2]">
          These rows are scored separately against each loaded pack. A supported cell on one symbol does not support the
          others.
        </p>
        <div className="mt-3">
          <StructuredClaimComposer claims={claims} onChange={handleClaimsChange} />
        </div>
        <label className="mt-3 flex flex-col gap-1 text-xs uppercase tracking-wide text-[#626B7A]">
          Optional free-text (kept as written)
          <textarea
            value={freeText}
            onChange={(event) => handleFreeTextChange(event.target.value)}
            rows={2}
            className="rounded-md border border-[#252B36] bg-[#080A0F] px-3 py-2 text-sm text-[#F5F7FA] outline-none focus:border-[#8B7CFF]"
            placeholder="The moon phase confirms the move."
          />
        </label>
        <button
          type="button"
          className="mt-3 h-10 rounded-md bg-[#8B7CFF] px-4 text-sm font-medium text-[#080A0F] disabled:opacity-60"
          disabled={busy !== null || slots.length < 2}
          onClick={runComparison}
        >
          {busy === "run" ? "Scoring…" : "Run comparison"}
        </button>
      </div>

      {error ? (
        <p role="alert" aria-live="polite" className="text-sm text-[#FF6B7A]">
          {error}
        </p>
      ) : null}

      {comparison ? (
        <div className="rounded-xl border border-[#252B36] bg-[#10131A] px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium">Comparison table</h3>
            {comparison.isDemoFixture ? (
              <span className="rounded-full border border-[#F4C95D]/40 bg-[#F4C95D]/10 px-2 py-0.5 font-data text-[10px] text-[#F4C95D]">
                DEMO / FIXTURE DATA
              </span>
            ) : null}
          </div>
          {comparison.isDemoFixture ? (
            <div className="mt-2.5 rounded-md border border-[#F4C95D]/40 bg-[#F4C95D]/10 px-3 py-2 text-xs text-[#F4C95D]">
              <strong>DEMO / FIXTURE DATA:</strong> One or more columns were evaluated against frozen fixture snapshots. Timestamps reflect each fixture&apos;s recorded scenario, not live market conditions.
            </div>
          ) : null}
          <p className="mt-2 text-xs text-[#9BA3B2]">
            Created {comparison.createdAt}. This is not a ranking. Unavailable cells are missing evidence, not a
            negative finding.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr>
                  <th className="border border-[#252B36] bg-[#080A0F] px-3 py-2 font-medium">Shared claim</th>
                  {comparison.symbols.map((column) => (
                    <th key={column.key} className="border border-[#252B36] bg-[#080A0F] px-3 py-2 font-medium">
                      <div className="flex items-center gap-1.5">
                        <p>{column.tokenSymbol ?? column.requestedSymbol}</p>
                        {column.isDemoFixture ? (
                          <span className="rounded border border-[#F4C95D]/40 bg-[#F4C95D]/10 px-1 py-0.2 font-data text-[9px] text-[#F4C95D]">
                            FIXTURE
                          </span>
                        ) : null}
                      </div>
                      <p className="font-data text-[10px] font-normal text-[#626B7A]">
                        {column.snapshot?.retrievedAt ?? column.error ?? "not loaded"}
                        {column.snapshot?.stale ? " · stale" : ""}
                      </p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.table.map((row) => (
                  <tr key={row.claim.id}>
                    <th className="border border-[#252B36] px-3 py-2 font-normal text-[#F5F7FA]">
                      <p>{row.renderedText}</p>
                      <p className="mt-1 font-data text-[10px] text-[#626B7A]">{row.claim.kind}</p>
                    </th>
                    {comparison.symbols.map((column) => {
                      const cell = row.cells[column.key];
                      return (
                        <td key={`${row.claim.id}-${column.key}`} className="border border-[#252B36] px-3 py-2 align-top">
                          {cell ? (
                            <>
                              <div className="flex flex-wrap gap-1">
                                {cell.statuses.map((status, index) => (
                                  <span
                                    key={`${status}-${index}`}
                                    className={`rounded-full border px-2 py-0.5 font-data text-[10px] uppercase ${statusColor(status)}`}
                                  >
                                    {status}
                                  </span>
                                ))}
                              </div>
                              <p className="mt-2 text-xs text-[#9BA3B2]">{cell.reasoning}</p>
                              {cell.evidenceIds.length > 0 ? (
                                <details className="mt-2">
                                  <summary className="cursor-pointer font-data text-[10px] uppercase text-[#626B7A]">
                                    Evidence
                                  </summary>
                                  <p className="mt-1 font-data text-[10px] text-[#9BA3B2]">{cell.evidenceIds.join(" · ")}</p>
                                </details>
                              ) : null}
                            </>
                          ) : (
                            <p className="text-xs text-[#626B7A]">—</p>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {comparison.symbols.map((column) => (
              <article key={`notes-${column.key}`} className="rounded-md border border-[#252B36] bg-[#080A0F] px-3 py-3">
                <p className="text-sm text-[#F5F7FA]">{column.tokenSymbol ?? column.requestedSymbol}</p>
                {column.loadStatus !== "loaded" ? (
                  <p className="mt-1 text-xs text-[#F4C95D]">{column.error ?? "Snapshot unavailable"}</p>
                ) : (
                  <>
                    <p className="mt-1 font-data text-[11px] text-[#626B7A]">
                      {column.snapshot?.id} · UNKNOWN {column.classifications?.unknown ?? 0} · failures{" "}
                      {column.failures.length}
                    </p>
                    {column.tensions.length > 0 ? (
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-[#9BA3B2]">
                        {column.tensions.slice(0, 3).map((tension) => (
                          <li key={tension.id}>
                            {tension.severity}: {tension.title}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </>
                )}
              </article>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="h-10 rounded-md border border-[#252B36] px-4 text-sm text-[#F5F7FA] hover:border-[#8B7CFF] focus:outline-none focus:ring-1 focus:ring-[#8B7CFF]"
              onClick={() => exportReport("markdown")}
            >
              Export Markdown
            </button>
            <button
              type="button"
              className="h-10 rounded-md border border-[#252B36] px-4 text-sm text-[#F5F7FA] hover:border-[#8B7CFF] focus:outline-none focus:ring-1 focus:ring-[#8B7CFF]"
              onClick={() => exportReport("json")}
            >
              Export JSON
            </button>
            <button
              type="button"
              className="h-10 rounded-md border border-[#252B36] px-4 text-sm text-[#F5F7FA] hover:border-[#8B7CFF] focus:outline-none focus:ring-1 focus:ring-[#8B7CFF]"
              onClick={() => exportReport("html")}
            >
              Export HTML
            </button>
            <button
              type="button"
              className="h-10 rounded-md border border-[#8B7CFF]/40 px-4 text-sm text-[#8B7CFF] hover:bg-[#8B7CFF]/10 focus:outline-none focus:ring-1 focus:ring-[#8B7CFF]"
              onClick={() => exportReport("print")}
            >
              Print / save as PDF
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
