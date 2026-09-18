import type { CitedEvidence, InvestigationBrief, InvestigationTension } from "@/lib/brief/types";
import type {
  InterpretationChallenge,
  StructuredClaim,
  ThesisInput,
} from "@/lib/challenge/types";
import type { EvidenceClass, FieldStatus } from "@/lib/market/fields";
import type { EvidenceItem, EvidencePack, EvidencePackSummary, EvidenceSource } from "@/lib/evidence/types";
import type { FieldCoverage } from "@/lib/market/fields";
import type { ResourceFailure } from "@/lib/market/types";
import type {
  ClaimRevision,
  EvidenceSnapshotRef,
  ThesisRevisionSummary,
} from "@/lib/revision/types";

export const REPORT_FORMATS = ["json", "markdown", "html"] as const;
export type ReportFormat = (typeof REPORT_FORMATS)[number];

export interface ReportFieldSnapshot {
  evidenceId: string;
  classification: EvidenceClass;
  status: FieldStatus;
  claim: string;
  value: string | number | boolean | null;
  observedAt?: string;
  retrievedAt?: string;
  freshnessSeconds?: number | null;
  freshnessStatus?: FieldStatus;
  provider?: string;
  endpoint?: string;
  field?: string;
  caveats: string[];
}

export interface ReportContextSummary {
  lastPrice: ReportFieldSnapshot | null;
  change24h: ReportFieldSnapshot | null;
  session: ReportFieldSnapshot | null;
  underlying: ReportFieldSnapshot | null;
  referencePrice: ReportFieldSnapshot | null;
  publicUtaDepth: ReportFieldSnapshot | null;
  realityDepth: ReportFieldSnapshot | null;
  coverage?: FieldCoverage;
  note: string;
}

export interface ReportSnapshot {
  id: string;
  pair: string;
  tokenSymbol: string;
  retrievedAt: string;
  stale: boolean;
  staleEvidenceIds: string[];
  challengeMatchesSnapshot: boolean | null;
  warning: string | null;
}

export interface ReportRevision {
  revisionId: string;
  sequence: number;
  createdAt: string;
  originalThesis: ThesisInput;
  revisedThesis: ThesisInput;
  previousSnapshot: EvidenceSnapshotRef;
  currentSnapshot: EvidenceSnapshotRef;
  snapshotChanged: boolean;
  snapshotWarning: string | null;
  summary: ThesisRevisionSummary;
  claims: ClaimRevision[];
  previousSummary: InterpretationChallenge["summary"];
  currentSummary: InterpretationChallenge["summary"];
  limitations: string[];
}

export interface InvestigationReport {
  milestone: "8-investigation-report-export";
  advisory: false;
  reportId: string;
  createdAt: string;
  question: string;
  requestedSymbol: string;
  pair: string;
  tokenSymbol: string;
  snapshot: ReportSnapshot;
  contextSummary: ReportContextSummary;
  pack: EvidencePack;
  brief: InvestigationBrief;
  challenge: InterpretationChallenge | null;
  structuredClaims: StructuredClaim[];
  revisions: ReportRevision[];
  classifications: EvidencePackSummary;
  tensions: InvestigationTension[];
  citations: Record<string, CitedEvidence>;
  failures: ResourceFailure[];
  disclaimers: string[];
  limitations: string[];
}

export const REPORT_DISCLAIMERS = [
  "This investigation report is non-advisory. It does not recommend buys, sells, targets, or position sizes.",
  "It does not predict price and does not place or cancel orders.",
  "Report creation time is not a source-data timestamp. Bitget observation times stay on each evidence item.",
  "FACT, INFERENCE, ASSUMPTION, and UNKNOWN classifications are copied from the evidence pack. They are not upgraded by export.",
  "UNKNOWN is an unanswered question, not proof a claim is false.",
  "ASSUMPTION is not Bitget-verified information and is not presented as a fact.",
  "Unsupported means the pack lacked evidence for the claim. It does not mean the claim was disproven.",
  "A revision status change is not a score, grade, or improvement.",
  "No US tape, news feed, liquidity model, or Reality 40-level depth is invented in this export.",
] as const;

export const REPORT_LIMITATIONS = [
  "This export assembles already-loaded investigation models. It does not call Bitget and does not refresh the snapshot.",
  "If live data was refreshed after a challenge was run, the challenge may belong to an older snapshot. That mismatch is labeled, not repaired.",
  "Selecting a structured claim type still does not make the assertion a verified fact.",
] as const;

export type { EvidenceItem, EvidenceSource };
