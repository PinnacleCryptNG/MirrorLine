import { normalizeRTokenSymbol, tokenSymbolFromPair } from "@/lib/bitget/symbols";
import { BitgetError } from "@/lib/bitget/errors";
import { MAX_COMPARISON_SYMBOLS, MIN_COMPARISON_SYMBOLS } from "./types";

export const SUGGESTED_COMPARE_SYMBOLS = ["rAAPL", "rNVDA", "rTSLA", "rMSFT", "rCOIN"] as const;

export interface NormalizedComparisonSymbol {
  requested: string;
  pair: string;
  tokenSymbol: string;
}

export function parseComparisonSymbol(input: string): NormalizedComparisonSymbol {
  const requested = input.trim();
  if (!requested) {
    throw new Error("A Reality symbol is required.");
  }
  try {
    const pair = normalizeRTokenSymbol(requested);
    return { requested, pair, tokenSymbol: tokenSymbolFromPair(pair) };
  } catch (error) {
    if (error instanceof BitgetError) {
      throw new Error(error.message);
    }
    throw error;
  }
}

export function parseComparisonSymbolList(inputs: unknown): NormalizedComparisonSymbol[] {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new Error(`Select ${MIN_COMPARISON_SYMBOLS} or more rTokens to compare.`);
  }
  const raw = inputs.map((item, index) => {
    if (typeof item === "string") {
      return item;
    }
    if (item && typeof item === "object" && "requestedSymbol" in item && typeof (item as { requestedSymbol: unknown }).requestedSymbol === "string") {
      return (item as { requestedSymbol: string }).requestedSymbol;
    }
    throw new Error(`Comparison symbol ${index + 1} must be a Reality ticker such as rAAPL.`);
  });
  if (raw.length < MIN_COMPARISON_SYMBOLS) {
    throw new Error(`Select at least ${MIN_COMPARISON_SYMBOLS} rTokens to compare.`);
  }
  if (raw.length > MAX_COMPARISON_SYMBOLS) {
    throw new Error(`A comparison is limited to ${MAX_COMPARISON_SYMBOLS} rTokens.`);
  }
  const parsed = raw.map((item) => parseComparisonSymbol(item));
  const seen = new Set<string>();
  for (const item of parsed) {
    if (seen.has(item.pair)) {
      throw new Error(`Duplicate symbol '${item.tokenSymbol}' (${item.pair}). Each column must be a distinct rToken.`);
    }
    seen.add(item.pair);
  }
  return parsed;
}
