import type { InterpretationChallenge } from "@/lib/challenge/types";
import type { AssessmentSlice, ClaimUnit, EvidenceSnapshotRef } from "./types";

const TRAILING_PUNCT = /[.!?;,]+$/;

export function fingerprintClaim(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’"“”]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(TRAILING_PUNCT, "")
    .replace(/\s+/g, " ");
}

export function tokenizeFingerprint(fingerprint: string): string[] {
  return fingerprint.split(/\s+/).filter((token) => token.length > 0);
}

export function jaccardTokens(left: string[], right: string[]): number {
  if (left.length === 0 && right.length === 0) {
    return 1;
  }
  const a = new Set(left);
  const b = new Set(right);
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) {
      intersection += 1;
    }
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function tokensContained(smaller: string[], larger: string[]): boolean {
  if (smaller.length < 2) {
    return false;
  }
  const haystack = new Set(larger);
  return smaller.every((token) => haystack.has(token));
}

export function levenshteinRatio(left: string, right: string): number {
  if (left === right) {
    return 1;
  }
  const maxLen = Math.max(left.length, right.length);
  if (maxLen === 0) {
    return 1;
  }
  return 1 - levenshtein(left, right) / maxLen;
}

function levenshtein(left: string, right: string): number {
  const rows = left.length + 1;
  const cols = right.length + 1;
  const prev = new Array<number>(cols);
  const next = new Array<number>(cols);
  for (let j = 0; j < cols; j += 1) {
    prev[j] = j;
  }
  for (let i = 1; i < rows; i += 1) {
    next[0] = i;
    const a = left.charCodeAt(i - 1);
    for (let j = 1; j < cols; j += 1) {
      const cost = a === right.charCodeAt(j - 1) ? 0 : 1;
      next[j] = Math.min(next[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j < cols; j += 1) {
      prev[j] = next[j];
    }
  }
  return prev[cols - 1];
}

export function snapshotFromChallenge(challenge: InterpretationChallenge): EvidenceSnapshotRef {
  return {
    id: `${challenge.pair}|${challenge.retrievedAt}`,
    pair: challenge.pair,
    tokenSymbol: challenge.tokenSymbol,
    retrievedAt: challenge.retrievedAt,
  };
}

export function evidenceSignature(ids: string[], extra: string[] = []): string {
  return [...ids, ...extra].filter(Boolean).sort().join("|");
}

export function toAssessmentSlice(assessment: ClaimUnit["assessments"][number]): AssessmentSlice {
  const values = [
    ...assessment.supportingEvidence,
    ...assessment.challengingEvidence,
    ...assessment.limitingEvidence,
  ].map((ref) => `${ref.evidenceId}:${ref.status}:${String(ref.value)}:${ref.freshnessSeconds ?? ""}`);
  return {
    id: assessment.id,
    kind: assessment.kind,
    ruleId: assessment.ruleId,
    status: assessment.status,
    evidenceIds: [...assessment.evidenceIds].sort(),
    evidenceSignature: evidenceSignature(assessment.evidenceIds, values),
  };
}

export function extractClaimUnits(challenge: InterpretationChallenge): ClaimUnit[] {
  const units: ClaimUnit[] = [];
  for (const assessment of challenge.assessments) {
    const last = units[units.length - 1];
    if (last && last.source === assessment.source && last.text === assessment.text) {
      const alreadyHasKind = last.assessments.some((item) => item.kind === assessment.kind);
      if (!alreadyHasKind) {
        last.assessments.push(assessment);
        continue;
      }
    }
    const fingerprint = fingerprintClaim(assessment.text);
    units.push({
      order: units.length,
      source: assessment.source,
      text: assessment.text,
      fingerprint,
      tokens: tokenizeFingerprint(fingerprint),
      assessments: [assessment],
    });
  }
  return units;
}

export function joinClaimSentences(parts: string[]): string {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => (/[.!?]$/.test(part) ? part : `${part}.`))
    .join(" ");
}
