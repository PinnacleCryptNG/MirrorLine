import type { InterpretationChallenge } from "@/lib/challenge/types";
import { extractClaimUnits, snapshotFromChallenge, toAssessmentSlice } from "./claims";
import { matchClaimUnits } from "./match";
import { MATCH_STRATEGY, REVISION_LIMITATIONS, type ClaimRevision, type StatusChangeAttribution, type ThesisRevision } from "./types";

function sameIdSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const expected = [...left].sort().join("|");
  return expected === [...right].sort().join("|");
}

function statusSetsEqual(left: ReturnType<typeof toAssessmentSlice>[], right: ReturnType<typeof toAssessmentSlice>[]): boolean {
  const key = (slices: ReturnType<typeof toAssessmentSlice>[]) =>
    slices
      .map((slice) => `${slice.kind ?? "unmapped"}:${slice.status}`)
      .sort()
      .join("|");
  return key(left) === key(right);
}

function evidenceChanged(left: ReturnType<typeof toAssessmentSlice>[], right: ReturnType<typeof toAssessmentSlice>[]): boolean {
  const idsChanged = !sameIdSet(
    left.flatMap((slice) => slice.evidenceIds),
    right.flatMap((slice) => slice.evidenceIds),
  );
  if (idsChanged) {
    return true;
  }
  const signatures = (slices: ReturnType<typeof toAssessmentSlice>[]) =>
    slices
      .map((slice) => `${slice.kind ?? "unmapped"}:${slice.evidenceSignature}`)
      .sort()
      .join("|");
  return signatures(left) !== signatures(right);
}

function attributionFor(options: {
  edited: boolean;
  statusChanged: boolean;
  snapshotChanged: boolean;
  evidenceValuesChanged: boolean;
}): StatusChangeAttribution {
  if (!options.statusChanged) {
    return "none";
  }
  if (options.snapshotChanged && options.evidenceValuesChanged && options.edited) {
    return "mixed";
  }
  if (options.snapshotChanged && options.evidenceValuesChanged) {
    return "evidence-snapshot";
  }
  if (options.snapshotChanged && !options.edited) {
    return "evidence-snapshot";
  }
  if (options.edited) {
    return "thesis-edit";
  }
  return options.snapshotChanged ? "evidence-snapshot" : "thesis-edit";
}

function stableId(sequence: number, index: number, fingerprint: string): string {
  const compact = fingerprint.replace(/\s+/g, "-").slice(0, 48) || "empty";
  return `claim.${sequence}.${index}.${compact}`;
}

export function buildThesisRevision(options: {
  previous: InterpretationChallenge;
  current: InterpretationChallenge;
  sequence: number;
  createdAt?: string;
}): ThesisRevision {
  const createdAt = options.createdAt ?? new Date().toISOString();
  const previousUnits = extractClaimUnits(options.previous);
  const currentUnits = extractClaimUnits(options.current);
  const { matches, unmatchedPrevious, unmatchedCurrent } = matchClaimUnits(previousUnits, currentUnits);
  const previousSnapshot = snapshotFromChallenge(options.previous);
  const currentSnapshot = snapshotFromChallenge(options.current);
  const snapshotChanged = previousSnapshot.id !== currentSnapshot.id;

  const claims: ClaimRevision[] = [];

  for (const match of matches) {
    const previousAssessments = match.previous.assessments.map(toAssessmentSlice);
    const currentAssessments = match.current.assessments.map(toAssessmentSlice);
    const edited = match.previous.fingerprint !== match.current.fingerprint;
    const reordered = match.previous.order !== match.current.order;
    const statusChanged = !statusSetsEqual(previousAssessments, currentAssessments);
    const evidenceRefsChanged = evidenceChanged(previousAssessments, currentAssessments);
    claims.push({
      stableId: stableId(options.sequence, match.previous.order, match.current.fingerprint || match.previous.fingerprint),
      change: edited ? "edited" : "unchanged",
      source: match.current.source,
      previousText: match.previous.text,
      currentText: match.current.text,
      previousOrder: match.previous.order,
      currentOrder: match.current.order,
      reordered,
      statusChanged,
      evidenceRefsChanged,
      attribution: attributionFor({
        edited,
        statusChanged,
        snapshotChanged,
        evidenceValuesChanged: evidenceRefsChanged,
      }),
      matchReason: MATCH_STRATEGY[match.reason],
      previousAssessments,
      currentAssessments,
    });
  }

  for (const unit of unmatchedPrevious) {
    claims.push({
      stableId: stableId(options.sequence, unit.order, unit.fingerprint),
      change: "removed",
      source: unit.source,
      previousText: unit.text,
      previousOrder: unit.order,
      reordered: false,
      statusChanged: false,
      evidenceRefsChanged: false,
      attribution: "none",
      matchReason: MATCH_STRATEGY.unmatched,
      previousAssessments: unit.assessments.map(toAssessmentSlice),
      currentAssessments: [],
    });
  }

  for (const unit of unmatchedCurrent) {
    claims.push({
      stableId: stableId(options.sequence, 1000 + unit.order, unit.fingerprint),
      change: "added",
      source: unit.source,
      currentText: unit.text,
      currentOrder: unit.order,
      reordered: false,
      statusChanged: false,
      evidenceRefsChanged: false,
      attribution: "none",
      matchReason: MATCH_STRATEGY.unmatched,
      previousAssessments: [],
      currentAssessments: unit.assessments.map(toAssessmentSlice),
    });
  }

  claims.sort((left, right) => {
    const order = (item: ClaimRevision) => item.currentOrder ?? item.previousOrder ?? 0;
    const changeRank = { added: 3, removed: 2, edited: 1, unchanged: 0 };
    if (left.change !== right.change) {
      return changeRank[left.change] - changeRank[right.change];
    }
    return order(left) - order(right);
  });

  const summary = {
    added: claims.filter((item) => item.change === "added").length,
    removed: claims.filter((item) => item.change === "removed").length,
    edited: claims.filter((item) => item.change === "edited").length,
    reordered: claims.filter((item) => item.reordered && item.change !== "added" && item.change !== "removed").length,
    unchanged: claims.filter((item) => item.change === "unchanged").length,
    statusChanged: claims.filter((item) => item.statusChanged).length,
    evidenceRefsChanged: claims.filter((item) => item.evidenceRefsChanged).length,
  };

  return {
    milestone: "6-thesis-revision-loop",
    advisory: false,
    revisionId: `rev.${options.sequence}.${options.current.tokenSymbol}.${createdAt}`,
    sequence: options.sequence,
    createdAt,
    requestedSymbol: options.current.requestedSymbol,
    pair: options.current.pair,
    tokenSymbol: options.current.tokenSymbol,
    originalThesis: options.previous.input,
    revisedThesis: options.current.input,
    previousSnapshot,
    currentSnapshot,
    snapshotChanged,
    snapshotWarning: snapshotChanged
      ? `Evidence snapshot changed from ${previousSnapshot.retrievedAt} to ${currentSnapshot.retrievedAt}. Status changes are not attributed to the thesis edit alone.`
      : null,
    summary,
    claims,
    previousChallenge: options.previous,
    currentChallenge: options.current,
    limitations: [...REVISION_LIMITATIONS],
  };
}
