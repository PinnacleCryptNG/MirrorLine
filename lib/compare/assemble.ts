import { assembleInvestigationReport } from "@/lib/report/assemble";
import { sanitizeForExport } from "@/lib/report/sanitize";
import { validateStructuredClaim } from "@/lib/composer/validate";
import { parseComparisonSymbol, parseComparisonSymbolList } from "./symbols";
import { scoreSharedClaims } from "./score";
import { buildComparisonTable } from "./table";
import {
  COMPARISON_DISCLAIMERS,
  COMPARISON_LIMITATIONS,
  type ComparisonReport,
  type ComparisonSymbolColumn,
  type ComparisonSymbolInput,
} from "./types";
import type { StructuredClaim } from "@/lib/challenge/types";

export interface AssembleComparisonInput {
  symbols: ComparisonSymbolInput[];
  claims: StructuredClaim[];
  freeText?: string;
  reason?: string;
  assumptions?: string[];
  createdAt?: string;
}

function uniqueLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

function columnFromFailure(requestedSymbol: string, error: string): ComparisonSymbolColumn {
  let pair: string | null = null;
  let tokenSymbol: string | null = null;
  try {
    const parsed = parseComparisonSymbol(requestedSymbol);
    pair = parsed.pair;
    tokenSymbol = parsed.tokenSymbol;
  } catch {
    tokenSymbol = requestedSymbol.trim() || null;
  }
  return {
    key: pair ?? requestedSymbol.trim() ?? "unknown",
    requestedSymbol,
    pair,
    tokenSymbol,
    loadStatus: error.toLowerCase().includes("missing") ? "missing" : "failed",
    error,
    snapshot: null,
    contextSummary: null,
    pack: null,
    brief: null,
    challenge: null,
    classifications: null,
    tensions: [],
    failures: [{ resource: "snapshot", message: error }],
    unknowns: [],
  };
}

function columnFromLoaded(
  requestedSymbol: string,
  input: ComparisonSymbolInput,
  claims: StructuredClaim[],
  extras: { freeText?: string; reason?: string; assumptions?: string[] },
  createdAt: string,
): ComparisonSymbolColumn {
  const pack = input.pack;
  const brief = input.brief;
  if (!pack || !brief) {
    return columnFromFailure(requestedSymbol, input.error || "Evidence pack or brief was not loaded for this symbol.");
  }
  const challenge = scoreSharedClaims({
    pack,
    brief,
    claims,
    freeText: extras.freeText,
    reason: extras.reason,
    assumptions: extras.assumptions,
  });
  const inner = assembleInvestigationReport({ pack, brief, challenge, createdAt });
  return {
    key: inner.pair,
    requestedSymbol,
    pair: inner.pair,
    tokenSymbol: inner.tokenSymbol,
    loadStatus: "loaded",
    error: null,
    snapshot: inner.snapshot,
    contextSummary: inner.contextSummary,
    pack: inner.pack,
    brief: inner.brief,
    challenge: inner.challenge,
    classifications: inner.classifications,
    tensions: inner.tensions,
    failures: inner.failures,
    unknowns: inner.pack.unknowns,
  };
}

export function assembleComparisonReport(input: AssembleComparisonInput): ComparisonReport {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const identity = parseComparisonSymbolList(input.symbols.map((item) => item.requestedSymbol));
  const claims = input.claims.map((claim, index) => validateStructuredClaim(claim, index));
  if (claims.length === 0 && !input.freeText?.trim()) {
    throw new Error("Add at least one shared structured claim before exporting a comparison.");
  }

  const extras = {
    freeText: input.freeText,
    reason: input.reason,
    assumptions: input.assumptions,
  };

  const symbols = input.symbols.map((entry, index) => {
    const requested = entry.requestedSymbol || identity[index]?.requested || "";
    if (!entry.pack || !entry.brief) {
      return columnFromFailure(requested, entry.error?.trim() || "Evidence snapshot was not loaded for this symbol.");
    }
    return columnFromLoaded(requested, entry, claims, extras, createdAt);
  });

  const retrieved = symbols
    .map((item) => item.snapshot?.retrievedAt)
    .filter((item): item is string => Boolean(item));
  const sharedTime = retrieved.length > 1 && retrieved.every((item) => item === retrieved[0]);
  const extraLimits = [
    sharedTime
      ? "Two or more snapshots happen to share a retrievedAt value. That coincidence is not treated as a single market print."
      : "Snapshot retrievedAt values differ across columns and are not averaged or aligned.",
  ];

  const report: ComparisonReport = {
    milestone: "9-multi-symbol-comparison",
    advisory: false,
    reportId: `compare.${symbols.map((item) => item.pair ?? item.requestedSymbol).join("-")}.${createdAt.replace(/[:.]/g, "")}`,
    createdAt,
    sharedClaims: claims,
    freeText: input.freeText,
    symbols,
    table: buildComparisonTable(claims, symbols),
    disclaimers: [...COMPARISON_DISCLAIMERS],
    limitations: uniqueLines([
      ...COMPARISON_LIMITATIONS,
      ...extraLimits,
      ...symbols.flatMap((item) => item.brief?.limitations ?? []),
    ]),
  };

  return sanitizeForExport(report);
}
