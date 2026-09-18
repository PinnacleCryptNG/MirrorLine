import { EVIDENCE_IDS } from "@/lib/evidence/types";
import type { EvidenceItem, EvidencePack } from "@/lib/evidence/types";
import { TENSION_IDS, itemById, type InvestigationTension } from "./types";

function numericValue(item: EvidenceItem | undefined): number | null {
  if (!item || item.value === null || item.value === undefined) {
    return null;
  }
  if (typeof item.value === "number") {
    return Number.isFinite(item.value) ? item.value : null;
  }
  if (typeof item.value === "boolean") {
    return null;
  }
  const trimmed = String(item.value).replace(/%/g, "").trim();
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function isClosedSession(value: string | number | boolean | null): boolean {
  return value === "closed" || value === "US_CLOSED" || value === "WEEKEND" || value === "HOLIDAY";
}

function hasObservedMove(item: EvidenceItem | undefined): boolean {
  if (!item || item.classification !== "FACT" || item.status === "error" || item.status === "missing") {
    return false;
  }
  const magnitude = numericValue(item);
  return magnitude !== null && magnitude !== 0;
}

export function detectTensions(pack: EvidencePack): InvestigationTension[] {
  const tensions: InvestigationTension[] = [];
  const last = itemById(pack, EVIDENCE_IDS.priceLast);
  const change = itemById(pack, EVIDENCE_IDS.priceChange24h);
  const news = itemById(pack, EVIDENCE_IDS.newsContext);
  const session = itemById(pack, EVIDENCE_IDS.sessionCurrent);
  const underlying = itemById(pack, EVIDENCE_IDS.sessionUnderlying);
  const tokenWindow = itemById(pack, EVIDENCE_IDS.sessionTokenWindow);
  const named = itemById(pack, EVIDENCE_IDS.referenceUnderlying);
  const referencePrice = itemById(pack, EVIDENCE_IDS.referencePrice);
  const publicBook = itemById(pack, EVIDENCE_IDS.depthPublicUta);
  const realityBook = itemById(pack, EVIDENCE_IDS.depthReality);
  const bid = itemById(pack, EVIDENCE_IDS.bookBid);
  const ask = itemById(pack, EVIDENCE_IDS.bookAsk);

  const usClosed =
    isClosedSession(underlying?.value ?? null) || isClosedSession(session?.value ?? null);
  const tokenIsQuoting =
    last?.classification === "FACT" && last.value !== null && last.status !== "error";
  const tokenWindowOpen = tokenWindow?.classification === "INFERENCE" && tokenWindow.value === true;

  if (usClosed && (tokenIsQuoting || tokenWindowOpen) && last && session && underlying) {
    tensions.push({
      id: TENSION_IDS.tokenVsClosedEquity,
      severity: "tension",
      title: "rToken quotes while implied US equity is closed",
      explanation:
        "A Bitget last price and/or a matching Reality trading window is present, while the derived US equity session is closed. That is expected for 24/7 rTokens and does not prove the US listed market is open. The tension is with reading a token print as a US session status.",
      evidenceIds: [last.id, session.id, underlying.id, ...(tokenWindow ? [tokenWindow.id] : [])],
    });
  }

  if (hasObservedMove(change) && news?.classification === "UNKNOWN" && change && news) {
    tensions.push({
      id: TENSION_IDS.moveWithoutCause,
      severity: "tension",
      title: "A 24-hour price change is observed without a cause",
      explanation:
        "Bitget reported a non-zero 24-hour change, and this pack has no news, filings, or social evidence. The change is a ticker field. It does not establish why price moved.",
      evidenceIds: [change.id, news.id],
    });
  }

  if (
    named &&
    (named.classification === "FACT" || named.classification === "ASSUMPTION") &&
    named.value !== null &&
    referencePrice?.classification === "UNKNOWN"
  ) {
    tensions.push({
      id: TENSION_IDS.namedUnderlyingWithoutTape,
      severity: "tension",
      title: "A linked underlying is named without a live reference price",
      explanation:
        "The pack identifies an underlying symbol, but Bitget does not provide a live US-listed tape. Naming the underlying is not a verified reference print, and divergence is not computed.",
      evidenceIds: [named.id, referencePrice.id, EVIDENCE_IDS.referenceDivergence],
    });
  }

  if (last?.classification === "FACT" && last.status === "stale") {
    tensions.push({
      id: TENSION_IDS.staleLastPrice,
      severity: "tension",
      title: "Last price is observed but stale",
      explanation:
        "The Bitget last price is a FACT with a source timestamp older than the freshness window. Treating that print as current is in tension with the freshness classification. The value is not replaced.",
      evidenceIds: [last.id, ...(itemById(pack, "data.stale") ? ["data.stale"] : [])],
    });
  }

  if (publicBook?.classification === "FACT" && realityBook?.classification === "UNKNOWN") {
    tensions.push({
      id: TENSION_IDS.utaBookVsRealityDepth,
      severity: "tension",
      title: "Public UTA book is not Reality 40-level depth",
      explanation:
        "A public UTA order-book snapshot is present, while Reality-specific 40-level depth remains unanswered. Reading the public book as whitelist Reality depth would overclaim the evidence.",
      evidenceIds: [publicBook.id, realityBook.id],
    });
  }

  if (named?.classification === "ASSUMPTION") {
    tensions.push({
      id: TENSION_IDS.conventionUnderlying,
      severity: "tension",
      title: "Underlying symbol is an assumption, not a verified listing",
      explanation:
        "The underlying code was derived from the rToken pair name because stock-info did not confirm it. Treating that code as a Bitget-verified listing would present an assumption as a fact.",
      evidenceIds: [named.id],
    });
  }

  const failureItems = pack.items.filter((item) => item.id.startsWith("data.failure."));
  if (failureItems.length > 0 && pack.items.some((item) => item.classification === "FACT")) {
    tensions.push({
      id: TENSION_IDS.partialFailure,
      severity: "tension",
      title: "The brief is partial because some Bitget resources failed",
      explanation:
        "At least one upstream Bitget resource failed, while other FACT items remain. The surviving evidence is not a complete market picture and is not filled with substitute values.",
      evidenceIds: failureItems.map((item) => item.id),
    });
  }

  const bidN = numericValue(bid);
  const askN = numericValue(ask);
  if (
    bid?.classification === "FACT" &&
    ask?.classification === "FACT" &&
    bidN !== null &&
    askN !== null &&
    bidN > askN
  ) {
    tensions.push({
      id: TENSION_IDS.invertedBook,
      severity: "contradiction",
      title: "Ticker bid is above ticker ask",
      explanation:
        "Two observed ticker fields conflict: bid1Price is greater than ask1Price. The signed spread is reported as derived, not repaired. This is an actual conflict in the Bitget ticker, not an interpretation risk.",
      evidenceIds: [bid.id, ask.id, EVIDENCE_IDS.bookSpread],
    });
  }

  return tensions;
}
