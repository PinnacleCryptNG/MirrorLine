import type { InvestigationBrief, InvestigationTension } from "@/lib/brief/types";
import type { ClaimAssessmentStatus, InterpretationChallenge, StructuredClaim } from "@/lib/challenge/types";
import type { EvidencePack, EvidencePackSummary } from "@/lib/evidence/types";
import type { ResourceFailure } from "@/lib/market/types";
import type { ReportContextSummary, ReportSnapshot } from "@/lib/report/types";

export const MIN_COMPARISON_SYMBOLS = 2;
export const MAX_COMPARISON_SYMBOLS = 6;

export type ComparisonLoadStatus = "loaded" | "failed" | "missing";

export interface ComparisonSymbolInput {
  requestedSymbol: string;
  pack?: EvidencePack | null;
  brief?: InvestigationBrief | null;
  error?: string | null;
}

export interface ComparisonCell {
  claimId: string;
  symbolKey: string;
  status: ClaimAssessmentStatus | "unavailable";
  statuses: Array<ClaimAssessmentStatus | "unavailable">;
  reasoning: string;
  evidenceIds: string[];
  requiresClarification: boolean;
}

export interface ComparisonRow {
  claim: StructuredClaim;
  renderedText: string;
  cells: Record<string, ComparisonCell>;
}

export interface ComparisonSymbolColumn {
  key: string;
  requestedSymbol: string;
  pair: string | null;
  tokenSymbol: string | null;
  loadStatus: ComparisonLoadStatus;
  error: string | null;
  snapshot: ReportSnapshot | null;
  contextSummary: ReportContextSummary | null;
  pack: EvidencePack | null;
  brief: InvestigationBrief | null;
  challenge: InterpretationChallenge | null;
  classifications: EvidencePackSummary | null;
  tensions: InvestigationTension[];
  failures: ResourceFailure[];
  unknowns: string[];
}

export interface ComparisonReport {
  milestone: "9-multi-symbol-comparison";
  advisory: false;
  reportId: string;
  createdAt: string;
  sharedClaims: StructuredClaim[];
  freeText?: string;
  symbols: ComparisonSymbolColumn[];
  table: ComparisonRow[];
  disclaimers: string[];
  limitations: string[];
}

export const COMPARISON_DISCLAIMERS = [
  "This comparison is non-advisory. It does not recommend buys, sells, targets, or position sizes.",
  "It does not rank symbols, score theses, or predict price.",
  "Each rToken keeps its own evidence snapshot. Timestamps are not merged into a shared observation time.",
  "The same claim wording can have different support across symbols because each column uses only that symbol's pack.",
  "UNKNOWN is an unanswered question, not proof a claim is false.",
  "Unsupported means that symbol's pack lacked evidence. It does not mean the claim is disproven.",
  "A failed or missing snapshot is shown as unavailable for that column. Other symbols are kept.",
  "No US tape, news, liquidity model, or Reality 40-level depth is invented to fill a blank cell.",
] as const;

export const COMPARISON_LIMITATIONS = [
  "Comparison export assembles already-loaded per-symbol models. It does not call Bitget and does not refresh snapshots.",
  "Challenges are recomputed from each supplied pack, brief, and the shared structured claims. Client-supplied statuses are not trusted.",
  "Selecting a structured claim type still does not make the assertion a verified fact.",
  "Partial failures stay visible. A blank or failed column is not repaired from another symbol.",
] as const;
