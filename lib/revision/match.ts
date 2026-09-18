import { jaccardTokens, levenshteinRatio, tokensContained } from "./claims";
import { MATCH_STRATEGY, type ClaimUnit } from "./types";

export const MATCH_THRESHOLDS = {
  jaccard: 0.55,
  levenshtein: 0.72,
  minContainmentTokens: 2,
} as const;

export interface ClaimMatch {
  previous: ClaimUnit;
  current: ClaimUnit;
  reason: keyof typeof MATCH_STRATEGY;
  score: number;
}

function similarity(previous: ClaimUnit, current: ClaimUnit): { reason: ClaimMatch["reason"]; score: number } | null {
  if (previous.source !== current.source) {
    return null;
  }
  if (previous.fingerprint === current.fingerprint) {
    return { reason: "exactFingerprint", score: 1 };
  }
  if (
    tokensContained(previous.tokens, current.tokens) ||
    tokensContained(current.tokens, previous.tokens)
  ) {
    return { reason: "containment", score: 0.9 };
  }
  const jaccard = jaccardTokens(previous.tokens, current.tokens);
  if (jaccard >= MATCH_THRESHOLDS.jaccard) {
    return { reason: "jaccard", score: jaccard };
  }
  const ratio = levenshteinRatio(previous.fingerprint, current.fingerprint);
  if (ratio >= MATCH_THRESHOLDS.levenshtein) {
    return { reason: "levenshtein", score: ratio };
  }
  return null;
}

export function matchClaimUnits(previous: ClaimUnit[], current: ClaimUnit[]): {
  matches: ClaimMatch[];
  unmatchedPrevious: ClaimUnit[];
  unmatchedCurrent: ClaimUnit[];
} {
  const usedCurrent = new Set<number>();
  const matches: ClaimMatch[] = [];

  const consider = (minScore: number, allow: (candidate: ReturnType<typeof similarity>) => boolean) => {
    for (const prev of previous) {
      if (matches.some((match) => match.previous.order === prev.order)) {
        continue;
      }
      let best: { unit: ClaimUnit; meta: NonNullable<ReturnType<typeof similarity>> } | null = null;
      for (const curr of current) {
        if (usedCurrent.has(curr.order)) {
          continue;
        }
        const meta = similarity(prev, curr);
        if (!meta || !allow(meta) || meta.score < minScore) {
          continue;
        }
        if (!best || meta.score > best.meta.score || (meta.score === best.meta.score && curr.order < best.unit.order)) {
          best = { unit: curr, meta };
        }
      }
      if (best) {
        usedCurrent.add(best.unit.order);
        matches.push({ previous: prev, current: best.unit, reason: best.meta.reason, score: best.meta.score });
      }
    }
  };

  consider(1, (meta) => meta?.reason === "exactFingerprint");
  consider(0.9, (meta) => meta?.reason === "containment");
  consider(MATCH_THRESHOLDS.jaccard, (meta) => meta?.reason === "jaccard");
  consider(MATCH_THRESHOLDS.levenshtein, (meta) => meta?.reason === "levenshtein");

  const matchedPrev = new Set(matches.map((match) => match.previous.order));
  return {
    matches,
    unmatchedPrevious: previous.filter((unit) => !matchedPrev.has(unit.order)),
    unmatchedCurrent: current.filter((unit) => !usedCurrent.has(unit.order)),
  };
}
