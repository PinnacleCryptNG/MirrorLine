import { EVIDENCE_IDS } from "@/lib/evidence/types";
import type { EvidenceItem, EvidencePack } from "@/lib/evidence/types";
import { itemById } from "@/lib/brief/types";
import { hasNegation } from "./split";
import type { ClaimKind } from "./types";

export interface RuleHit {
  ruleId: string;
  kind: ClaimKind;
  polarity?: "up" | "down" | "open" | "closed" | "current";
  negated: boolean;
}

export interface ClaimRule {
  id: string;
  kind: ClaimKind;
  description: string;
  match: (text: string, pack: EvidencePack) => boolean | { polarity?: RuleHit["polarity"] };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const UP_RE =
  /\b(rose|rallied|pumped|gained|increased|green|bullish|higher|climbing|rising|rises|rally|pump|uptick|upward|moved up|going up|went up|is up|was up|price up)\b/i;
const DOWN_RE =
  /\b(fell|fallen|dropped|dumped|lost|decreased|red|bearish|lower|falling|declined|decline|selloff|sold off|downtick|downward|moved down|going down|went down|is down|was down|price down)\b/i;
const LAST_PRICE_RE =
  /\b(last (price|print|trade)|is quoting|has a (last )?price|printed|last traded|spot price|token price)\b/i;
const US_CLOSED_RE =
  /\b((us|u\.s\.|equity|stock market)\b.{0,48}\b(closed|after[- ]hours|overnight)|after[- ]hours|us session is closed|equity (is )?closed|weekend (session|market|close))\b/i;
const US_OPEN_RE =
  /\b((us|u\.s\.|equity|stock market)\b.{0,48}\b(open|regular hours|regular session)|during (the )?us session|market is open|equity (is )?open|regular us hours)\b/i;
const CAUSATION_RE =
  /\b(because|caused by|due to|driven by|on the back of|catalyst|as a result of|thanks to|following (the )?(news|earnings|announcement))\b/i;
const NEWS_RE =
  /\b(news|headline|headlines|filing|filings|announcement|earnings|press release|catalyst)\b/i;
const TAPE_RE =
  /\b(cheap(er)?( than| vs| versus)?|expensive( than| vs| versus)?|premium|discount|diverg(e|es|ed|ence)|undervalued|overvalued|vs( the)? (stock|underlying|tape|share)|versus( the)? (stock|underlying|tape)|tracking the (stock|underlying)|us tape|reference price)\b/i;
const LIQUIDITY_RE =
  /\b(liquid|liquidity|deep book|can fill|fills easily|executable|tight (book|spread) (means|implies) liquidity)\b/i;
const DEPTH_RE =
  /\b(40[- ]level|forty[- ]level|reality (depth|book)|whitelist (book|depth)|full (book|depth))\b/i;
const CURRENT_RE =
  /\b(current(ly)?|right now|live (price|quote|print)|at this moment|as of now|up to date|fresh print)\b/i;
const TRADE_RE =
  /\b(buy|sell|long|short|go long|go short|should buy|should sell|enter|exit|add size|cut size|stop[- ]loss|take[- ]profit|price target|overweight|underweight)\b/i;
const SELL_OFF_RE = /\b(sell[- ]off|sold off)\b/i;
const UNDERLYING_WORD_RE = /\b(underlying|tracks|represents|linked to|linked with|mirrors)\b/i;

export const CLAIM_RULES: ClaimRule[] = [
  {
    id: "rule.price.direction",
    kind: "price.direction",
    description: "Maps directional price language to Bitget 24h change (FACT), never to a cause.",
    match: (text) => {
      const up = UP_RE.test(text);
      const down = DOWN_RE.test(text);
      if (up && !down) {
        return { polarity: "up" };
      }
      if (down && !up) {
        return { polarity: "down" };
      }
      return false;
    },
  },
  {
    id: "rule.price.last",
    kind: "price.last",
    description: "Maps last-price / quoting language to price.last.",
    match: (text) => LAST_PRICE_RE.test(text),
  },
  {
    id: "rule.session.us",
    kind: "session.us",
    description: "Maps explicit US session open/closed language to derived session evidence.",
    match: (text) => {
      const closed = US_CLOSED_RE.test(text);
      const open = US_OPEN_RE.test(text);
      if (closed && !open) {
        return { polarity: "closed" };
      }
      if (open && !closed) {
        return { polarity: "open" };
      }
      return false;
    },
  },
  {
    id: "rule.causation",
    kind: "causation",
    description: "Causal language is never treated as established. A ticker move is not a cause.",
    match: (text) => CAUSATION_RE.test(text),
  },
  {
    id: "rule.news",
    kind: "news",
    description: "News/earnings/headline claims map to news.context, which is UNKNOWN unless Bitget supplied news.",
    match: (text) => NEWS_RE.test(text) && !CAUSATION_RE.test(text),
  },
  {
    id: "rule.reference.tape",
    kind: "reference.tape",
    description: "Cheap/expensive/premium vs the stock maps to reference.price / divergence, which stay UNKNOWN without a US tape.",
    match: (text) => TAPE_RE.test(text),
  },
  {
    id: "rule.liquidity",
    kind: "liquidity",
    description: "Liquidity claims map to liquidity.model. A public UTA book is not executable liquidity.",
    match: (text) => LIQUIDITY_RE.test(text),
  },
  {
    id: "rule.depth.reality",
    kind: "depth.reality",
    description: "Reality 40-level / whitelist depth claims map to depth.reality.",
    match: (text) => DEPTH_RE.test(text),
  },
  {
    id: "rule.freshness.current",
    kind: "freshness.current",
    description: "Claims that a print is current/live map to last-price freshness. Stale is a limit, not a missing print.",
    match: (text) => CURRENT_RE.test(text),
  },
  {
    id: "rule.trade.action",
    kind: "trade.action",
    description: "Buy/sell/target language is not assessed. This tool does not recommend trades.",
    match: (text) => TRADE_RE.test(text) && !SELL_OFF_RE.test(text),
  },
  {
    id: "rule.underlying.named",
    kind: "underlying.named",
    description: "Named-underlying language maps to reference.underlying (FACT or ASSUMPTION).",
    match: (text, pack) => {
      if (UNDERLYING_WORD_RE.test(text)) {
        return true;
      }
      const named = itemById(pack, EVIDENCE_IDS.referenceUnderlying);
      if (!named || named.value === null || named.value === undefined) {
        return false;
      }
      const token = new RegExp(`\\b${escapeRegExp(String(named.value))}\\b`, "i");
      const display = pack.investigation.tokenSymbol.replace(/^r/i, "");
      const displayRe = display.length >= 2 ? new RegExp(`\\b${escapeRegExp(display)}\\b`, "i") : null;
      return token.test(text) || Boolean(displayRe?.test(text));
    },
  },
];

export function matchClaimRules(text: string, pack: EvidencePack): RuleHit[] {
  const negated = hasNegation(text);
  const hits: RuleHit[] = [];
  for (const rule of CLAIM_RULES) {
    const result = rule.match(text, pack);
    if (!result) {
      continue;
    }
    hits.push({
      ruleId: rule.id,
      kind: rule.kind,
      polarity: result === true ? undefined : result.polarity,
      negated,
    });
  }
  return hits;
}

export function numericEvidenceValue(item: EvidenceItem | undefined): number | null {
  if (!item || item.value === null || item.value === undefined) {
    return null;
  }
  if (typeof item.value === "number") {
    return Number.isFinite(item.value) ? item.value : null;
  }
  if (typeof item.value === "boolean") {
    return null;
  }
  const trimmed = String(item.value).replace(/%/g, "").replace(/,/g, "").trim();
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function isClosedSessionValue(value: string | number | boolean | null | undefined): boolean {
  return value === "closed" || value === "US_CLOSED" || value === "WEEKEND" || value === "HOLIDAY";
}

export function isOpenSessionValue(value: string | number | boolean | null | undefined): boolean {
  return value === "regular" || value === "US_REGULAR";
}
