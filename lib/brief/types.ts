import type { EvidenceClass } from "@/lib/market/fields";
import type { EvidenceItem, EvidencePack, EvidenceSource } from "@/lib/evidence/types";
import type { FieldStatus } from "@/lib/market/fields";
import type { ResourceFailure } from "@/lib/market/types";

export const TENSION_IDS = {
  tokenVsClosedEquity: "tension.token-vs-closed-equity",
  moveWithoutCause: "tension.move-without-cause",
  namedUnderlyingWithoutTape: "tension.named-underlying-without-tape",
  staleLastPrice: "tension.stale-last-price",
  utaBookVsRealityDepth: "tension.uta-book-vs-reality-depth",
  conventionUnderlying: "tension.convention-underlying",
  partialFailure: "tension.partial-failure",
  invertedBook: "contradiction.inverted-book",
} as const;

export type TensionSeverity = "tension" | "contradiction";

export interface BriefParagraph {
  id: string;
  text: string;
  evidenceIds: string[];
}

export interface BriefSection {
  id: string;
  title: string;
  intro: string;
  paragraphs: BriefParagraph[];
  evidenceIds: string[];
}

export interface InvestigationTension {
  id: string;
  severity: TensionSeverity;
  title: string;
  explanation: string;
  evidenceIds: string[];
}

export interface CitedEvidence {
  id: string;
  classification: EvidenceClass;
  status: FieldStatus;
  claim: string;
  value: string | number | boolean | null;
  sources: EvidenceSource[];
  caveats: string[];
}

export interface InvestigationBrief {
  milestone: "4-investigation-brief";
  advisory: false;
  question: string;
  requestedSymbol: string;
  pair: string;
  tokenSymbol: string;
  retrievedAt: string;
  isDemoFixture?: boolean;
  fixtureId?: string;
  fixtureLabel?: string;
  executiveSummary: BriefParagraph[];
  marketAndSession: BriefSection;
  observedFacts: BriefSection;
  derivedInferences: BriefSection;
  assumptions: BriefSection;
  unknowns: BriefSection;
  tensions: InvestigationTension[];
  doesNotEstablish: BriefParagraph[];
  nextQuestions: BriefParagraph[];
  citations: Record<string, CitedEvidence>;
  failures: ResourceFailure[];
  limitations: string[];
}

export const BRIEF_LIMITATIONS = [
  "This brief is non-advisory. It does not recommend buys, sells, targets, or position sizes.",
  "Every market claim is copied or classified from the evidence pack. No US tape, news, or causal story is added.",
  "A tension is an interpretation risk. A contradiction is only used when two evidence items actually conflict.",
  "UNKNOWN is an unanswered question, not a finding that something is false.",
  "ASSUMPTION is not verified Bitget information.",
] as const;

export function toCitedEvidence(item: EvidenceItem): CitedEvidence {
  return {
    id: item.id,
    classification: item.classification,
    status: item.status,
    claim: item.claim,
    value: item.value,
    sources: item.sources,
    caveats: item.caveats,
  };
}

export function itemById(pack: EvidencePack, id: string): EvidenceItem | undefined {
  return pack.items.find((item) => item.id === id);
}
