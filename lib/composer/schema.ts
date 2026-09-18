export const STRUCTURED_CLAIM_KINDS = [
  "price.direction",
  "price.change24h",
  "session.us",
  "underlying.named",
  "reference.tape",
  "news.catalyst",
  "liquidity.spread",
  "depth.book",
  "other.freetext",
] as const;

export type StructuredClaimKind = (typeof STRUCTURED_CLAIM_KINDS)[number];

export interface StructuredFieldDef {
  key: string;
  label: string;
  input: "select" | "text";
  required: boolean;
  options?: readonly string[];
  note: string;
}

export interface StructuredKindDef {
  kind: StructuredClaimKind;
  label: string;
  description: string;
  limitation: string;
  mapsToRules: readonly string[];
  evidenceIds: readonly string[];
  fields: readonly StructuredFieldDef[];
}

export const STRUCTURED_KIND_DEFS: readonly StructuredKindDef[] = [
  {
    kind: "price.direction",
    label: "Price direction and timeframe",
    description: "Direction is only assessed against Bitget 24-hour change. Intraday or unspecified windows stay unassessed.",
    limitation: "Available evidence describes 24-hour ticker change, not an intraday tape.",
    mapsToRules: ["rule.price.direction"],
    evidenceIds: ["price.change24h"],
    fields: [
      {
        key: "direction",
        label: "Direction",
        input: "select",
        required: true,
        options: ["up", "down"],
        note: "Up or down relative to the selected timeframe.",
      },
      {
        key: "timeframe",
        label: "Timeframe",
        input: "select",
        required: true,
        options: ["24h", "intraday", "unspecified"],
        note: "Only 24h can be scored. Other values are unassessed, not false.",
      },
    ],
  },
  {
    kind: "price.change24h",
    label: "24-hour price change",
    description: "An explicit claim about Bitget price24hPcnt.",
    limitation: "This is a ticker field, not a cause or a forecast.",
    mapsToRules: ["rule.price.direction"],
    evidenceIds: ["price.change24h"],
    fields: [
      {
        key: "sign",
        label: "24h sign",
        input: "select",
        required: true,
        options: ["up", "down", "flat"],
        note: "Compared to Bitget 24-hour change only.",
      },
    ],
  },
  {
    kind: "session.us",
    label: "Market session",
    description: "US session label derived from Bitget windows and the New York clock.",
    limitation: "Session is an inference, not a live US exchange tape status.",
    mapsToRules: ["rule.session.us"],
    evidenceIds: ["session.current", "session.underlyingUsEquity"],
    fields: [
      {
        key: "state",
        label: "Claimed session",
        input: "select",
        required: true,
        options: ["open", "closed", "regular", "pre_market", "after_hours", "overnight"],
        note: "Open/closed use existing rules. Specific windows are checked against derived session evidence.",
      },
    ],
  },
  {
    kind: "underlying.named",
    label: "Underlying asset relationship",
    description: "Whether the rToken is named as linked to an underlying code.",
    limitation: "A named underlying is not a live US tape or a reference price.",
    mapsToRules: ["rule.underlying.named"],
    evidenceIds: ["reference.underlying", "reference.price"],
    fields: [
      {
        key: "relationship",
        label: "Relationship",
        input: "select",
        required: true,
        options: ["tracks", "represents", "named"],
        note: "Convention-based codes remain ASSUMPTION, not FACT.",
      },
      {
        key: "code",
        label: "Underlying code (optional)",
        input: "text",
        required: false,
        note: "Example: AAPL. Leave blank to use the pack's named underlying.",
      },
    ],
  },
  {
    kind: "reference.tape",
    label: "Reference price and divergence",
    description: "Cheap/expensive/premium versus a US-listed reference.",
    limitation: "Bitget does not supply a live US tape here. This claim is unsupported unless a reference price FACT appears.",
    mapsToRules: ["rule.reference.tape"],
    evidenceIds: ["reference.price", "reference.divergence"],
    fields: [
      {
        key: "comparison",
        label: "Comparison",
        input: "select",
        required: true,
        options: ["cheap", "expensive", "premium", "discount", "divergence"],
        note: "Selecting a comparison does not create a tape.",
      },
    ],
  },
  {
    kind: "news.catalyst",
    label: "News or catalyst attribution",
    description: "Whether news, earnings, or a catalyst is claimed as context or cause.",
    limitation: "No news feed is attached. Missing news is not proof the claim is false, and a ticker move is not a cause.",
    mapsToRules: ["rule.causation", "rule.news"],
    evidenceIds: ["news.context", "price.change24h"],
    fields: [
      {
        key: "attribution",
        label: "Attribution",
        input: "select",
        required: true,
        options: ["news", "earnings", "catalyst", "unknown-cause"],
        note: "Causal wording stays unsupported. unknown-cause maps to unanswered news context.",
      },
    ],
  },
  {
    kind: "liquidity.spread",
    label: "Liquidity and spread",
    description: "Executable liquidity versus a derived bid-ask spread.",
    limitation: "A derived spread is not a liquidity model. Ticker size is not available depth.",
    mapsToRules: ["rule.liquidity"],
    evidenceIds: ["liquidity.model", "book.spread", "book.spreadBps"],
    fields: [
      {
        key: "aspect",
        label: "Aspect",
        input: "select",
        required: true,
        options: ["executable-liquidity", "spread-observed"],
        note: "executable-liquidity stays unanswered. spread-observed can cite a derived spread FACT/INFERENCE.",
      },
    ],
  },
  {
    kind: "depth.book",
    label: "Order-book depth",
    description: "Public UTA snapshot versus whitelist Reality 40-level depth.",
    limitation: "The public UTA book is not Reality 40-level depth. Missing Reality depth is not an empty book.",
    mapsToRules: ["rule.depth.reality"],
    evidenceIds: ["depth.publicUta", "depth.reality"],
    fields: [
      {
        key: "book",
        label: "Book type",
        input: "select",
        required: true,
        options: ["public-uta", "reality-40"],
        note: "public-uta cites the public snapshot. reality-40 stays UNKNOWN without a whitelist FACT.",
      },
    ],
  },
  {
    kind: "other.freetext",
    label: "Other / free-text claim",
    description: "A sentence that still goes through the existing claim matcher.",
    limitation: "Unmapped wording is unassessed, not false.",
    mapsToRules: [],
    evidenceIds: [],
    fields: [
      {
        key: "text",
        label: "Claim text",
        input: "text",
        required: true,
        note: "This is not rewritten. It is scored only if an existing rule matches.",
      },
    ],
  },
] as const;

export const COMPOSER_LIMITATIONS = [
  "Selecting a structured claim type does not make the assertion a verified fact.",
  "Structured claims are scored by the existing challenge engine plus explicit timeframe and data-limitation guards.",
  "Intraday or unspecified price direction is unassessed because the pack only classifies 24-hour change.",
  "Reference price, news, and Reality 40-level depth remain unsupported when those items are UNKNOWN — not false.",
] as const;

export function kindDef(kind: string): StructuredKindDef | undefined {
  return STRUCTURED_KIND_DEFS.find((entry) => entry.kind === kind);
}
