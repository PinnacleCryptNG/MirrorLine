import type { EvidencePack } from "@/lib/evidence/types";
import type { InvestigationBrief } from "@/lib/brief/types";
import { parseComposerInput } from "@/lib/composer/validate";
import type { AssembleComparisonInput } from "./assemble";
import { parseComparisonSymbolList } from "./symbols";
import type { ComparisonSymbolInput } from "./types";

export function parseComparisonInput(raw: unknown): AssembleComparisonInput {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Comparison input must be an object with symbols and shared claims.");
  }
  const record = raw as Record<string, unknown>;
  const symbolsRaw = Array.isArray(record.symbols) ? record.symbols : [];
  parseComparisonSymbolList(symbolsRaw);
  const symbols: ComparisonSymbolInput[] = symbolsRaw.map((item, index) => {
    if (typeof item === "string") {
      return { requestedSymbol: item, error: "Evidence snapshot was not loaded for this symbol." };
    }
    if (!item || typeof item !== "object") {
      throw new Error(`Comparison symbol ${index + 1} must be an object or ticker string.`);
    }
    const entry = item as Record<string, unknown>;
    const requestedSymbol =
      typeof entry.requestedSymbol === "string"
        ? entry.requestedSymbol
        : typeof entry.symbol === "string"
          ? entry.symbol
          : "";
    if (!requestedSymbol.trim()) {
      throw new Error(`Comparison symbol ${index + 1} needs a requestedSymbol.`);
    }
    const pack = entry.pack && typeof entry.pack === "object" ? (entry.pack as EvidencePack) : null;
    const brief = entry.brief && typeof entry.brief === "object" ? (entry.brief as InvestigationBrief) : null;
    if (pack && (!Array.isArray(pack.items) || !pack.investigation)) {
      throw new Error(`${requestedSymbol}: supplied evidence pack is malformed.`);
    }
    if (brief && (brief.advisory !== false || !brief.citations)) {
      throw new Error(`${requestedSymbol}: supplied investigation brief is malformed.`);
    }
    if (pack && !brief) {
      throw new Error(`${requestedSymbol}: a brief from the same loaded snapshot is required when a pack is supplied.`);
    }
    const error = typeof entry.error === "string" ? entry.error : null;
    return { requestedSymbol, pack, brief, error };
  });

  const composer = parseComposerInput({
    claims: record.claims ?? record.sharedClaims,
    freeText: record.freeText,
    reason: record.reason,
    assumptions: record.assumptions,
  });
  const createdAt = typeof record.createdAt === "string" ? record.createdAt : undefined;
  return {
    symbols,
    claims: composer.claims,
    freeText: composer.freeText,
    reason: composer.reason,
    assumptions: composer.assumptions,
    createdAt,
  };
}
