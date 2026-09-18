import type { EvidenceClass } from "@/lib/market/fields";
import type { FieldStatus } from "@/lib/market/fields";
import type { ResourceFailure } from "@/lib/market/types";

export const EVIDENCE_CLASSES = ["FACT", "INFERENCE", "ASSUMPTION", "UNKNOWN"] as const;

export const EVIDENCE_IDS = {
  instrumentIdentity: "instrument.identity",
  priceLast: "price.last",
  priceTimestamp: "price.timestamp",
  priceChange24h: "price.change24h",
  priceVolume24h: "price.volume24h",
  bookBid: "book.bid",
  bookAsk: "book.ask",
  bookSpread: "book.spread",
  bookSpreadBps: "book.spreadBps",
  candlesLatestBar: "candles.latestBar",
  candlesLastCloseVsOpen: "candles.lastCloseVsOpen",
  candlesSeries: "candles.series",
  sessionWindows: "session.windows",
  sessionCurrent: "session.current",
  sessionUnderlying: "session.underlyingUsEquity",
  sessionTokenWindow: "session.tokenWindow",
  referenceUnderlying: "reference.underlying",
  referencePrice: "reference.price",
  referenceDivergence: "reference.divergence",
  referenceCompanyRange: "reference.companyRange",
  depthPublicUta: "depth.publicUta",
  depthReality: "depth.reality",
  liquidityModel: "liquidity.model",
  newsContext: "news.context",
} as const;

export type EvidenceId = (typeof EVIDENCE_IDS)[keyof typeof EVIDENCE_IDS] | `data.failure.${string}`;

export type EvidenceTopic =
  | "instrument"
  | "price"
  | "book"
  | "candles"
  | "session"
  | "reference"
  | "depth"
  | "liquidity"
  | "news"
  | "data-quality";

export type ConfidenceLevel = "high" | "medium" | "low";

export interface EvidenceSource {
  provider: string;
  endpoint?: string;
  field: string;
  observedAt?: string;
  retrievedAt?: string;
  freshnessSeconds?: number | null;
  freshnessStatus?: FieldStatus;
}

export interface EvidenceConfidence {
  level: ConfidenceLevel;
  justification: string;
}

export interface EvidenceItem {
  id: string;
  topic: EvidenceTopic;
  claim: string;
  classification: EvidenceClass;
  status: FieldStatus;
  value: string | number | boolean | null;
  unit?: string;
  sources: EvidenceSource[];
  supports: string[];
  reasoning: string;
  caveats: string[];
  confidence?: EvidenceConfidence;
}

export interface EvidencePackSummary {
  fact: number;
  inference: number;
  assumption: number;
  unknown: number;
  stale: number;
  missing: number;
  error: number;
  unverified: number;
}

export interface EvidencePack {
  milestone: "3-investigation-evidence-pack";
  investigation: {
    question: string;
    requestedSymbol: string;
    pair: string;
    tokenSymbol: string;
    retrievedAt: string;
  };
  items: EvidenceItem[];
  summary: EvidencePackSummary;
  unknowns: string[];
  limitations: string[];
  failures: ResourceFailure[];
}

export const EVIDENCE_PACK_LIMITATIONS = [
  "This pack classifies Bitget market context. It is not a trade recommendation and does not place orders.",
  "FACT items are observations from Bitget fields. INFERENCE items are calculations or session mapping over those fields.",
  "ASSUMPTION items are convention-based and are not Bitget-verified facts.",
  "UNKNOWN items are unanswered questions. They are not silent omissions and are not filled with guessed values.",
  "Price movement is not treated as causation, news, or a signal.",
  "No US tape, social feed, or fabricated Reality 40-level depth is included.",
] as const;
