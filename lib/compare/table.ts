import type { ClaimAssessment } from "@/lib/challenge/types";
import type { StructuredClaim } from "@/lib/challenge/types";
import { renderStructuredClaim } from "@/lib/composer/render";
import type { ComparisonCell, ComparisonRow, ComparisonSymbolColumn } from "./types";

function assessmentsForClaim(challenge: ComparisonSymbolColumn["challenge"], claimId: string): ClaimAssessment[] {
  if (!challenge) {
    return [];
  }
  return challenge.assessments.filter((item) => item.structuredClaimId === claimId);
}

export function buildComparisonCell(claim: StructuredClaim, column: ComparisonSymbolColumn): ComparisonCell {
  if (column.loadStatus !== "loaded" || !column.challenge) {
    return {
      claimId: claim.id,
      symbolKey: column.key,
      status: "unavailable",
      statuses: ["unavailable"],
      reasoning:
        column.error ||
        "This symbol has no loaded evidence snapshot, so the shared claim is unavailable here — not scored as false.",
      evidenceIds: [],
      requiresClarification: true,
    };
  }
  const hits = assessmentsForClaim(column.challenge, claim.id);
  if (hits.length === 0) {
    return {
      claimId: claim.id,
      symbolKey: column.key,
      status: "unassessed",
      statuses: ["unassessed"],
      reasoning:
        "No assessment on this symbol's challenge mapped to the shared claim id. That is unassessed, not false.",
      evidenceIds: [],
      requiresClarification: true,
    };
  }
  const evidenceIds = [...new Set(hits.flatMap((item) => item.evidenceIds))];
  return {
    claimId: claim.id,
    symbolKey: column.key,
    status: hits[0]?.status ?? "unassessed",
    statuses: hits.map((item) => item.status),
    reasoning: hits.map((item) => item.reasoning).join(" "),
    evidenceIds,
    requiresClarification: hits.some((item) => item.requiresClarification),
  };
}

export function buildComparisonTable(claims: StructuredClaim[], columns: ComparisonSymbolColumn[]): ComparisonRow[] {
  return claims.map((claim) => {
    const cells: Record<string, ComparisonCell> = {};
    for (const column of columns) {
      cells[column.key] = buildComparisonCell(claim, column);
    }
    return {
      claim,
      renderedText: renderStructuredClaim(claim).text,
      cells,
    };
  });
}
