import type { Candle } from "@/lib/bitget/types";
import type { ContextField, EvidenceClass, FieldStatus } from "@/lib/market/fields";
import type { MarketContext } from "@/lib/market/types";
import {
  EVIDENCE_IDS,
  EVIDENCE_PACK_LIMITATIONS,
  type EvidenceConfidence,
  type EvidenceItem,
  type EvidencePack,
  type EvidencePackSummary,
  type EvidenceSource,
  type EvidenceTopic,
} from "./types";

function formatNumber(value: number, digits = 4): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(digits).replace(/0+$/, "").replace(/\.$/, "");
}

function formatFraction(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function sourceFromField(field: ContextField<unknown>, fieldPath: string): EvidenceSource {
  return {
    provider: field.source ?? "bitget",
    endpoint: field.endpoint,
    field: fieldPath,
    observedAt: field.observedAt,
    retrievedAt: field.retrievedAt,
    freshnessSeconds: field.freshnessSeconds ?? null,
    freshnessStatus: field.status,
  };
}

function confidenceFor(
  classification: EvidenceClass,
  status: FieldStatus,
): EvidenceConfidence | undefined {
  if (classification === "UNKNOWN") {
    return undefined;
  }
  if (classification === "ASSUMPTION") {
    return {
      level: "low",
      justification:
        "This conclusion uses a naming convention or unverified mapping, not a Bitget-confirmed field.",
    };
  }
  if (status === "stale") {
    return {
      level: "low",
      justification: "The supporting Bitget timestamp is older than the freshness window.",
    };
  }
  if (status === "unknown") {
    return {
      level: "medium",
      justification: "The value was returned, but Bitget did not provide a source timestamp to verify freshness.",
    };
  }
  if (classification === "INFERENCE") {
    return {
      level: "medium",
      justification:
        "Derived from observed Bitget fields with an explicit formula. Bitget did not independently quote this conclusion.",
    };
  }
  if (classification === "FACT" && status === "ok") {
    return {
      level: "high",
      justification: "Directly observed from a Bitget field. This is not a forecast or a causal claim.",
    };
  }
  return {
    level: "low",
    justification: `Classification ${classification} with status ${status} is retained but should be treated cautiously.`,
  };
}

function displayValue(field: ContextField<unknown>): string | number | boolean | null {
  if (field.value === null || field.value === undefined) {
    return null;
  }
  if (typeof field.value === "number" && field.unit === "fraction") {
    return formatFraction(field.value);
  }
  if (typeof field.value === "number" && field.unit === "bps") {
    return Number(field.value.toFixed(2));
  }
  if (typeof field.value === "number" || typeof field.value === "boolean" || typeof field.value === "string") {
    return field.value;
  }
  return null;
}

function itemFromField(options: {
  id: string;
  topic: EvidenceTopic;
  field: ContextField<unknown>;
  sourceField: string;
  presentClaim: string;
  absentQuestion: string;
  reasoning: string;
  caveats?: string[];
  supports?: string[];
  value?: string | number | boolean | null;
}): EvidenceItem {
  const { field } = options;
  const present = field.kind !== "unavailable" && field.value !== null && field.value !== undefined;
  const classification = present ? field.evidence : "UNKNOWN";
  const claim = present ? options.presentClaim : options.absentQuestion;
  const caveats = [
    ...(options.caveats ?? []),
    ...(field.note ? [field.note] : []),
    ...(field.formula ? [`Formula: ${field.formula}`] : []),
  ];
  return {
    id: options.id,
    topic: options.topic,
    claim,
    classification,
    status: field.status,
    value: present ? (options.value ?? displayValue(field)) : null,
    unit: field.unit,
    sources: [sourceFromField(field, options.sourceField)],
    supports: classification === "INFERENCE" || classification === "ASSUMPTION" ? (options.supports ?? []) : [],
    reasoning: present
      ? options.reasoning
      : (field.note ?? "Bitget did not provide this field, so the question remains unanswered."),
    caveats,
    confidence: confidenceFor(classification, field.status),
  };
}

function latestCandle(series: Candle[] | null | undefined): Candle | undefined {
  if (!series || series.length === 0) {
    return undefined;
  }
  return series.reduce((best, candle) => (candle.timestampMs > best.timestampMs ? candle : best), series[0]);
}

function summarize(items: EvidenceItem[]): EvidencePackSummary {
  const summary: EvidencePackSummary = {
    fact: 0,
    inference: 0,
    assumption: 0,
    unknown: 0,
    stale: 0,
    missing: 0,
    error: 0,
    unverified: 0,
  };
  for (const item of items) {
    if (item.classification === "FACT") summary.fact += 1;
    if (item.classification === "INFERENCE") summary.inference += 1;
    if (item.classification === "ASSUMPTION") summary.assumption += 1;
    if (item.classification === "UNKNOWN") summary.unknown += 1;
    if (item.status === "stale") summary.stale += 1;
    if (item.status === "missing") summary.missing += 1;
    if (item.status === "error") summary.error += 1;
    if (item.status === "unverified") summary.unverified += 1;
  }
  return summary;
}

function unknownItem(options: {
  id: string;
  topic: EvidenceTopic;
  question: string;
  reasoning: string;
  caveats?: string[];
  sources?: EvidenceSource[];
  status?: FieldStatus;
}): EvidenceItem {
  return {
    id: options.id,
    topic: options.topic,
    claim: options.question,
    classification: "UNKNOWN",
    status: options.status ?? "unverified",
    value: null,
    sources: options.sources ?? [],
    supports: [],
    reasoning: options.reasoning,
    caveats: options.caveats ?? [],
  };
}

export function defaultInvestigationQuestion(tokenSymbol: string): string {
  return `What Bitget Reality evidence is currently available for ${tokenSymbol}, and what remains unverified?`;
}

export function buildEvidencePack(
  context: MarketContext,
  options: { question?: string } = {},
): EvidencePack {
  const token = context.tokenSymbol;
  const quote = context.instrument.quoteCoin.value ?? "USDT";
  const items: EvidenceItem[] = [];

  items.push(
    itemFromField({
      id: EVIDENCE_IDS.instrumentIdentity,
      topic: "instrument",
      field: context.instrument.pair,
      sourceField: "instrument.symbol",
      presentClaim: `${token} maps to Bitget pair ${context.instrument.pair.value}. isReality=${String(context.instrument.isReality.value)}, status=${String(context.instrument.status.value)}.`,
      absentQuestion: `Which Bitget Reality instrument is ${context.requestedSymbol}?`,
      reasoning: "Instrument identity comes from GET /api/v3/market/instruments filtered to isReality=yes.",
      caveats: ["Instrument metadata is not a tradeable quote and is not a US listing confirmation."],
    }),
  );

  const last = context.price.last;
  items.push(
    itemFromField({
      id: EVIDENCE_IDS.priceLast,
      topic: "price",
      field: last,
      sourceField: "ticker.lastPrice",
      presentClaim: `Bitget last price for ${token} is ${typeof last.value === "number" ? formatNumber(last.value) : last.value} ${quote}.`,
      absentQuestion: `What is the current Bitget last price for ${token}?`,
      reasoning: "Copied from Bitget ticker lastPrice. This is the rToken price on Bitget, not a US tape print.",
      caveats: [
        "A last price is not a recommendation and does not imply fair value.",
        "Freshness is judged against the Bitget ticker timestamp when one is provided.",
      ],
    }),
  );

  items.push(
    itemFromField({
      id: EVIDENCE_IDS.priceTimestamp,
      topic: "price",
      field: context.price.sourceTimestamp,
      sourceField: "ticker.ts",
      presentClaim: `The Bitget ticker source timestamp is ${String(context.price.sourceTimestamp.value)}.`,
      absentQuestion: `When did Bitget stamp the ${token} ticker?`,
      reasoning: "Preserved from Bitget ticker ts. Mirrorline does not invent a timestamp when Bitget omits one.",
    }),
  );

  const change = context.price.change24hPercent;
  items.push(
    itemFromField({
      id: EVIDENCE_IDS.priceChange24h,
      topic: "price",
      field: change,
      sourceField: "ticker.price24hPcnt",
      presentClaim:
        typeof change.value === "number"
          ? `Bitget reported a 24-hour price change of ${formatFraction(change.value)} for ${token}.`
          : `Bitget returned a 24-hour change field for ${token}.`,
      absentQuestion: `What 24-hour change did Bitget report for ${token}?`,
      reasoning:
        "Observed from Bitget price24hPcnt (a decimal fraction). This describes a ticker field, not why price moved.",
      caveats: [
        "This is not a causal claim, news interpretation, or trading signal.",
        "Bitget price24hPcnt is displayed as fraction × 100.",
      ],
    }),
  );

  items.push(
    itemFromField({
      id: EVIDENCE_IDS.priceVolume24h,
      topic: "price",
      field: context.price.volume24h,
      sourceField: "ticker.volume24h",
      presentClaim: `Bitget 24-hour volume for ${token} is ${String(context.price.volume24h.value)}.`,
      absentQuestion: `What 24-hour volume did Bitget report for ${token}?`,
      reasoning: "Observed from Bitget ticker volume24h. This is not a liquidity or slippage model.",
      caveats: ["Volume is a ticker aggregate, not order-book depth."],
    }),
  );

  items.push(
    itemFromField({
      id: EVIDENCE_IDS.bookBid,
      topic: "book",
      field: context.bookTop.bid,
      sourceField: "ticker.bid1Price",
      presentClaim: `Bitget ticker bid1Price for ${token} is ${typeof context.bookTop.bid.value === "number" ? formatNumber(context.bookTop.bid.value) : context.bookTop.bid.value} ${quote}.`,
      absentQuestion: `What bid did Bitget report on the ${token} ticker?`,
      reasoning: "Observed from Get Tickers bid1Price. This is top-of-book on the ticker, not full depth.",
      caveats: ["Ticker bid/ask/size are not Reality 40-level depth."],
    }),
  );
  items.push(
    itemFromField({
      id: EVIDENCE_IDS.bookAsk,
      topic: "book",
      field: context.bookTop.ask,
      sourceField: "ticker.ask1Price",
      presentClaim: `Bitget ticker ask1Price for ${token} is ${typeof context.bookTop.ask.value === "number" ? formatNumber(context.bookTop.ask.value) : context.bookTop.ask.value} ${quote}.`,
      absentQuestion: `What ask did Bitget report on the ${token} ticker?`,
      reasoning: "Observed from Get Tickers ask1Price. This is top-of-book on the ticker, not full depth.",
      caveats: ["Ticker bid/ask/size are not Reality 40-level depth."],
    }),
  );

  const spread = context.bookTop.spread;
  items.push(
    itemFromField({
      id: EVIDENCE_IDS.bookSpread,
      topic: "book",
      field: spread,
      sourceField: "derived.spread",
      presentClaim:
        typeof spread.value === "number"
          ? `Derived spread for ${token} is ${formatNumber(spread.value)} ${quote} (ask − bid).`
          : `A spread was derived for ${token}.`,
      absentQuestion: `What is the bid/ask spread for ${token}?`,
      reasoning: "INFERENCE from observed ticker bid and ask. Bitget did not return a spread field.",
      supports: [EVIDENCE_IDS.bookBid, EVIDENCE_IDS.bookAsk],
      caveats: ["Spread uses ticker top-of-book, not an order book. It is not a liquidity or execution-cost model."],
    }),
  );
  items.push(
    itemFromField({
      id: EVIDENCE_IDS.bookSpreadBps,
      topic: "book",
      field: context.bookTop.spreadBps,
      sourceField: "derived.spreadBps",
      presentClaim:
        typeof context.bookTop.spreadBps.value === "number"
          ? `Derived spread for ${token} is ${formatNumber(context.bookTop.spreadBps.value, 2)} bps versus mid.`
          : `A basis-point spread was derived for ${token}.`,
      absentQuestion: `What is the basis-point spread for ${token}?`,
      reasoning: "INFERENCE: (ask − bid) / mid × 10,000, with mid falling back to last price if mid is 0.",
      supports: [EVIDENCE_IDS.bookBid, EVIDENCE_IDS.bookAsk, EVIDENCE_IDS.priceLast],
    }),
  );

  const series = context.candles.series.value;
  const latest = latestCandle(series);
  if (latest && context.candles.latestClose.kind !== "unavailable") {
    items.push({
      id: EVIDENCE_IDS.candlesLatestBar,
      topic: "candles",
      claim: `The newest returned ${context.candles.interval} candle for ${token} has open ${latest.open}, high ${latest.high}, low ${latest.low}, close ${latest.close} at ${latest.timestamp}.`,
      classification: "FACT",
      status: context.candles.latestClose.status,
      value: latest.close,
      sources: [sourceFromField(context.candles.latestClose, "candles[-1]")],
      supports: [],
      reasoning:
        "OHLC is copied from the Bitget market candle with the greatest timestampMs in the returned series.",
      caveats: [
        context.candles.latestClose.note ?? "rToken candles use type=market on Bitget-supported intervals only.",
        "This is one returned bar, not a trend, forecast, or cause.",
      ],
      confidence: confidenceFor("FACT", context.candles.latestClose.status),
    });

    const openN = Number(latest.open);
    const closeN = Number(latest.close);
    if (Number.isFinite(openN) && Number.isFinite(closeN)) {
      const relation = closeN > openN ? "above" : closeN < openN ? "below" : "at";
      items.push({
        id: EVIDENCE_IDS.candlesLastCloseVsOpen,
        topic: "candles",
        claim: `The newest returned ${context.candles.interval} candle closed ${relation} its open.`,
        classification: "INFERENCE",
        status: context.candles.latestClose.status,
        value: relation,
        sources: [sourceFromField(context.candles.latestClose, "candles[-1].close/open")],
        supports: [EVIDENCE_IDS.candlesLatestBar],
        reasoning: `Compared close ${latest.close} with open ${latest.open} on the same Bitget candle. This is a description of one bar, not a trend or a reason price moved.`,
        caveats: [
          "Do not treat close-versus-open as causation, momentum, or a trading signal.",
          "No news or US tape is attached to this comparison.",
        ],
        confidence: confidenceFor("INFERENCE", context.candles.latestClose.status),
      });
    }
  } else {
    items.push(
      itemFromField({
        id: EVIDENCE_IDS.candlesLatestBar,
        topic: "candles",
        field: context.candles.latestClose,
        sourceField: "candles[-1].close",
        presentClaim: `Latest ${context.candles.interval} close for ${token} is ${String(context.candles.latestClose.value)}.`,
        absentQuestion: `What is the latest ${context.candles.interval} candle for ${token}?`,
        reasoning: "Candle history comes from GET /api/v3/market/candles with type=market.",
      }),
    );
  }

  items.push(
    itemFromField({
      id: EVIDENCE_IDS.candlesSeries,
      topic: "candles",
      field: context.candles.series,
      sourceField: "candles",
      presentClaim: `Bitget returned ${String(context.candles.count.value ?? series?.length ?? 0)} ${context.candles.interval} market candles for ${token}. Supported rToken intervals: ${context.candles.supportedIntervals.join(", ")}.`,
      absentQuestion: `What candle history is available for ${token}?`,
      reasoning:
        "Observed candle tuples from GET /api/v3/market/candles with type=market. The count is the returned length, not a complete-history guarantee.",
      value: context.candles.count.value,
      caveats: ["Volume/turnover may be empty for candles before 2026-07-09."],
    }),
  );

  const windows = context.session.windows.value ?? [];
  items.push(
    itemFromField({
      id: EVIDENCE_IDS.sessionWindows,
      topic: "session",
      field: context.session.windows,
      sourceField: "reality.market.states.stateList",
      presentClaim: `Bitget published ${windows.length} US session windows: ${windows.map((window) => `${window.state} ${window.startTime}–${window.endTime}`).join("; ")}.`,
      absentQuestion: "What US session windows did Bitget publish?",
      reasoning: "Observed schedule from GET /api/v3/reality/market/states. These windows are not a live session flag.",
      value: windows.length,
    }),
  );

  items.push(
    itemFromField({
      id: EVIDENCE_IDS.sessionCurrent,
      topic: "session",
      field: context.session.marketSession,
      sourceField: "derived.marketSession",
      presentClaim: `Derived market session is ${String(context.session.marketSession.value)} (Bitget state ${String(context.session.bitgetState.value ?? "none")}).`,
      absentQuestion: "What is the current US / Reality session?",
      reasoning:
        context.session.derivation.join(" ") ||
        "Session is derived by matching America/New_York civil time to Bitget calendar holidays/weekends and state windows.",
      supports: [EVIDENCE_IDS.sessionWindows],
      caveats: [
        "Bitget labels windows EST even when the US is on daylight time. Derivation uses America/New_York civil time.",
        "Overnight Reality trading does not mean the underlying US equity session is open.",
      ],
    }),
  );

  items.push(
    itemFromField({
      id: EVIDENCE_IDS.sessionUnderlying,
      topic: "session",
      field: context.session.underlyingUsEquity,
      sourceField: "derived.underlyingUsEquity",
      presentClaim: `Implied US equity session is ${String(context.session.underlyingUsEquity.value)}.`,
      absentQuestion: "Is the underlying US equity session regular, extended, or closed?",
      reasoning:
        "Mapped from the derived Bitget state: regular→regular, pre_market/after_hours→extended, overnight/weekend/holiday→closed. This is not a live US exchange status feed.",
      supports: [EVIDENCE_IDS.sessionCurrent],
    }),
  );

  items.push(
    itemFromField({
      id: EVIDENCE_IDS.sessionTokenWindow,
      topic: "session",
      field: context.session.tokenWindowMatch,
      sourceField: "stock-info.tradingPeriod",
      presentClaim: `stock-info tradingPeriod ${context.session.tokenWindowMatch.value ? "includes" : "does not include"} the current Bitget state for ${token}.`,
      absentQuestion: `Does Bitget list the current state as a tradable window for ${token}?`,
      reasoning:
        "INFERENCE: stock-info.tradingPeriod includes the derived Bitget state. This is not an order-routing or fill guarantee.",
      supports: [EVIDENCE_IDS.sessionCurrent],
    }),
  );

  items.push(
    itemFromField({
      id: EVIDENCE_IDS.referenceUnderlying,
      topic: "reference",
      field: context.reference.underlyingSymbol,
      sourceField:
        context.reference.underlyingSymbol.kind === "observed"
          ? "stock-info.code"
          : "symbol-convention.underlying",
      presentClaim: `The linked underlying symbol for ${token} is ${String(context.reference.underlyingSymbol.value)}.`,
      absentQuestion: `What listed underlying, if any, is linked to ${token}?`,
      reasoning:
        context.reference.underlyingSymbol.kind === "observed"
          ? "Observed from Bitget Reality stock-info `code`."
          : "Derived from the rToken pair name because stock-info did not provide a verified code. This is an assumption, not a listing fact.",
      supports: context.reference.underlyingSymbol.evidence === "ASSUMPTION" ? [] : undefined,
      caveats: [
        context.reference.note,
        "A linked ticker symbol is not a live underlying price.",
      ],
    }),
  );

  items.push(
    unknownItem({
      id: EVIDENCE_IDS.referencePrice,
      topic: "reference",
      question: `What is the live US-listed underlying price for ${String(context.reference.underlyingSymbol.value ?? token)}?`,
      reasoning:
        "Bitget does not provide a live US tape or any other verified reference price. Company overview figures are not used as a substitute.",
      status: "unverified",
      sources: [
        {
          provider: "bitget",
          field: "referencePrice",
          retrievedAt: context.retrievedAt,
          freshnessStatus: "unverified",
        },
      ],
      caveats: [
        "No NYSE/NASDAQ print is attached.",
        "Company 52-week high/low is historical metadata, not a current reference.",
      ],
    }),
  );

  items.push(
    unknownItem({
      id: EVIDENCE_IDS.referenceDivergence,
      topic: "reference",
      question: `How far is the ${token} last price from a verified underlying reference?`,
      reasoning:
        "Divergence requires a token last price and a verified reference price. The reference side is unavailable, so divergence is not calculated and is not guessed.",
      status: "unverified",
      sources: [
        {
          provider: "bitget",
          field: "divergence",
          retrievedAt: context.retrievedAt,
          freshnessStatus: "unverified",
        },
      ],
      caveats: ["A missing reference is left UNKNOWN rather than filled with company metadata or last price."],
    }),
  );

  items.push(
    itemFromField({
      id: EVIDENCE_IDS.referenceCompanyRange,
      topic: "reference",
      field: context.reference.companyHigh52Week,
      sourceField: "company-overview.high52Week",
      presentClaim: `Bitget company-overview 52-week high/low for ${String(context.reference.underlyingSymbol.value ?? token)} is ${String(context.reference.companyHigh52Week.value)} / ${String(context.reference.companyLow52Week.value)}.`,
      absentQuestion: "Did Bitget return company-overview 52-week metadata?",
      reasoning:
        "Observed Bitget company metadata only. It is not a live quote and is not used as referencePrice or divergence.",
      caveats: ["Do not treat 52-week high/low as the current underlying market."],
    }),
  );

  items.push(
    itemFromField({
      id: EVIDENCE_IDS.depthPublicUta,
      topic: "depth",
      field: context.depth.publicUtaBook,
      sourceField: "market.orderbook",
      presentClaim:
        context.depth.publicUtaBook.value
          ? `Public UTA order book for ${token} returned ${context.depth.publicUtaBook.value.bidCount} bids and ${context.depth.publicUtaBook.value.askCount} asks.`
          : `A public UTA order book was returned for ${token}.`,
      absentQuestion: `What public UTA book snapshot is available for ${token}?`,
      reasoning: "Optional public UTA SPOT book. This is not the whitelist Reality 40-level book.",
      caveats: [context.depth.note],
    }),
  );

  items.push(
    itemFromField({
      id: EVIDENCE_IDS.depthReality,
      topic: "depth",
      field: context.depth.realityBook,
      sourceField: "account.reality-orderbook",
      presentClaim:
        context.depth.realityBook.value
          ? `Reality-specific book returned ${context.depth.realityBook.value.bidCount} bids and ${context.depth.realityBook.value.askCount} asks.`
          : `A Reality-specific book was returned for ${token}.`,
      absentQuestion: `What is the whitelist Reality 40-level book for ${token}?`,
      reasoning:
        "Reality-specific depth requires API credentials and UID whitelist access. The public UTA book is not substituted for it.",
      caveats: ["Unauthorized or missing Reality depth stays UNKNOWN or unverified rather than fabricated."],
    }),
  );

  items.push(
    unknownItem({
      id: EVIDENCE_IDS.liquidityModel,
      topic: "liquidity",
      question: `What executable liquidity, slippage, or depth model applies to ${token}?`,
      reasoning:
        "Ticker sizes and optional public UTA book counts are not a liquidity, impact, or fill-probability model. None is computed.",
      caveats: ["Do not read bid1Size/ask1Size as book depth or available size to trade."],
    }),
  );

  items.push(
    unknownItem({
      id: EVIDENCE_IDS.newsContext,
      topic: "news",
      question: `Is there news, filings, or social context for ${token}?`,
      reasoning:
        "This pack only consumes Bitget market context. No news, filings, or social feed is attached, and none is invented.",
      caveats: ["Price movement is not used as a proxy for news."],
    }),
  );

  for (const failure of context.failures) {
    items.push(
      unknownItem({
        id: `data.failure.${failure.resource}`,
        topic: "data-quality",
        question: `What Bitget ${failure.resource} data is available for ${token}?`,
        reasoning: `The ${failure.resource} request failed${failure.code ? ` (${failure.code})` : ""}: ${failure.message}. The pack keeps this as UNKNOWN instead of substituting a fabricated value.`,
        status: "error",
        caveats: ["Other evidence items may still be present. A partial pack is not a complete market picture."],
      }),
    );
  }

  const staleItems = items.filter((item) => item.status === "stale");
  if (staleItems.length > 0) {
    items.push({
      id: "data.stale",
      topic: "data-quality",
      claim: `${staleItems.length} evidence item(s) use Bitget data older than the freshness window: ${staleItems.map((item) => item.id).join(", ")}.`,
      classification: "FACT",
      status: "stale",
      value: staleItems.length,
      sources: staleItems.flatMap((item) => item.sources),
      supports: [],
      reasoning: "Stale is a freshness classification of already-observed Bitget data. Values are not replaced.",
      caveats: ["Stale facts remain facts about an older timestamp; they are not updated with guessed prints."],
      confidence: confidenceFor("FACT", "stale"),
    });
  }

  const unknowns = items.filter((item) => item.classification === "UNKNOWN").map((item) => item.claim);

  return {
    milestone: "3-investigation-evidence-pack",
    investigation: {
      question: options.question ?? defaultInvestigationQuestion(token),
      requestedSymbol: context.requestedSymbol,
      pair: context.pair,
      tokenSymbol: token,
      retrievedAt: context.retrievedAt,
    },
    items,
    summary: summarize(items),
    unknowns,
    limitations: [...EVIDENCE_PACK_LIMITATIONS, ...context.limitations],
    failures: context.failures,
  };
}
