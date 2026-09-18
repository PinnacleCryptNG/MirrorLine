import type { EvidenceClass, FieldStatus } from "@/lib/market/fields";
import type { EvidenceSource } from "@/lib/evidence/types";
import type { CitedEvidence } from "@/lib/brief/types";
import type { ResourceFailure } from "@/lib/market/types";

export const CLAIM_ASSESSMENT_STATUSES = [
  "supported",
  "challenged",
  "unsupported",
  "unassessed",
] as const;

export type ClaimAssessmentStatus = (typeof CLAIM_ASSESSMENT_STATUSES)[number];

export type ClaimSource = "thesis" | "reason" | "assumption";

export type ClaimKind =
  | "price.direction"
  | "price.last"
  | "session.us"
  | "causation"
  | "news"
  | "reference.tape"
  | "liquidity"
  | "depth.reality"
  | "freshness.current"
  | "trade.action"
  | "underlying.named";

export type EvidenceRole = "supports" | "challenges" | "limits" | "context";

export interface ThesisInput {
  thesis: string;
  reason?: string;
  assumptions?: string[];
}

export interface ChallengeEvidenceRef {
  evidenceId: string;
  classification: EvidenceClass;
  status: FieldStatus;
  claim: string;
  value: string | number | boolean | null;
  sources: EvidenceSource[];
  observedAt?: string;
  retrievedAt?: string;
  freshnessSeconds?: number | null;
  freshnessStatus?: FieldStatus;
  caveats: string[];
  role: EvidenceRole;
}

export interface ClaimAssessment {
  id: string;
  source: ClaimSource;
  text: string;
  ruleId: string | null;
  kind: ClaimKind | null;
  status: ClaimAssessmentStatus;
  reasoning: string;
  requiresClarification: boolean;
  evidenceIds: string[];
  supportingEvidence: ChallengeEvidenceRef[];
  challengingEvidence: ChallengeEvidenceRef[];
  limitingEvidence: ChallengeEvidenceRef[];
}

export interface MissingItem {
  id: string;
  kind: "unknown" | "caveat" | "tension" | "failure" | "does-not-establish";
  title: string;
  text: string;
  evidenceIds: string[];
}

export interface AttackPoint {
  id: string;
  title: string;
  text: string;
  evidenceIds: string[];
  tensionId?: string;
  assessmentId?: string;
  invented: false;
}

export interface TraderAssumption {
  id: string;
  text: string;
  origin: "submitted" | "implied";
  relatedAssessmentIds: string[];
  evidenceIds: string[];
}

export interface InterpretationChallenge {
  milestone: "5-interpretation-challenge";
  advisory: false;
  requestedSymbol: string;
  pair: string;
  tokenSymbol: string;
  retrievedAt: string;
  input: ThesisInput;
  assessments: ClaimAssessment[];
  summary: {
    supported: number;
    challenged: number;
    unsupported: number;
    unassessed: number;
    assumptions: number;
  };
  whatAmIMissing: MissingItem[];
  attackMyThesis: AttackPoint[];
  traderAssumptions: TraderAssumption[];
  citations: Record<string, CitedEvidence>;
  failures: ResourceFailure[];
  limitations: string[];
}

export const CHALLENGE_LIMITATIONS = [
  "This challenge is a decision stress-test. It is not a trade recommendation and does not predict price.",
  "Claims are matched with transparent, testable rules. Unmapped natural language is unassessed, not false.",
  "Unsupported means the pack does not contain evidence for the claim. It does not mean the claim is disproven.",
  "Unassessed means the engine could not reliably map the claim, or the claim is a trade action this tool does not assess.",
  "Attack points only restate existing evidence, tensions, and caveats. Missing evidence is never treated as proof the thesis is false.",
  "Causation, news, US tape, and Reality 40-level depth are not inferred from a Bitget last price.",
] as const;
