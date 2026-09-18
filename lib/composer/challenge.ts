import { EVIDENCE_IDS } from "@/lib/evidence/types";
import type { EvidenceItem, EvidencePack } from "@/lib/evidence/types";
import type { InvestigationBrief } from "@/lib/brief/types";
import { itemById } from "@/lib/brief/types";
import { buildInterpretationChallenge } from "@/lib/challenge/engine";
import type { ChallengeEvidenceRef, ClaimAssessment, InterpretationChallenge, StructuredClaim } from "@/lib/challenge/types";
import { isClosedSessionValue, isOpenSessionValue, numericEvidenceValue } from "@/lib/challenge/rules";
import { splitClaimText } from "@/lib/challenge/split";
import { joinClaimSentences } from "@/lib/revision/claims";
import { COMPOSER_LIMITATIONS } from "./schema";
import { validateStructuredClaim } from "./validate";
import { renderComposerThesis, renderStructuredClaim, type ComposerGuard, type RenderedStructuredClaim } from "./render";

function toRef(entry: EvidenceItem, role: ChallengeEvidenceRef["role"]): ChallengeEvidenceRef {
  const source = entry.sources[0];
  return {
    evidenceId: entry.id,
    classification: entry.classification,
    status: entry.status,
    claim: entry.claim,
    value: entry.value,
    sources: entry.sources,
    observedAt: source?.observedAt,
    retrievedAt: source?.retrievedAt,
    freshnessSeconds: source?.freshnessSeconds ?? null,
    freshnessStatus: source?.freshnessStatus,
    caveats: entry.caveats,
    role,
  };
}

function usable(entry: EvidenceItem | undefined): entry is EvidenceItem {
  return Boolean(
    entry &&
      (entry.classification === "FACT" || entry.classification === "INFERENCE") &&
      entry.status !== "error" &&
      entry.status !== "missing",
  );
}

function recount(assessments: ClaimAssessment[]): InterpretationChallenge["summary"] {
  return {
    supported: assessments.filter((item) => item.status === "supported").length,
    challenged: assessments.filter((item) => item.status === "challenged").length,
    unsupported: assessments.filter((item) => item.status === "unsupported").length,
    unassessed: assessments.filter((item) => item.status === "unassessed").length,
    assumptions: 0,
  };
}

function withLimit(assessment: ClaimAssessment, claim: StructuredClaim, extra: string): ClaimAssessment {
  return {
    ...assessment,
    structuredClaimId: claim.id,
    reasoning: `${assessment.reasoning} ${extra} Selecting this claim type does not make it a verified fact.`,
  };
}

function forceStatus(
  assessment: ClaimAssessment,
  claim: StructuredClaim,
  status: ClaimAssessment["status"],
  reasoning: string,
  refs: ChallengeEvidenceRef[],
): ClaimAssessment {
  const limiting = refs.map((ref) => ({ ...ref, role: "limits" as const }));
  return {
    ...assessment,
    structuredClaimId: claim.id,
    status,
    requiresClarification: status === "unassessed",
    reasoning: `${reasoning} Selecting this claim type does not make it a verified fact.`,
    supportingEvidence: status === "supported" ? refs.filter((ref) => ref.role === "supports") : [],
    challengingEvidence: status === "challenged" ? refs.map((ref) => ({ ...ref, role: "challenges" as const })) : [],
    limitingEvidence: limiting,
    evidenceIds: [...new Set(refs.map((ref) => ref.evidenceId))],
  };
}

function sessionMatches(claimed: string, value: string): boolean {
  const normalized = value.toUpperCase();
  if (claimed === "open") {
    return isOpenSessionValue(value);
  }
  if (claimed === "closed") {
    return isClosedSessionValue(value);
  }
  if (claimed === "regular") {
    return normalized.includes("REGULAR");
  }
  if (claimed === "pre_market") {
    return normalized.includes("PRE");
  }
  if (claimed === "after_hours") {
    return normalized.includes("AFTER");
  }
  if (claimed === "overnight") {
    return normalized.includes("OVERNIGHT");
  }
  return false;
}

function applyGuard(
  assessment: ClaimAssessment,
  rendered: RenderedStructuredClaim,
  pack: EvidencePack,
): ClaimAssessment {
  const claim = rendered.claim;
  const tagged = { ...assessment, structuredClaimId: claim.id };
  const guard: ComposerGuard = rendered.guard;

  if (claim.kind === "price.change24h" && claim.fields.sign === "flat") {
    const change = itemById(pack, EVIDENCE_IDS.priceChange24h);
    if (!usable(change)) {
      return forceStatus(
        tagged,
        claim,
        "unsupported",
        "A 24-hour change FACT is not available to test a flat claim. That is a data gap, not proof the change was zero.",
        change ? [toRef(change, "limits")] : [],
      );
    }
    const magnitude = numericEvidenceValue(change);
    if (magnitude === 0) {
      return forceStatus(
        tagged,
        claim,
        "supported",
        `Bitget 24-hour change is ${change.value}, which matches a structured flat claim. This is still not a cause.`,
        [toRef(change, "supports")],
      );
    }
    return forceStatus(
      tagged,
      claim,
      "challenged",
      `Bitget 24-hour change is ${change.value}, which is not flat. This is a ticker observation, not a forecast.`,
      [toRef(change, "challenges")],
    );
  }

  if (guard === "timeframe-not-24h") {
    const change = itemById(pack, EVIDENCE_IDS.priceChange24h);
    return forceStatus(
      tagged,
      claim,
      "unassessed",
      "This direction claim is not scored against Bitget 24-hour change because the selected timeframe is not 24h. That does not mean the direction is false.",
      change ? [toRef(change, "limits")] : [],
    );
  }

  if (guard === "spread-observed") {
    const spread = itemById(pack, EVIDENCE_IDS.bookSpread);
    const bps = itemById(pack, EVIDENCE_IDS.bookSpreadBps);
    const liquidity = itemById(pack, EVIDENCE_IDS.liquidityModel);
    if (usable(spread)) {
      return forceStatus(
        tagged,
        claim,
        "supported",
        `A derived spread is present (${spread.value}). This is ticker top-of-book math, not executable liquidity.`,
        [toRef(spread, "supports"), ...(bps ? [toRef(bps, "limits")] : []), ...(liquidity ? [toRef(liquidity, "limits")] : [])],
      );
    }
    return forceStatus(
      tagged,
      claim,
      "unsupported",
      "No usable derived spread is in the pack. That is a data gap, not proof there is no market.",
      [spread, liquidity].filter(Boolean).map((item) => toRef(item as EvidenceItem, "limits")),
    );
  }

  if (guard === "public-uta") {
    const publicBook = itemById(pack, EVIDENCE_IDS.depthPublicUta);
    const reality = itemById(pack, EVIDENCE_IDS.depthReality);
    if (usable(publicBook)) {
      return forceStatus(
        tagged,
        claim,
        "supported",
        `${publicBook.claim} This is not whitelist Reality 40-level depth.`,
        [toRef(publicBook, "supports"), ...(reality ? [toRef(reality, "limits")] : [])],
      );
    }
    return forceStatus(
      tagged,
      claim,
      "unsupported",
      "A public UTA book snapshot is not a usable FACT in this pack. Missing depth is not an empty book.",
      [publicBook, reality].filter(Boolean).map((item) => toRef(item as EvidenceItem, "limits")),
    );
  }

  if (guard === "session-specific") {
    const session = itemById(pack, EVIDENCE_IDS.sessionCurrent);
    const underlying = itemById(pack, EVIDENCE_IDS.sessionUnderlying);
    const claimed = claim.fields.state || "";
    const value = String(session?.value ?? "");
    const refs = [session, underlying].filter(Boolean).map((item) => toRef(item as EvidenceItem, "limits"));
    if (!session || session.classification === "UNKNOWN") {
      return forceStatus(
        tagged,
        claim,
        "unsupported",
        "Current session remains unanswered. The structured session pick is unsupported, not false.",
        refs,
      );
    }
    if (claimed === "open" || claimed === "closed") {
      return withLimit(tagged, claim, rendered.limitation);
    }
    if (sessionMatches(claimed, value) || sessionMatches(claimed, String(underlying?.value ?? ""))) {
      return forceStatus(
        tagged,
        claim,
        "supported",
        `Derived session evidence is ${value}, which matches the structured window '${claimed}'. This remains an inference, not a live US tape.`,
        [toRef(session, "supports"), ...refs],
      );
    }
    return forceStatus(
      tagged,
      claim,
      "challenged",
      `Derived session evidence is ${value}, which does not match the structured window '${claimed}'. Session mapping is still not a live exchange status.`,
      [toRef(session, "challenges"), ...refs],
    );
  }

  return withLimit(tagged, claim, rendered.limitation);
}

function claimSentences(text: string): string[] {
  return splitClaimText(joinClaimSentences([text]));
}

export function buildComposerChallenge(options: {
  pack: EvidencePack;
  brief: InvestigationBrief;
  claims: StructuredClaim[];
  freeText?: string;
  reason?: string;
  assumptions?: string[];
}): InterpretationChallenge {
  const claims = options.claims.map((claim, index) => validateStructuredClaim(claim, index));
  const rendered = claims.map((claim) => {
    const entry = renderStructuredClaim(claim);
    return { ...entry, text: joinClaimSentences([entry.text]) };
  });
  const perClaimAssumptions = claims.flatMap((claim) => claim.assumptions ?? []);
  const thesis = renderComposerThesis(claims, options.freeText);
  const challenge = buildInterpretationChallenge({
    pack: options.pack,
    brief: options.brief,
    input: {
      thesis,
      reason: options.reason,
      assumptions: [...perClaimAssumptions, ...(options.assumptions ?? [])],
      structuredClaims: claims,
    },
  });

  const buckets = rendered.map((item) => ({
    item,
    sentences: [...claimSentences(item.text)],
  }));
  const assessments = challenge.assessments.map((assessment) => {
    const index = buckets.findIndex((entry) => entry.sentences.includes(assessment.text));
    if (index < 0) {
      return assessment;
    }
    const owner = buckets[index];
    owner.sentences.splice(owner.sentences.indexOf(assessment.text), 1);
    return applyGuard(assessment, owner.item, options.pack);
  });

  const summary = recount(assessments);
  summary.assumptions = challenge.summary.assumptions;

  return {
    ...challenge,
    assessments,
    summary,
    limitations: [...COMPOSER_LIMITATIONS, ...challenge.limitations],
    composer: {
      milestone: "7-structured-claim-composer",
      claims,
      renderedThesis: thesis,
      freeText: options.freeText,
    },
  };
}
