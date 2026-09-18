import type { ClaimAssessment, ClaimAssessmentStatus, ClaimKind, ClaimSource, InterpretationChallenge, ThesisInput } from "@/lib/challenge/types";

export const CLAIM_CHANGE_KINDS = ["added", "removed", "edited", "unchanged"] as const;
export type ClaimChangeKind = (typeof CLAIM_CHANGE_KINDS)[number];

export const STATUS_CHANGE_ATTRIBUTIONS = ["thesis-edit", "evidence-snapshot", "mixed", "none"] as const;
export type StatusChangeAttribution = (typeof STATUS_CHANGE_ATTRIBUTIONS)[number];

export interface EvidenceSnapshotRef {
  id: string;
  pair: string;
  tokenSymbol: string;
  retrievedAt: string;
}

export interface AssessmentSlice {
  id: string;
  kind: ClaimKind | null;
  ruleId: string | null;
  status: ClaimAssessmentStatus;
  evidenceIds: string[];
  evidenceSignature: string;
}

export interface ClaimRevision {
  stableId: string;
  change: ClaimChangeKind;
  source: ClaimSource;
  previousText?: string;
  currentText?: string;
  previousOrder?: number;
  currentOrder?: number;
  reordered: boolean;
  statusChanged: boolean;
  evidenceRefsChanged: boolean;
  attribution: StatusChangeAttribution;
  matchReason: string;
  previousAssessments: AssessmentSlice[];
  currentAssessments: AssessmentSlice[];
}

export interface ThesisRevisionSummary {
  added: number;
  removed: number;
  edited: number;
  reordered: number;
  unchanged: number;
  statusChanged: number;
  evidenceRefsChanged: number;
}

export interface ThesisRevision {
  milestone: "6-thesis-revision-loop";
  advisory: false;
  revisionId: string;
  sequence: number;
  createdAt: string;
  requestedSymbol: string;
  pair: string;
  tokenSymbol: string;
  originalThesis: ThesisInput;
  revisedThesis: ThesisInput;
  previousSnapshot: EvidenceSnapshotRef;
  currentSnapshot: EvidenceSnapshotRef;
  snapshotChanged: boolean;
  snapshotWarning: string | null;
  summary: ThesisRevisionSummary;
  claims: ClaimRevision[];
  previousChallenge: InterpretationChallenge;
  currentChallenge: InterpretationChallenge;
  limitations: string[];
}

export const REVISION_LIMITATIONS = [
  "A revision loop compares two challenges. It is not a score, grade, or recommendation.",
  "A status change does not mean the thesis improved or worsened.",
  "When the evidence snapshot changed, a status change is not attributed to the thesis edit alone.",
  "Claim identity uses exact fingerprints first, then token overlap / containment / edit distance. Uncertain matches are treated as added and removed, not as silent rewrites.",
  "UNKNOWN remains an unanswered question. Missing evidence is not proof a claim is false.",
  "This loop does not recommend buys, sells, targets, or forecasts.",
] as const;

export const MATCH_STRATEGY = {
  exactFingerprint: "same source and identical normalized fingerprint",
  containment: "same source; the smaller token set is contained in the larger (minimum 2 tokens)",
  jaccard: "same source; token Jaccard similarity >= 0.55",
  levenshtein: "same source; normalized Levenshtein ratio >= 0.72",
  unmatched: "no remaining candidate met a published threshold; treated as added/removed",
  structuredId: "same structured claim id from the composer",
} as const;

export type ClaimUnit = {
  order: number;
  source: ClaimSource;
  text: string;
  fingerprint: string;
  tokens: string[];
  assessments: ClaimAssessment[];
  structuredClaimId?: string;
};
