import { EVIDENCE_IDS } from "@/lib/evidence/types";
import type { EvidenceItem, EvidencePack } from "@/lib/evidence/types";
import { detectTensions } from "./tensions";
import {
  BRIEF_LIMITATIONS,
  toCitedEvidence,
  type BriefParagraph,
  type BriefSection,
  type CitedEvidence,
  type InvestigationBrief,
} from "./types";

function itemsOf(
  pack: EvidencePack,
  classification: EvidenceItem["classification"],
  topic?: EvidenceItem["topic"],
): EvidenceItem[] {
  return pack.items.filter((item) => {
    if (item.classification !== classification) {
      return false;
    }
    if (topic && item.topic !== topic) {
      return false;
    }
    return true;
  });
}

function paragraphFromItem(item: EvidenceItem, extra?: string): BriefParagraph {
  const suffix =
    extra ??
    (item.classification === "INFERENCE" && item.supports.length > 0
      ? ` This is an INFERENCE supported by ${item.supports.join(", ")}.`
      : item.classification === "ASSUMPTION"
        ? " This is an ASSUMPTION, not verified Bitget information."
        : item.classification === "UNKNOWN"
          ? " This remains UNKNOWN — an unanswered question, not a negative finding."
          : item.status === "stale"
            ? " This FACT is stale relative to the freshness window."
            : "");
  return {
    id: `para.${item.id}`,
    text: `${item.claim}${suffix}`,
    evidenceIds: item.classification === "INFERENCE" ? [item.id, ...item.supports] : [item.id],
  };
}

function section(
  id: string,
  title: string,
  intro: string,
  items: EvidenceItem[],
  extra?: (item: EvidenceItem) => string,
): BriefSection {
  return {
    id,
    title,
    intro,
    paragraphs: items.map((item) => paragraphFromItem(item, extra?.(item))),
    evidenceIds: items.map((item) => item.id),
  };
}

export function buildInvestigationBrief(pack: EvidencePack): InvestigationBrief {
  const facts = itemsOf(pack, "FACT").filter((item) => !item.id.startsWith("data."));
  const staleFacts = itemsOf(pack, "FACT").filter((item) => item.id === "data.stale");
  const observedFacts = [...facts, ...staleFacts];
  const inferences = itemsOf(pack, "INFERENCE");
  const assumptions = itemsOf(pack, "ASSUMPTION");
  const unknowns = itemsOf(pack, "UNKNOWN");
  const sessionItems = pack.items.filter((item) => item.topic === "session");
  const tensions = detectTensions(pack);

  const last = pack.items.find((item) => item.id === EVIDENCE_IDS.priceLast);
  const session = pack.items.find((item) => item.id === EVIDENCE_IDS.sessionCurrent);
  const identity = pack.items.find((item) => item.id === EVIDENCE_IDS.instrumentIdentity);

  const executiveSummary: BriefParagraph[] = [
    {
      id: "summary.coverage",
      text: `Evidence coverage for ${pack.investigation.tokenSymbol}: ${pack.summary.fact} FACT, ${pack.summary.inference} INFERENCE, ${pack.summary.assumption} ASSUMPTION, ${pack.summary.unknown} UNKNOWN. ${pack.summary.stale} stale, ${pack.summary.error} error, ${pack.summary.unverified} unverified.`,
      evidenceIds: identity ? [identity.id] : pack.items.slice(0, 1).map((item) => item.id),
    },
  ];

  if (last) {
    executiveSummary.push({
      id: "summary.price",
      text:
        last.classification === "FACT"
          ? last.claim
          : `A current Bitget last price is not established. ${last.claim}`,
      evidenceIds: [last.id],
    });
  }

  if (session) {
    executiveSummary.push({
      id: "summary.session",
      text:
        session.classification === "UNKNOWN"
          ? session.claim
          : `${session.claim} Session mapping is an inference from Bitget windows and the New York clock, not a live US tape status.`,
      evidenceIds: [session.id, ...(pack.items.find((item) => item.id === EVIDENCE_IDS.sessionWindows) ? [EVIDENCE_IDS.sessionWindows] : [])],
    });
  }

  executiveSummary.push({
    id: "summary.non-advisory",
    text: "This investigation brief is non-advisory. It does not recommend a trade, predict price, or decide a position.",
    evidenceIds: identity ? [identity.id] : pack.items.slice(0, 1).map((item) => item.id),
  });

  const doesNotEstablish: BriefParagraph[] = [
    {
      id: "limit.tape",
      text: "The evidence does not establish a live US-listed underlying tape or a verified reference price.",
      evidenceIds: [EVIDENCE_IDS.referencePrice],
    },
    {
      id: "limit.cause",
      text: "The evidence does not establish why any 24-hour price change occurred. A ticker percent is not a cause, news event, or signal.",
      evidenceIds: [EVIDENCE_IDS.priceChange24h, EVIDENCE_IDS.newsContext],
    },
    {
      id: "limit.liquidity",
      text: "The evidence does not establish executable liquidity, slippage, or a depth model.",
      evidenceIds: [EVIDENCE_IDS.liquidityModel],
    },
    {
      id: "limit.reality-depth",
      text: "The evidence does not establish whitelist Reality 40-level depth unless that book is itself a FACT in the pack.",
      evidenceIds: [EVIDENCE_IDS.depthReality, EVIDENCE_IDS.depthPublicUta],
    },
    {
      id: "limit.trade",
      text: "The evidence does not establish a buy, sell, hold, or size decision.",
      evidenceIds: identity ? [identity.id] : [EVIDENCE_IDS.priceLast],
    },
  ];

  const presentIds = new Set(pack.items.map((item) => item.id));
  const nextQuestions: BriefParagraph[] = unknowns.map((item) => ({
    id: `next.${item.id}`,
    text: item.claim,
    evidenceIds: [item.id],
  }));

  const draft = {
    milestone: "4-investigation-brief" as const,
    advisory: false as const,
    question: pack.investigation.question,
    requestedSymbol: pack.investigation.requestedSymbol,
    pair: pack.investigation.pair,
    tokenSymbol: pack.investigation.tokenSymbol,
    retrievedAt: pack.investigation.retrievedAt,
    isDemoFixture: pack.investigation.isDemoFixture,
    fixtureId: pack.investigation.fixtureId,
    fixtureLabel: pack.investigation.fixtureLabel,
    executiveSummary,
    marketAndSession: section(
      "market-session",
      "Market and session context",
      "Session labels that are inferred from Bitget windows are not live US exchange status.",
      sessionItems,
    ),
    observedFacts: section(
      "facts",
      "Observed facts",
      "Each line is the evidence-pack FACT claim. These are not rewritten into conclusions.",
      observedFacts,
    ),
    derivedInferences: section(
      "inferences",
      "Derived inferences",
      "Inferences are calculations or session mapping. Supporting FACT IDs are attached.",
      inferences,
    ),
    assumptions: section(
      "assumptions",
      "Assumptions",
      "Assumptions are convention-based and are not verified Bitget listings or prints.",
      assumptions,
    ),
    unknowns: section(
      "unknowns",
      "Unknowns and unavailable evidence",
      "UNKNOWN items are unanswered questions. They are not findings that the thing is false.",
      unknowns,
    ),
    tensions,
    doesNotEstablish: doesNotEstablish.filter((paragraph) =>
      paragraph.evidenceIds.some((id) => presentIds.has(id)),
    ),
    nextQuestions,
    failures: pack.failures,
    limitations: [...BRIEF_LIMITATIONS, ...pack.limitations],
  };

  const citations: Record<string, CitedEvidence> = {};
  const addIds = (ids: string[]) => {
    for (const id of ids) {
      const item = pack.items.find((entry) => entry.id === id);
      if (item) {
        citations[id] = toCitedEvidence(item);
      }
    }
  };
  for (const paragraph of [
    ...draft.executiveSummary,
    ...draft.marketAndSession.paragraphs,
    ...draft.observedFacts.paragraphs,
    ...draft.derivedInferences.paragraphs,
    ...draft.assumptions.paragraphs,
    ...draft.unknowns.paragraphs,
    ...draft.doesNotEstablish,
    ...draft.nextQuestions,
  ]) {
    addIds(paragraph.evidenceIds);
  }
  addIds(draft.marketAndSession.evidenceIds);
  addIds(draft.observedFacts.evidenceIds);
  addIds(draft.derivedInferences.evidenceIds);
  addIds(draft.assumptions.evidenceIds);
  addIds(draft.unknowns.evidenceIds);
  for (const tension of draft.tensions) {
    addIds(tension.evidenceIds);
  }

  return {
    ...draft,
    citations,
  };
}

export function allCitedEvidenceIds(brief: InvestigationBrief): string[] {
  return Object.keys(brief.citations);
}
