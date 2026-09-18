import { EVIDENCE_IDS } from "@/lib/evidence/types";
import { itemById } from "@/lib/brief/types";
import type { EvidencePack } from "@/lib/evidence/types";
import type { InvestigationBrief } from "@/lib/brief/types";
import type { InterpretationChallenge } from "@/lib/challenge/types";
import type { MarketContext } from "@/lib/market/types";
import type { ThesisRevision } from "@/lib/revision/types";
import {
  REPORT_DISCLAIMERS,
  REPORT_LIMITATIONS,
  type InvestigationReport,
  type ReportContextSummary,
  type ReportFieldSnapshot,
  type ReportRevision,
  type ReportSnapshot,
} from "./types";
import { sanitizeForExport } from "./sanitize";

export interface AssembleReportInput {
  pack: EvidencePack;
  brief: InvestigationBrief;
  context?: MarketContext;
  challenge?: InterpretationChallenge | null;
  revisions?: ThesisRevision[];
  question?: string;
  createdAt?: string;
}

function fieldFromPack(pack: EvidencePack, id: string): ReportFieldSnapshot | null {
  const item = itemById(pack, id);
  if (!item) {
    return null;
  }
  const source = item.sources[0];
  return {
    evidenceId: item.id,
    classification: item.classification,
    status: item.status,
    claim: item.claim,
    value: item.value,
    observedAt: source?.observedAt,
    retrievedAt: source?.retrievedAt,
    freshnessSeconds: source?.freshnessSeconds ?? null,
    freshnessStatus: source?.freshnessStatus,
    provider: source?.provider,
    endpoint: source?.endpoint,
    field: source?.field,
    caveats: item.caveats,
  };
}

function uniqueFailures(
  pack: EvidencePack,
  brief: InvestigationBrief,
  challenge: InterpretationChallenge | null,
): InvestigationReport["failures"] {
  const seen = new Set<string>();
  const list: InvestigationReport["failures"] = [];
  for (const failure of [...pack.failures, ...brief.failures, ...(challenge?.failures ?? [])]) {
    const key = `${failure.resource}|${failure.code ?? ""}|${failure.message}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    list.push(failure);
  }
  return list;
}

function uniqueLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

export function buildContextSummary(pack: EvidencePack, context?: MarketContext): ReportContextSummary {
  return {
    lastPrice: fieldFromPack(pack, EVIDENCE_IDS.priceLast),
    change24h: fieldFromPack(pack, EVIDENCE_IDS.priceChange24h),
    session: fieldFromPack(pack, EVIDENCE_IDS.sessionCurrent),
    underlying: fieldFromPack(pack, EVIDENCE_IDS.referenceUnderlying),
    referencePrice: fieldFromPack(pack, EVIDENCE_IDS.referencePrice),
    publicUtaDepth: fieldFromPack(pack, EVIDENCE_IDS.depthPublicUta),
    realityDepth: fieldFromPack(pack, EVIDENCE_IDS.depthReality),
    coverage: context?.coverage,
    note:
      context?.reference.note ??
      "No live US exchange tape is supplied by Bitget in this investigation. referencePrice stays unanswered unless a FACT appears in the pack.",
  };
}

export function toReportRevision(revision: ThesisRevision): ReportRevision {
  return {
    revisionId: revision.revisionId,
    sequence: revision.sequence,
    createdAt: revision.createdAt,
    originalThesis: revision.originalThesis,
    revisedThesis: revision.revisedThesis,
    previousSnapshot: revision.previousSnapshot,
    currentSnapshot: revision.currentSnapshot,
    snapshotChanged: revision.snapshotChanged,
    snapshotWarning: revision.snapshotWarning,
    summary: revision.summary,
    claims: revision.claims,
    previousSummary: revision.previousChallenge.summary,
    currentSummary: revision.currentChallenge.summary,
    limitations: revision.limitations,
  };
}

function buildSnapshot(
  pack: EvidencePack,
  challenge: InterpretationChallenge | null,
): ReportSnapshot {
  const staleEvidenceIds = pack.items.filter((item) => item.status === "stale").map((item) => item.id);
  const challengeMatchesSnapshot = challenge ? challenge.retrievedAt === pack.investigation.retrievedAt : null;
  const warnings: string[] = [];
  if (staleEvidenceIds.length > 0) {
    warnings.push(
      `The evidence snapshot contains stale items (${staleEvidenceIds.join(", ")}). Stale facts keep their older timestamps; they are not replaced.`,
    );
  }
  if (challenge && challengeMatchesSnapshot === false) {
    warnings.push(
      `The attached challenge was scored at ${challenge.retrievedAt}, which does not match evidence retrieved at ${pack.investigation.retrievedAt}. Export does not refresh either snapshot.`,
    );
  }
  return {
    id: `${pack.investigation.pair}|${pack.investigation.retrievedAt}`,
    pair: pack.investigation.pair,
    tokenSymbol: pack.investigation.tokenSymbol,
    retrievedAt: pack.investigation.retrievedAt,
    stale: staleEvidenceIds.length > 0,
    staleEvidenceIds,
    challengeMatchesSnapshot,
    warning: warnings.length > 0 ? warnings.join(" ") : null,
  };
}

export function assembleInvestigationReport(input: AssembleReportInput): InvestigationReport {
  const pack = input.pack;
  const brief = input.brief;
  const challenge = input.challenge ?? null;
  const createdAt = input.createdAt ?? new Date().toISOString();
  const extraWarnings: string[] = [];
  if (brief.retrievedAt !== pack.investigation.retrievedAt) {
    extraWarnings.push(
      `The brief snapshot (${brief.retrievedAt}) does not match the evidence pack (${pack.investigation.retrievedAt}). Export does not reconcile them.`,
    );
  }

  const snapshot = buildSnapshot(pack, challenge);
  if (extraWarnings.length > 0) {
    snapshot.warning = [snapshot.warning, ...extraWarnings].filter(Boolean).join(" ");
  }

  const revisions = (input.revisions ?? []).map(toReportRevision);
  const structuredClaims =
    challenge?.composer?.claims ??
    challenge?.input.structuredClaims ??
    [];

  const report: InvestigationReport = {
    milestone: "8-investigation-report-export",
    advisory: false,
    reportId: `report.${pack.investigation.pair}.${createdAt.replace(/[:.]/g, "")}`,
    createdAt,
    question: input.question?.trim() || brief.question || pack.investigation.question,
    requestedSymbol: pack.investigation.requestedSymbol,
    pair: pack.investigation.pair,
    tokenSymbol: pack.investigation.tokenSymbol,
    snapshot,
    contextSummary: buildContextSummary(pack, input.context),
    pack,
    brief,
    challenge,
    structuredClaims,
    revisions,
    classifications: pack.summary,
    tensions: brief.tensions,
    citations: { ...brief.citations, ...(challenge?.citations ?? {}) },
    failures: uniqueFailures(pack, brief, challenge),
    disclaimers: [...REPORT_DISCLAIMERS],
    limitations: uniqueLines([
      ...REPORT_LIMITATIONS,
      ...pack.limitations,
      ...brief.limitations,
      ...(challenge?.limitations ?? []),
      ...revisions.flatMap((item) => item.limitations),
    ]),
  };

  return sanitizeForExport(report);
}
