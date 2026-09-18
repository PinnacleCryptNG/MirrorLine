import { EVIDENCE_IDS } from "@/lib/evidence/types";
import type { EvidenceItem, EvidencePack } from "@/lib/evidence/types";
import { toCitedEvidence, type CitedEvidence, type InvestigationBrief } from "@/lib/brief/types";
import { TENSION_IDS } from "@/lib/brief/types";
import {
  isClosedSessionValue,
  isOpenSessionValue,
  matchClaimRules,
  numericEvidenceValue,
  type RuleHit,
} from "./rules";
import { normalizeAssumptions, splitClaimText } from "./split";
import {
  CHALLENGE_LIMITATIONS,
  type AttackPoint,
  type ChallengeEvidenceRef,
  type ClaimAssessment,
  type ClaimAssessmentStatus,
  type ClaimKind,
  type ClaimSource,
  type EvidenceRole,
  type InterpretationChallenge,
  type MissingItem,
  type ThesisInput,
  type TraderAssumption,
} from "./types";

function item(pack: EvidencePack, id: string): EvidenceItem | undefined {
  return pack.items.find((entry) => entry.id === id);
}

function toRef(entry: EvidenceItem, role: EvidenceRole): ChallengeEvidenceRef {
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

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}

function present(entry: EvidenceItem | undefined): entry is EvidenceItem {
  return Boolean(entry);
}

function isUsableFact(entry: EvidenceItem | undefined): entry is EvidenceItem {
  return Boolean(
    entry &&
      (entry.classification === "FACT" || entry.classification === "INFERENCE") &&
      entry.status !== "error" &&
      entry.status !== "missing",
  );
}

interface DraftAssessment {
  source: ClaimSource;
  text: string;
  hit: RuleHit | null;
  status: ClaimAssessmentStatus;
  reasoning: string;
  requiresClarification: boolean;
  supporting: EvidenceItem[];
  challenging: EvidenceItem[];
  limiting: EvidenceItem[];
}

function assessHit(pack: EvidencePack, text: string, hit: RuleHit): DraftAssessment {
  const base = {
    source: "thesis" as ClaimSource,
    text,
    hit,
    supporting: [] as EvidenceItem[],
    challenging: [] as EvidenceItem[],
    limiting: [] as EvidenceItem[],
    requiresClarification: false,
  };

  if (hit.negated && hit.kind !== "trade.action") {
    return {
      ...base,
      status: "unassessed",
      requiresClarification: true,
      reasoning:
        "This sentence contains negation. The first-version matcher does not reliably invert polarity, so the claim is unassessed and needs clarification — not labeled false.",
    };
  }

  if (hit.kind === "trade.action") {
    const identity = item(pack, EVIDENCE_IDS.instrumentIdentity);
    return {
      ...base,
      status: "unassessed",
      requiresClarification: false,
      limiting: identity ? [identity] : [],
      reasoning:
        "Buy, sell, size, and target language is outside the scope of this stress-test. The engine does not assess trade actions and does not produce a recommendation.",
    };
  }

  if (hit.kind === "causation") {
    const news = item(pack, EVIDENCE_IDS.newsContext);
    const change = item(pack, EVIDENCE_IDS.priceChange24h);
    const cited = [news, change].filter(present);
    return {
      ...base,
      status: "unsupported",
      supporting: [],
      limiting: cited,
      reasoning:
        "Causal language is not established by a Bitget ticker field. The pack has no verified cause, news event, or catalyst. Missing news is not proof that the claimed cause is false.",
    };
  }

  if (hit.kind === "news") {
    const news = item(pack, EVIDENCE_IDS.newsContext);
    if (!news || news.classification === "UNKNOWN" || news.status === "missing" || news.status === "error") {
      return {
        ...base,
        status: "unsupported",
        limiting: news ? [news] : [],
        reasoning:
          "The evidence pack does not include news, headlines, or filings. A news claim is unsupported by available evidence, not disproven.",
      };
    }
    return {
      ...base,
      status: "supported",
      supporting: [news],
      reasoning: "News-related evidence is present in the pack. This still does not establish that news caused a price move.",
    };
  }

  if (hit.kind === "price.direction") {
    const change = item(pack, EVIDENCE_IDS.priceChange24h);
    const last = item(pack, EVIDENCE_IDS.priceLast);
    const news = item(pack, EVIDENCE_IDS.newsContext);
    if (!isUsableFact(change)) {
      return {
        ...base,
        status: "unsupported",
        limiting: [change, last].filter(present),
        reasoning:
          "A directional price claim was recognized, but a usable Bitget 24-hour change FACT is not available. The direction is unsupported, not shown to be false.",
      };
    }
    const magnitude = numericEvidenceValue(change);
    if (magnitude === null) {
      return {
        ...base,
        status: "unassessed",
        requiresClarification: true,
        limiting: [change],
        reasoning:
          "A 24-hour change item exists but its value could not be read as a signed number, so direction is unassessed.",
      };
    }
    const claimedUp = hit.polarity === "up";
    const observedUp = magnitude > 0;
    const observedFlat = magnitude === 0;
    const agrees = claimedUp ? observedUp : magnitude < 0;
    const limiting = [news, last?.status === "stale" ? last : undefined].filter(present);
    if (agrees) {
      return {
        ...base,
        status: "supported",
        supporting: [change],
        limiting,
        reasoning: `The claim that price is ${claimedUp ? "up" : "down"} matches Bitget 24-hour change (${change.value}). That field is not a cause, news event, or forecast.`,
      };
    }
    return {
      ...base,
      status: "challenged",
      challenging: [change],
      limiting,
      reasoning: observedFlat
        ? `The claim that price is ${claimedUp ? "up" : "down"} is challenged by a Bitget 24-hour change of ${change.value} (flat). This is a ticker observation, not a verdict on the thesis as a whole.`
        : `The claim that price is ${claimedUp ? "up" : "down"} is challenged by Bitget 24-hour change of ${change.value}. The opposing print is not a prediction and not a cause.`,
    };
  }

  if (hit.kind === "price.last") {
    const last = item(pack, EVIDENCE_IDS.priceLast);
    if (isUsableFact(last) && last.value !== null) {
      return {
        ...base,
        status: "supported",
        supporting: [last],
        limiting: last.status === "stale" ? [last] : [],
        reasoning: `A Bitget last price is present (${last.value}). ${last.status === "stale" ? "The print is stale relative to the freshness window, which limits treating it as current." : "This is a token print, not a US tape print."}`,
      };
    }
    return {
      ...base,
      status: "unsupported",
      limiting: last ? [last] : [],
      reasoning:
        "A last-price claim was recognized, but the pack does not contain a usable last-price FACT. That is an unanswered data gap, not proof the token is unquoted.",
    };
  }

  if (hit.kind === "session.us") {
    const session = item(pack, EVIDENCE_IDS.sessionCurrent);
    const underlying = item(pack, EVIDENCE_IDS.sessionUnderlying);
    const windows = item(pack, EVIDENCE_IDS.sessionWindows);
    const cited = [session, underlying, windows].filter(present);
    const value = session?.value ?? underlying?.value ?? null;
    if (!session || session.classification === "UNKNOWN") {
      return {
        ...base,
        status: "unsupported",
        limiting: cited,
        reasoning:
          "US session language was recognized, but current session remains unanswered in the pack. The claim is unsupported, not false.",
      };
    }
    const claimedClosed = hit.polarity === "closed";
    const closed = isClosedSessionValue(value);
    const open = isOpenSessionValue(value);
    const agrees = claimedClosed ? closed : open;
    if (agrees) {
      return {
        ...base,
        status: "supported",
        supporting: cited.filter((entry) => entry.classification !== "UNKNOWN"),
        limiting: cited,
        reasoning: `Derived session evidence is ${String(value)}, which matches the claim that the US session is ${claimedClosed ? "closed" : "open"}. Session is an INFERENCE from Bitget windows and the New York clock, not a live exchange tape status.`,
      };
    }
    return {
      ...base,
      status: "challenged",
      challenging: cited.filter((entry) => entry.classification !== "UNKNOWN"),
      limiting: cited,
      reasoning: `The claim that the US session is ${claimedClosed ? "closed" : "open"} is challenged by derived session value ${String(value)}. That mapping is still not a live US tape status.`,
    };
  }

  if (hit.kind === "reference.tape") {
    const price = item(pack, EVIDENCE_IDS.referencePrice);
    const divergence = item(pack, EVIDENCE_IDS.referenceDivergence);
    const named = item(pack, EVIDENCE_IDS.referenceUnderlying);
    const cited = [price, divergence, named].filter(present);
    if (price?.classification === "UNKNOWN" || !price) {
      return {
        ...base,
        status: "unsupported",
        limiting: cited,
        reasoning:
          "Cheap/expensive/premium language requires a live US-listed reference price. Bitget does not supply that tape here, so the comparison is unsupported — not shown to be wrong.",
      };
    }
    return {
      ...base,
      status: "supported",
      supporting: [price, divergence].filter(present),
      limiting: cited,
      reasoning: "A reference price item is present. Divergence is still only as good as that tape, and this is not a trade signal.",
    };
  }

  if (hit.kind === "liquidity") {
    const liquidity = item(pack, EVIDENCE_IDS.liquidityModel);
    const publicBook = item(pack, EVIDENCE_IDS.depthPublicUta);
    const reality = item(pack, EVIDENCE_IDS.depthReality);
    return {
      ...base,
      status: "unsupported",
      limiting: [liquidity, publicBook, reality].filter(present),
      reasoning:
        "Executable liquidity is not established. A public UTA book snapshot, if present, is not a liquidity model and is not Reality 40-level depth.",
    };
  }

  if (hit.kind === "depth.reality") {
    const reality = item(pack, EVIDENCE_IDS.depthReality);
    const publicBook = item(pack, EVIDENCE_IDS.depthPublicUta);
    if (reality && reality.classification === "FACT" && reality.status !== "missing" && reality.status !== "error") {
      return {
        ...base,
        status: "supported",
        supporting: [reality],
        limiting: publicBook ? [publicBook] : [],
        reasoning: "Whitelist Reality depth is present as a FACT in this pack.",
      };
    }
    return {
      ...base,
      status: "unsupported",
      limiting: [reality, publicBook].filter(present),
      reasoning:
        "Reality 40-level depth is not a FACT in this pack. The public UTA book is not substituted as whitelist depth. Missing depth is not proof of an empty book.",
    };
  }

  if (hit.kind === "freshness.current") {
    const last = item(pack, EVIDENCE_IDS.priceLast);
    const staleFlag = item(pack, "data.stale");
    if (!isUsableFact(last)) {
      return {
        ...base,
        status: "unsupported",
        limiting: [last, staleFlag].filter(present),
        reasoning:
          "A 'current/live' claim was recognized, but no usable last-price FACT is available to check freshness.",
      };
    }
    if (last.status === "stale") {
      return {
        ...base,
        status: "challenged",
        challenging: [last, staleFlag].filter(present),
        reasoning:
          "The last price is a FACT whose source timestamp is older than the freshness window. Treating that print as current is challenged by freshness, not by a fabricated opposing tape.",
      };
    }
    return {
      ...base,
      status: "supported",
      supporting: [last],
      reasoning:
        "Last-price freshness is within the configured window. That still does not make the print a US tape or a forecast.",
    };
  }

  if (hit.kind === "underlying.named") {
    const named = item(pack, EVIDENCE_IDS.referenceUnderlying);
    const refPrice = item(pack, EVIDENCE_IDS.referencePrice);
    if (!named || named.classification === "UNKNOWN") {
      return {
        ...base,
        status: "unsupported",
        limiting: [named, refPrice].filter(present),
        reasoning:
          "The pack does not establish a named underlying. The claim is unsupported, and no substitute listing is invented.",
      };
    }
    if (named.classification === "ASSUMPTION") {
      return {
        ...base,
        status: "challenged",
        challenging: [named],
        limiting: refPrice ? [refPrice] : [],
        reasoning:
          "The linked underlying is an ASSUMPTION from pair-name convention, not a Bitget-verified listing. Treating it as established is limited by that classification. Naming it still does not create a US tape.",
      };
    }
    return {
      ...base,
      status: "supported",
      supporting: [named],
      limiting: refPrice ? [refPrice] : [],
      reasoning:
        "Stock-info (or an equivalent FACT) names an underlying. That identity is not a live reference price and does not establish divergence.",
    };
  }

  return {
    ...base,
    status: "unassessed",
    requiresClarification: true,
    reasoning:
      "A rule matched this sentence but produced no assessment. The claim is unassessed pending clarification.",
  };
}

function draftsFromText(pack: EvidencePack, text: string, source: ClaimSource): DraftAssessment[] {
  const hits = matchClaimRules(text, pack);
  if (hits.length === 0) {
    return [
      {
        source,
        text,
        hit: null,
        status: "unassessed",
        requiresClarification: true,
        reasoning:
          "No transparent claim-matching rule mapped this sentence onto pack evidence. It is unassessed and needs clarification — not labeled false.",
        supporting: [],
        challenging: [],
        limiting: [],
      },
    ];
  }
  return hits.map((hit) => ({ ...assessHit(pack, text, hit), source, text }));
}

function toAssessment(draft: DraftAssessment, index: number): ClaimAssessment {
  const supportingEvidence = draft.supporting.map((entry) => toRef(entry, "supports"));
  const challengingEvidence = draft.challenging.map((entry) => toRef(entry, "challenges"));
  const limitingEvidence = draft.limiting.map((entry) => toRef(entry, "limits"));
  const evidenceIds = uniqueIds([
    ...supportingEvidence.map((entry) => entry.evidenceId),
    ...challengingEvidence.map((entry) => entry.evidenceId),
    ...limitingEvidence.map((entry) => entry.evidenceId),
  ]);
  return {
    id: `claim.${index + 1}.${draft.hit?.ruleId ?? "unmapped"}`,
    source: draft.source,
    text: draft.text,
    ruleId: draft.hit?.ruleId ?? null,
    kind: draft.hit?.kind ?? null,
    status: draft.status,
    reasoning: draft.reasoning,
    requiresClarification: draft.requiresClarification,
    evidenceIds,
    supportingEvidence,
    challengingEvidence,
    limitingEvidence,
  };
}

function engagedKinds(assessments: ClaimAssessment[]): Set<ClaimKind> {
  const kinds = new Set<ClaimKind>();
  for (const assessment of assessments) {
    if (assessment.kind) {
      kinds.add(assessment.kind);
    }
  }
  return kinds;
}

function buildWhatAmIMissing(
  pack: EvidencePack,
  brief: InvestigationBrief,
  assessments: ClaimAssessment[],
): MissingItem[] {
  const items: MissingItem[] = [];
  const kinds = engagedKinds(assessments);

  for (const paragraph of brief.unknowns.paragraphs) {
    items.push({
      id: `missing.unknown.${paragraph.id}`,
      kind: "unknown",
      title: "Unknown in the investigation brief",
      text: paragraph.text,
      evidenceIds: paragraph.evidenceIds,
    });
  }

  for (const tension of brief.tensions) {
    items.push({
      id: `missing.tension.${tension.id}`,
      kind: "tension",
      title: tension.title,
      text: `${tension.explanation} This is an interpretation risk from the brief, not proof the thesis is false.`,
      evidenceIds: tension.evidenceIds,
    });
  }

  const relevantLimits = brief.doesNotEstablish.filter((paragraph) => {
    if (paragraph.id === "limit.cause" && (kinds.has("causation") || kinds.has("news") || kinds.has("price.direction"))) {
      return true;
    }
    if (paragraph.id === "limit.tape" && (kinds.has("reference.tape") || kinds.has("underlying.named"))) {
      return true;
    }
    if (paragraph.id === "limit.liquidity" && kinds.has("liquidity")) {
      return true;
    }
    if (paragraph.id === "limit.reality-depth" && (kinds.has("depth.reality") || kinds.has("liquidity"))) {
      return true;
    }
    if (paragraph.id === "limit.trade" && kinds.has("trade.action")) {
      return true;
    }
    return false;
  });
  for (const paragraph of relevantLimits) {
    items.push({
      id: `missing.limit.${paragraph.id}`,
      kind: "does-not-establish",
      title: "The evidence does not establish this",
      text: paragraph.text,
      evidenceIds: paragraph.evidenceIds,
    });
  }

  const caveatSeen = new Set<string>();
  for (const assessment of assessments) {
    const refs = [
      ...assessment.supportingEvidence,
      ...assessment.challengingEvidence,
      ...assessment.limitingEvidence,
    ];
    for (const ref of refs) {
      for (const caveat of ref.caveats) {
        const key = `${ref.evidenceId}:${caveat}`;
        if (caveatSeen.has(key)) {
          continue;
        }
        caveatSeen.add(key);
        items.push({
          id: `missing.caveat.${ref.evidenceId}.${caveatSeen.size}`,
          kind: "caveat",
          title: `Caveat on ${ref.evidenceId}`,
          text: caveat,
          evidenceIds: [ref.evidenceId],
        });
      }
    }
  }

  for (const failure of pack.failures) {
    items.push({
      id: `missing.failure.${failure.resource}`,
      kind: "failure",
      title: `Partial data: ${failure.resource} failed`,
      text: `${failure.resource} failed (${failure.message}). Surviving evidence is retained. A failed resource is not filled with substitute values and is not used as proof against the thesis.`,
      evidenceIds: pack.items.filter((entry) => entry.id === `data.failure.${failure.resource}`).map((entry) => entry.id),
    });
  }

  return items;
}

function buildAttack(
  brief: InvestigationBrief,
  assessments: ClaimAssessment[],
): AttackPoint[] {
  const points: AttackPoint[] = [];
  const kinds = engagedKinds(assessments);

  for (const assessment of assessments) {
    if (assessment.status !== "challenged") {
      continue;
    }
    const evidenceIds = uniqueIds([
      ...assessment.challengingEvidence.map((entry) => entry.evidenceId),
      ...assessment.limitingEvidence.map((entry) => entry.evidenceId),
    ]);
    points.push({
      id: `attack.claim.${assessment.id}`,
      title: "Evidence challenges this claim",
      text: assessment.reasoning,
      evidenceIds,
      assessmentId: assessment.id,
      invented: false,
    });
  }

  const tensionByKind: Array<{ id: string; kinds: ClaimKind[] }> = [
    { id: TENSION_IDS.moveWithoutCause, kinds: ["price.direction", "causation", "news"] },
    { id: TENSION_IDS.tokenVsClosedEquity, kinds: ["session.us", "price.last", "price.direction"] },
    { id: TENSION_IDS.namedUnderlyingWithoutTape, kinds: ["reference.tape", "underlying.named"] },
    { id: TENSION_IDS.staleLastPrice, kinds: ["freshness.current", "price.last"] },
    { id: TENSION_IDS.utaBookVsRealityDepth, kinds: ["liquidity", "depth.reality"] },
    { id: TENSION_IDS.conventionUnderlying, kinds: ["underlying.named"] },
    { id: TENSION_IDS.invertedBook, kinds: ["price.last", "liquidity"] },
  ];

  for (const mapping of tensionByKind) {
    if (!mapping.kinds.some((kind) => kinds.has(kind))) {
      continue;
    }
    const tension = brief.tensions.find((entry) => entry.id === mapping.id);
    if (!tension) {
      continue;
    }
    points.push({
      id: `attack.tension.${tension.id}`,
      title: tension.title,
      text: `${tension.explanation} This restates a brief tension. Uncertainty and UNKNOWN items are not treated as proof the thesis is false.`,
      evidenceIds: tension.evidenceIds,
      tensionId: tension.id,
      invented: false,
    });
  }

  if (brief.tensions.some((tension) => tension.id === TENSION_IDS.partialFailure)) {
    const tension = brief.tensions.find((entry) => entry.id === TENSION_IDS.partialFailure)!;
    points.push({
      id: `attack.tension.${tension.id}`,
      title: tension.title,
      text: `${tension.explanation} Partial data is disclosed so the thesis is not stress-tested against a complete book.`,
      evidenceIds: tension.evidenceIds,
      tensionId: tension.id,
      invented: false,
    });
  }

  return points;
}

function buildTraderAssumptions(
  input: ThesisInput,
  assessments: ClaimAssessment[],
): TraderAssumption[] {
  const submitted = normalizeAssumptions(input.assumptions);
  const list: TraderAssumption[] = submitted.map((text, index) => {
    const related = assessments.filter((assessment) => assessment.source === "assumption" && assessment.text === text);
    return {
      id: `assumption.submitted.${index + 1}`,
      text,
      origin: "submitted" as const,
      relatedAssessmentIds: related.map((assessment) => assessment.id),
      evidenceIds: uniqueIds(related.flatMap((assessment) => assessment.evidenceIds)),
    };
  });

  const implied: Array<{ text: string; kinds: ClaimKind[]; requireStatus?: ClaimAssessment["status"] }> = [
    {
      text: "A Bitget 24-hour change can be read as a reason price moved.",
      kinds: ["causation"],
    },
    {
      text: "A named underlying implies a live US-listed reference tape.",
      kinds: ["reference.tape", "underlying.named"],
    },
    {
      text: "A public UTA book snapshot is executable Reality depth.",
      kinds: ["liquidity", "depth.reality"],
    },
    {
      text: "A stale last price can still be treated as the current print.",
      kinds: ["freshness.current"],
      requireStatus: "challenged",
    },
  ];

  for (const [index, entry] of implied.entries()) {
    const related = assessments.filter((assessment) => {
      if (!assessment.kind || !entry.kinds.includes(assessment.kind) || assessment.status === "unassessed") {
        return false;
      }
      if (entry.requireStatus && assessment.status !== entry.requireStatus) {
        return false;
      }
      return true;
    });
    if (related.length === 0) {
      continue;
    }
    list.push({
      id: `assumption.implied.${index + 1}`,
      text: entry.text,
      origin: "implied",
      relatedAssessmentIds: related.map((assessment) => assessment.id),
      evidenceIds: uniqueIds(related.flatMap((assessment) => assessment.evidenceIds)),
    });
  }

  return list;
}

export function parseThesisInput(raw: unknown, options: { allowEmpty?: boolean } = {}): ThesisInput {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Challenge input must be an object with a thesis string.");
  }
  const record = raw as Record<string, unknown>;
  const thesis = typeof record.thesis === "string" ? record.thesis.trim() : "";
  if (!thesis && !options.allowEmpty) {
    throw new Error("A thesis is required.");
  }
  if (thesis.length > 4000) {
    throw new Error("Thesis exceeds the 4000-character limit.");
  }
  const reason = typeof record.reason === "string" ? record.reason.trim() : undefined;
  if (reason && reason.length > 2000) {
    throw new Error("Reason exceeds the 2000-character limit.");
  }
  const assumptions = normalizeAssumptions(
    Array.isArray(record.assumptions)
      ? record.assumptions.filter((item): item is string => typeof item === "string")
      : typeof record.assumptions === "string"
        ? record.assumptions
        : undefined,
  ).slice(0, 20);
  return {
    thesis,
    reason: reason || undefined,
    assumptions: assumptions.length > 0 ? assumptions : undefined,
    structuredClaims: Array.isArray(record.structuredClaims)
      ? (record.structuredClaims as ThesisInput["structuredClaims"])
      : Array.isArray(record.claims)
        ? (record.claims as ThesisInput["structuredClaims"])
        : undefined,
  };
}

export function buildInterpretationChallenge(options: {
  pack: EvidencePack;
  brief: InvestigationBrief;
  input: ThesisInput;
}): InterpretationChallenge {
  const { pack, brief } = options;
  const input: ThesisInput = {
    thesis: options.input.thesis.trim(),
    reason: options.input.reason?.trim() || undefined,
    assumptions: normalizeAssumptions(options.input.assumptions),
    structuredClaims: options.input.structuredClaims,
  };
  if (input.assumptions?.length === 0) {
    delete input.assumptions;
  }
  if (!input.structuredClaims?.length) {
    delete input.structuredClaims;
  }

  const drafts: DraftAssessment[] = [];
  for (const text of splitClaimText(input.thesis)) {
    drafts.push(...draftsFromText(pack, text, "thesis"));
  }
  if (input.reason) {
    for (const text of splitClaimText(input.reason)) {
      drafts.push(...draftsFromText(pack, text, "reason"));
    }
  }
  for (const text of input.assumptions ?? []) {
    drafts.push(...draftsFromText(pack, text, "assumption"));
  }

  if (drafts.length === 0) {
    drafts.push({
      source: "thesis",
      text: input.thesis,
      hit: null,
      status: "unassessed",
      requiresClarification: true,
      reasoning: "No claim sentences were extracted. The thesis is unassessed pending clarification.",
      supporting: [],
      challenging: [],
      limiting: [],
    });
  }

  const assessments = drafts.map((draft, index) => toAssessment(draft, index));
  const whatAmIMissing = buildWhatAmIMissing(pack, brief, assessments);
  const attackMyThesis = buildAttack(brief, assessments);
  const traderAssumptions = buildTraderAssumptions(input, assessments);

  const citations: Record<string, CitedEvidence> = { ...brief.citations };
  const addIds = (ids: string[]) => {
    for (const id of ids) {
      if (citations[id]) {
        continue;
      }
      const entry = pack.items.find((item) => item.id === id);
      if (entry) {
        citations[id] = toCitedEvidence(entry);
      }
    }
  };
  for (const assessment of assessments) {
    addIds(assessment.evidenceIds);
  }
  for (const missing of whatAmIMissing) {
    addIds(missing.evidenceIds);
  }
  for (const attack of attackMyThesis) {
    addIds(attack.evidenceIds);
  }

  const summary = {
    supported: assessments.filter((item) => item.status === "supported").length,
    challenged: assessments.filter((item) => item.status === "challenged").length,
    unsupported: assessments.filter((item) => item.status === "unsupported").length,
    unassessed: assessments.filter((item) => item.status === "unassessed").length,
    assumptions: traderAssumptions.length,
  };

  return {
    milestone: "5-interpretation-challenge",
    advisory: false,
    requestedSymbol: pack.investigation.requestedSymbol,
    pair: pack.investigation.pair,
    tokenSymbol: pack.investigation.tokenSymbol,
    retrievedAt: pack.investigation.retrievedAt,
    input,
    assessments,
    summary,
    whatAmIMissing,
    attackMyThesis,
    traderAssumptions,
    citations,
    failures: pack.failures,
    limitations: [...CHALLENGE_LIMITATIONS, ...brief.limitations],
  };
}
