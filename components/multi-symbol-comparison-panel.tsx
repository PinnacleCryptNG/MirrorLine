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
  if (status === "supported")
    return "border-[var(--positive-border)] bg-[var(--positive-bg)] text-[var(--positive)]";
  if (status === "challenged")
    return "border-[var(--negative-border)] bg-[var(--negative-bg)] text-[var(--negative)]";
  if (status === "unsupported")
    return "border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning)]";
  if (status === "unavailable" || status === "error")
    return "border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-muted)]";
  return "border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]";
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

  const removeSymbol = (pair: string) => {
    setSlots((current) => current.filter((slot) => slot.pair !== pair));
    setComparison(null);
  };

  const loadAllSnapshots = async () => {
    if (slots.length === 0) return;
    setBusy("load");
    setError(null);
    setSlots((current) =>
      current.map((slot) => (slot.status === "loaded" ? slot : { ...slot, status: "loading", error: null }))
    );
    try {
      const results = await Promise.all(
        slots.map(async (slot) => {
          try {
            const response = await fetch(endpointFor(slot.tokenSymbol), {
              cache: "no-store",
            });
            const json = (await response.json()) as MarketSnapshotPayload & { message?: string };
            if (!response.ok) {
              return {
                ...slot,
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
                ...slot,
                status: "error" as const,
                error: "Snapshot payload did not contain market context.",
                pack: null,
                brief: null,
                context: null,
              };
            }
            const pack = buildEvidencePack(context);
            const brief = buildInvestigationBrief(pack);
            return {
              ...slot,
              status: "loaded" as const,
              error: null,
              pack,
              brief,
              context,
            };
          } catch (err) {
            return {
              ...slot,
              status: "error" as const,
              error: err instanceof Error ? err.message : "Network error loading snapshot.",
              pack: null,
              brief: null,
              context: null,
            };
          }
        })
      );
      setSlots(results);
    } finally {
      setBusy(null);
    }
  };

  const loadDemoComparison = async () => {
    setUseDemoMode(true);
    setBusy("load");
    setError(null);
    try {
      const demoPairs = [
        { requested: "rAAPL", pair: "rAAPLUSDT", tokenSymbol: "rAAPL" },
        { requested: "rNVDA", pair: "rNVDAUSDT", tokenSymbol: "rNVDA" },
      ];
      const nextSlots: SymbolSlot[] = demoPairs.map((p) => ({
        ...p,
        status: "loading",
        error: null,
        pack: null,
        brief: null,
        context: null,
      }));
      setSlots(nextSlots);

      const [resAAPL, resNVDA] = await Promise.all([
        fetch("/api/market/demo/snapshot/rAAPL", { cache: "no-store" }),
        fetch("/api/market/demo/snapshot/rNVDA", { cache: "no-store" }),
      ]);
      const jsonAAPL = await resAAPL.json();
      const jsonNVDA = await resNVDA.json();

      const ctxAAPL = snapshotContext(jsonAAPL);
      const ctxNVDA = snapshotContext(jsonNVDA);

      const packAAPL = ctxAAPL ? buildEvidencePack(ctxAAPL) : null;
      const briefAAPL = packAAPL ? buildInvestigationBrief(packAAPL) : null;

      const packNVDA = ctxNVDA ? buildEvidencePack(ctxNVDA) : null;
      const briefNVDA = packNVDA ? buildInvestigationBrief(packNVDA) : null;

      const resolvedSlots: SymbolSlot[] = [
        {
          requested: "rAAPL",
          pair: "rAAPLUSDT",
          tokenSymbol: "rAAPL",
          status: ctxAAPL ? "loaded" : "error",
          error: ctxAAPL ? null : "Failed to load rAAPL demo fixture",
          pack: packAAPL,
          brief: briefAAPL,
          context: ctxAAPL,
        },
        {
          requested: "rNVDA",
          pair: "rNVDAUSDT",
          tokenSymbol: "rNVDA",
          status: ctxNVDA ? "loaded" : "error",
          error: ctxNVDA ? null : "Failed to load rNVDA demo fixture",
          pack: packNVDA,
          brief: briefNVDA,
          context: ctxNVDA,
        },
      ];
      setSlots(resolvedSlots);

      const claim1 = createStructuredClaim("price.direction", 0);
      claim1.fields = { direction: "down", timeframe: "24h" };
      const claim2 = createStructuredClaim("session.us", 1);
      claim2.fields = { state: "regular" };
      const demoClaims: StructuredClaim[] = [claim1, claim2];
      setClaims(demoClaims);

      const report = assembleComparisonReport({
        symbols: resolvedSlots.map((s) => ({
          requestedSymbol: s.tokenSymbol,
          pack: s.pack,
          brief: s.brief,
          error: s.error ?? (s.status === "loaded" ? null : "Evidence snapshot was not loaded for this symbol."),
        })),
        claims: demoClaims,
      });
      setComparison(report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load demo comparison fixtures.");
    } finally {
      setBusy(null);
    }
  };

  const evaluateComparison = () => {
    setError(null);
    if (slots.length < 2) {
      setError("Please add at least two distinct rTokens to compare.");
      return;
    }
    const loadedCount = slots.filter((slot) => slot.status === "loaded").length;
    if (loadedCount === 0) {
      setError("No evidence snapshots have loaded yet. Click 'Load All Snapshots' first.");
      return;
    }
    if (claims.length === 0 && !freeText.trim()) {
      setError("Please add at least one shared structured claim or free-text thesis sentence.");
      return;
    }
    setBusy("run");
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
      setError(err instanceof Error ? err.message : "Unable to evaluate comparison across symbols.");
    } finally {
      setBusy(null);
    }
  };

  const exportReport = (format: "markdown" | "json" | "html" | "print") => {
    if (!comparison) return;
    const baseName = `mirrorline-comparison-${comparison.symbols
      .map((s) => s.tokenSymbol ?? s.requestedSymbol)
      .join("-")}-${new Date().toISOString().replace(/[:.]/g, "-")}`;

    if (format === "markdown") {
      const md = serializeComparisonReportMarkdown(comparison);
      downloadFile(`${baseName}.md`, md, "text/markdown;charset=utf-8");
      return;
    }
    if (format === "json") {
      const jsonStr = serializeComparisonReportJson(comparison);
      downloadFile(`${baseName}.json`, jsonStr, "application/json;charset=utf-8");
      return;
    }
    if (format === "html") {
      const htmlStr = serializeComparisonReportHtml(comparison);
      downloadFile(`${baseName}.html`, htmlStr, "text/html;charset=utf-8");
      return;
    }
    if (format === "print") {
      const htmlStr = serializeComparisonReportHtml(comparison);
      const win = window.open("", "_blank");
      if (win) {
        win.document.open();
        win.document.write(htmlStr);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 250);
      }
    }
  };

  const canRun = useMemo(
    () => slots.length >= 2 && slots.some((s) => s.status === "loaded") && (claims.length > 0 || Boolean(freeText.trim())),
    [slots, claims, freeText],
  );

  return (
    <section className="flex flex-col gap-6">
      {/* 1. Header & Configuration */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] dark:text-[#86C495]">
            Multi-Symbol Comparison · Non-Advisory
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setUseDemoMode((prev) => !prev);
                setError(null);
              }}
              className={`rounded-lg border px-3 py-1 font-mono text-xs transition-colors ${
                useDemoMode
                  ? "border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning)] font-semibold"
                  : "border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:border-[var(--accent)]"
              }`}
            >
              {useDemoMode ? "◆ Demo Fixture Mode" : "● Live Bitget Mode"}
            </button>
            <button
              type="button"
              onClick={loadDemoComparison}
              disabled={busy !== null}
              className="rounded-lg border border-[var(--warning-border)] bg-[var(--warning-bg)] px-3 py-1 font-mono text-xs font-semibold text-[var(--warning)] hover:opacity-90 disabled:opacity-40"
            >
              Load Demo Comparison (rAAPL vs rNVDA)
            </button>
          </div>
        </div>

        <h2 className="mt-2 text-base md:text-lg font-semibold text-[var(--text-primary)]">
          Compare the same claims across rTokens
        </h2>
        <p className="mt-1 text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed">
          Each symbol keeps its own evidence snapshot and timestamp. This view evaluates whether your claims hold equally across tokens—it does not rank winners or recommend trades.
        </p>

        {useDemoMode ? (
          <div className="mt-3 rounded-lg border border-[var(--warning-border)] bg-[var(--warning-bg)] p-3 text-xs text-[var(--warning)]">
            <strong>DEMO / FIXTURE MODE ACTIVE</strong>: Snapshots will load from deterministic test fixtures ({SUPPORTED_DEMO_SYMBOLS.join(", ")}).
          </div>
        ) : null}

        {/* Suggested Quick Pick */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-xs text-[var(--text-muted)]">Suggested:</span>
          {SUGGESTED_COMPARE_SYMBOLS.map((item) => {
            const alreadyAdded = slots.some((s) => s.tokenSymbol === item);
            return (
              <button
                key={item}
                type="button"
                disabled={alreadyAdded || slots.length >= MAX_COMPARISON_SYMBOLS}
                className={`rounded-md border px-2.5 py-1 font-mono text-xs transition-colors ${
                  alreadyAdded
                    ? "border-[var(--border)] text-[var(--text-muted)] opacity-50 cursor-not-allowed"
                    : "border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
                }`}
                onClick={() => addSymbol(item)}
              >
                {alreadyAdded ? `✓ ${item}` : `+ ${item}`}
              </button>
            );
          })}
        </div>

        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row"
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
            className="h-9 flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 font-mono text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)] disabled:opacity-50"
            placeholder={
              slots.length >= MAX_COMPARISON_SYMBOLS
                ? `Maximum ${MAX_COMPARISON_SYMBOLS} symbols reached`
                : "Add rToken (e.g. rTSLA)"
            }
            aria-label="Add comparison rToken"
          />
          <button
            type="submit"
            disabled={slots.length >= MAX_COMPARISON_SYMBOLS || !draft.trim()}
            className="h-9 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-4 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] disabled:opacity-40 transition-colors"
          >
            Add symbol
          </button>
        </form>

        {/* Slot List */}
        <ul className="mt-3.5 space-y-2">
          {slots.length === 0 ? (
            <li className="rounded-lg border border-dashed border-[var(--border)] p-4 text-center text-xs text-[var(--text-muted)]">
              No comparison symbols added yet. Add at least two rTokens to compare.
            </li>
          ) : (
            slots.map((slot) => (
              <li
                key={slot.pair}
                className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {slot.tokenSymbol} <span className="font-mono text-xs text-[var(--text-muted)] font-normal">{slot.pair}</span>
                    </p>
                    {slot.context?.isDemoFixture ? (
                      <span className="rounded border border-[var(--warning-border)] bg-[var(--warning-bg)] px-1.5 py-0.2 font-mono text-[10px] text-[var(--warning)] font-bold">
                        FIXTURE
                      </span>
                    ) : null}
                  </div>
                  <p className="font-mono text-[10px] text-[var(--text-secondary)]">
                    {slot.status === "loaded"
                      ? `loaded · retrieved ${slot.pack?.investigation.retrievedAt}${slot.context?.isDemoFixture ? " (fixture timestamp)" : ""}`
                      : slot.status === "loading"
                        ? "loading from Bitget…"
                        : slot.status === "error"
                          ? `error: ${slot.error}`
                          : "ready to load snapshot"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void loadSingleSnapshot(slot.pair)}
                    disabled={slot.status === "loading"}
                    className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-1 font-mono text-[11px] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)] disabled:opacity-40"
                  >
                    Load snapshot
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSymbol(slot.pair)}
                    className="font-mono text-[11px] text-[var(--negative)] hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>

        {slots.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-3">
            <button
              type="button"
              disabled={busy !== null}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60 transition-colors shadow-xs"
              onClick={() => void loadAllSnapshots()}
            >
              {busy === "load" ? "Loading snapshots…" : "Load All Snapshots"}
            </button>
          </div>
        )}
      </div>

      {/* 2. Shared Claims Builder */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Shared Claims to Compare</h3>
        <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
          Define claims here to test how each token independently answers them against its own verified snapshot.
        </p>

        <div className="mt-3">
          <StructuredClaimComposer claims={claims} onChange={setClaims} />
        </div>

        <label className="mt-3 flex flex-col gap-1 text-xs uppercase tracking-wide text-[var(--text-secondary)] font-mono">
          Optional shared free-text hypothesis
          <textarea
            value={freeText}
            onChange={(event) => setFreeText(event.target.value)}
            rows={2}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] p-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            placeholder="Example: Session is open and spread is tight across symbols."
            aria-label="Shared free-text hypothesis"
          />
        </label>

        <button
          type="button"
          disabled={!canRun || busy !== null}
          className="mt-4 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-xs md:text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors shadow-xs"
          onClick={evaluateComparison}
        >
          {busy === "run" ? "Evaluating claims…" : "Evaluate Multi-Symbol Claims"}
        </button>
      </div>

      {error ? (
        <div role="alert" aria-live="polite" className="rounded-lg border border-[var(--negative-border)] bg-[var(--negative-bg)] p-3 text-xs text-[var(--negative)]">
          {error}
        </div>
      ) : null}

      {/* 3. Comparison Results Table */}
      {comparison ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Comparison Results</h3>
            {comparison.isDemoFixture ? (
              <span className="rounded-full border border-[var(--warning-border)] bg-[var(--warning-bg)] px-2.5 py-0.5 font-mono text-[10px] text-[var(--warning)] font-bold">
                DEMO / FIXTURE DATA
              </span>
            ) : null}
          </div>

          {comparison.isDemoFixture ? (
            <div className="mt-3 rounded-lg border border-[var(--warning-border)] bg-[var(--warning-bg)] p-3 text-xs text-[var(--warning)]">
              <strong>DEMO / FIXTURE DATA:</strong> One or more columns were evaluated against frozen fixture snapshots. Timestamps reflect each fixture&apos;s recorded scenario, not live market conditions.
            </div>
          ) : null}

          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Assembled at {comparison.createdAt}. This view does not rank winners. Empty cells indicate missing evidence, not a negative score.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-subtle)]">
                  <th className="p-3 font-semibold text-[var(--text-primary)]">Shared claim</th>
                  {comparison.symbols.map((column) => (
                    <th key={column.key} className="p-3 font-semibold text-[var(--text-primary)]">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold">{column.tokenSymbol ?? column.requestedSymbol}</p>
                        {column.isDemoFixture ? (
                          <span className="rounded border border-[var(--warning-border)] bg-[var(--warning-bg)] px-1 py-0.2 font-mono text-[9px] text-[var(--warning)]">
                            FIXTURE
                          </span>
                        ) : null}
                      </div>
                      <p className="font-mono text-[10px] font-normal text-[var(--text-muted)]">
                        {column.snapshot?.retrievedAt ?? column.error ?? "not loaded"}
                        {column.snapshot?.stale ? " · stale" : ""}
                      </p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {comparison.table.map((row) => (
                  <tr key={row.claim.id} className="hover:bg-[var(--bg-subtle)]">
                    <th className="p-3 font-medium text-[var(--text-primary)] align-top">
                      <p>{row.renderedText}</p>
                      <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">{row.claim.kind}</p>
                    </th>
                    {comparison.symbols.map((column) => {
                      const cell = row.cells[column.key];
                      return (
                        <td key={`${row.claim.id}-${column.key}`} className="p-3 align-top">
                          {cell ? (
                            <>
                              <div className="flex flex-wrap gap-1">
                                {cell.statuses.map((status, index) => (
                                  <span
                                    key={`${status}-${index}`}
                                    className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase font-bold ${statusColor(status)}`}
                                  >
                                    {status}
                                  </span>
                                ))}
                              </div>
                              <p className="mt-1.5 text-xs text-[var(--text-secondary)]">{cell.reasoning}</p>
                              {cell.evidenceIds.length > 0 ? (
                                <details className="mt-1.5">
                                  <summary className="cursor-pointer font-mono text-[10px] uppercase text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                                    Evidence ({cell.evidenceIds.length})
                                  </summary>
                                  <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">{cell.evidenceIds.join(" · ")}</p>
                                </details>
                              ) : null}
                            </>
                          ) : (
                            <p className="text-xs text-[var(--text-muted)]">—</p>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Column Notes */}
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {comparison.symbols.map((column) => (
              <article key={`notes-${column.key}`} className="rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] p-3">
                <p className="text-xs font-semibold text-[var(--text-primary)]">{column.tokenSymbol ?? column.requestedSymbol}</p>
                {column.loadStatus !== "loaded" ? (
                  <p className="mt-1 text-xs text-[var(--warning)]">{column.error ?? "Snapshot unavailable"}</p>
                ) : (
                  <>
                    <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">
                      {column.snapshot?.id} · UNKNOWN {column.classifications?.unknown ?? 0} · failures{" "}
                      {column.failures.length}
                    </p>
                    {column.tensions.length > 0 ? (
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-[var(--text-secondary)]">
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

          {/* Export Actions */}
          <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-3">
            <button
              type="button"
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors"
              onClick={() => exportReport("markdown")}
            >
              Export Markdown
            </button>
            <button
              type="button"
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors"
              onClick={() => exportReport("json")}
            >
              Export JSON
            </button>
            <button
              type="button"
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors"
              onClick={() => exportReport("html")}
            >
              Export HTML
            </button>
            <button
              type="button"
              className="rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[var(--accent-hover)] transition-colors shadow-xs"
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
