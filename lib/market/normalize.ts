import { REALITY_CANDLE_INTERVALS } from "@/lib/bitget/types";
import { parseOptionalNumber, tokenSymbolFromPair, underlyingFromPair } from "@/lib/bitget/symbols";
import type { Candle } from "@/lib/bitget/types";
import { derivedField, observedField, summarizeCoverage, unavailableField } from "./fields";
import { CANDLE_INTERVAL_MS, TICKER_STALE_AFTER_SECONDS } from "./freshness";
import { calculateSpread } from "./spread";
import {
  MARKET_CONTEXT_LIMITATIONS,
  type MarketContext,
  type MarketRawInput,
  type PublicBookSummary,
} from "./types";
import type { FieldMeta } from "./fields";

const TICKER_PATH = "/api/v3/market/tickers";
const CANDLES_PATH = "/api/v3/market/candles";
const STATES_PATH = "/api/v3/reality/market/states";
const CALENDAR_PATH = "/api/v3/reality/market/calendar";
const STOCK_PATH = "/api/v3/reality/market/stock-info";
const COMPANY_PATH = "/api/v3/reality/market/company-overview";
const INSTRUMENTS_PATH = "/api/v3/market/instruments";
const PUBLIC_BOOK_PATH = "/api/v3/market/orderbook";
const REALITY_BOOK_PATH = "/api/v3/account/reality-orderbook";

const SESSION_FORMULA =
  "Match Bitget calendar holiday/weekend, then match New York clock to Bitget state windows (pre_market, regular, after_hours, overnight).";
const SPREAD_FORMULA = "spread = ask - bid";
const SPREAD_BPS_FORMULA = "spreadBps = (ask - bid) / mid × 10,000 (mid falls back to last price if mid is 0)";
const MID_FORMULA = "mid = (bid + ask) / 2";
const UNDERLYING_CONVENTION_FORMULA = "underlying = token symbol without the leading 'r' (rAAPL → AAPL)";
const TOKEN_WINDOW_FORMULA = "tokenWindowMatch = stock-info.tradingPeriod includes the derived Bitget state";

const REFERENCE_NOTE =
  "Bitget does not provide a live US-listed underlying tape. Company overview figures are historical metadata and are not used as a verified reference price.";

const DEPTH_NOTE =
  "Public UTA book depth is optional market-structure context only. It is not Reality 40-level depth. Reality-specific depth requires a whitelisted API key.";

function tickerMeta(raw: MarketRawInput, extra: FieldMeta = {}): FieldMeta {
  return {
    source: "bitget",
    endpoint: raw.tickerEndpoint ?? TICKER_PATH,
    observedAt: raw.ticker?.sourceTimestamp,
    observedAtMs: raw.ticker?.sourceTimestampMs,
    retrievedAt: raw.retrievedAt.toISOString(),
    retrievedAtDate: raw.retrievedAt,
    staleAfterSeconds: TICKER_STALE_AFTER_SECONDS,
    error: raw.tickerError,
    ...extra,
  };
}

function latestCandle(candles: Candle[]): Candle | undefined {
  if (candles.length === 0) {
    return undefined;
  }
  return candles.reduce((best, candle) => (candle.timestampMs > best.timestampMs ? candle : best), candles[0]);
}

function candleStaleAfterSeconds(interval: string | undefined): number | undefined {
  if (!interval) {
    return undefined;
  }
  const intervalMs = CANDLE_INTERVAL_MS[interval];
  return intervalMs ? (intervalMs * 2) / 1000 : undefined;
}

export function normalizeMarketContext(raw: MarketRawInput): MarketContext {
  const retrievedAt = raw.retrievedAt.toISOString();
  const pair = raw.pair;
  const tokenSymbol = raw.instrument?.tokenSymbol ?? tokenSymbolFromPair(pair);
  const quote = raw.instrument?.quoteCoin ?? "USDT";

  const instrumentPair = observedField(raw.instrument?.symbol, {
    source: "bitget",
    endpoint: INSTRUMENTS_PATH,
    retrievedAt,
    retrievedAtDate: raw.retrievedAt,
    error: raw.instrumentError,
    note: raw.instrument ? "Bitget SPOT instrument symbol with isReality=yes." : undefined,
  });
  const instrumentToken = observedField(raw.instrument?.baseCoin, {
    source: "bitget",
    endpoint: INSTRUMENTS_PATH,
    retrievedAt,
    retrievedAtDate: raw.retrievedAt,
    error: raw.instrumentError,
    note: "Bitget baseCoin for the Reality pair.",
  });
  const instrumentStatus = observedField(raw.instrument?.status, {
    source: "bitget",
    endpoint: INSTRUMENTS_PATH,
    retrievedAt,
    retrievedAtDate: raw.retrievedAt,
    error: raw.instrumentError,
  });
  const isReality = observedField(raw.instrument?.isReality, {
    source: "bitget",
    endpoint: INSTRUMENTS_PATH,
    retrievedAt,
    retrievedAtDate: raw.retrievedAt,
    error: raw.instrumentError,
  });
  const quoteCoin = observedField(raw.instrument?.quoteCoin, {
    source: "bitget",
    endpoint: INSTRUMENTS_PATH,
    retrievedAt,
    retrievedAtDate: raw.retrievedAt,
    error: raw.instrumentError,
  });

  const last = observedField(raw.ticker?.lastPriceNumber, {
    ...tickerMeta(raw, { unit: quote }),
    note: raw.ticker ? "Bitget ticker lastPrice." : undefined,
  });
  const sourceTimestamp = observedField(raw.ticker?.sourceTimestamp, tickerMeta(raw));
  const change24hPercent = observedField(raw.ticker?.change24hPercentNumber, {
    ...tickerMeta(raw, { unit: "fraction" }),
    note: raw.ticker
      ? "Bitget price24hPcnt is a decimal fraction, not already a percent. Display as fraction × 100."
      : undefined,
  });
  const volume24h = observedField(raw.ticker?.volume24h, tickerMeta(raw));
  const turnover24h = observedField(raw.ticker?.turnover24h, tickerMeta(raw));
  const high24h = observedField(raw.ticker?.highPrice24h, tickerMeta(raw, { unit: quote }));
  const low24h = observedField(raw.ticker?.lowPrice24h, tickerMeta(raw, { unit: quote }));
  const open24h = observedField(raw.ticker?.openPrice24h, tickerMeta(raw, { unit: quote }));

  const bid = parseOptionalNumber(raw.ticker?.bid);
  const ask = parseOptionalNumber(raw.ticker?.ask);
  const bidField = observedField(bid, tickerMeta(raw, { unit: quote, note: "Ticker bid1Price. This is not book depth." }));
  const askField = observedField(ask, tickerMeta(raw, { unit: quote, note: "Ticker ask1Price. This is not book depth." }));
  const bidSize = observedField(raw.ticker?.bidSize, tickerMeta(raw, { note: "Ticker bid1Size. This is not book depth." }));
  const askSize = observedField(raw.ticker?.askSize, tickerMeta(raw, { note: "Ticker ask1Size. This is not book depth." }));

  const spreadResult = raw.tickerError
    ? null
    : calculateSpread(bid, ask, raw.ticker?.lastPriceNumber);
  const inverted =
    bid !== undefined && ask !== undefined && Number.isFinite(bid) && Number.isFinite(ask) && ask < bid;
  const spreadNote = raw.tickerError
    ? "Spread was not calculated because the ticker request failed."
    : inverted
      ? `${spreadResult?.formula ?? SPREAD_FORMULA}. Ask was below bid in the Bitget ticker; the signed spread is reported as derived, not repaired.`
      : spreadResult?.reason ?? spreadResult?.formula;

  const spread = derivedField(spreadResult?.spread ?? null, {
    ...tickerMeta(raw, {
      unit: quote,
      note: spreadNote,
      error: raw.tickerError,
    }),
    formula: spreadResult?.formula ?? SPREAD_FORMULA,
  });
  const spreadBps = derivedField(spreadResult?.spreadBps ?? null, {
    ...tickerMeta(raw, {
      unit: "bps",
      note: spreadResult?.reason ?? spreadResult?.formula,
      error: raw.tickerError,
    }),
    formula: SPREAD_BPS_FORMULA,
  });
  const mid = derivedField(spreadResult?.mid ?? null, {
    ...tickerMeta(raw, {
      unit: quote,
      note: spreadResult?.reason ?? spreadResult?.formula,
      error: raw.tickerError,
    }),
    formula: MID_FORMULA,
  });

  const interval = raw.candleInterval ?? "1H";
  const staleAfterSeconds = candleStaleAfterSeconds(interval);
  const candles = raw.candles ?? null;
  const latest = candles ? latestCandle(candles) : undefined;
  const candleMeta: FieldMeta = {
    source: "bitget",
    endpoint: raw.candlesEndpoint ?? CANDLES_PATH,
    retrievedAt,
    retrievedAtDate: raw.retrievedAt,
    observedAt: latest?.timestamp,
    observedAtMs: latest?.timestampMs,
    staleAfterSeconds,
    error: raw.candlesError,
  };
  const candleSeries = observedField(candles && candles.length > 0 ? candles : null, {
    ...candleMeta,
    note: candles && candles.length > 0
      ? `rToken candles requested as type=market, interval=${interval}. Supported intervals are documented by Bitget as ${REALITY_CANDLE_INTERVALS.join(", ")}.`
      : raw.candlesError
        ? undefined
        : "Bitget returned no candles for this request.",
  });
  const candleCount = derivedField(candles ? candles.length : null, {
    ...candleMeta,
    formula: "count = number of candles Bitget returned",
    error: raw.candlesError,
    note: candles ? undefined : "Candle count is unavailable because the candle request failed or returned nothing.",
  });
  const latestClose = observedField(latest?.close, {
    ...candleMeta,
    unit: quote,
    note: latest ? "Close of the newest returned candle, selected by timestampMs." : undefined,
  });
  const latestTimestamp = observedField(latest?.timestamp, candleMeta);

  const sessionMeta: FieldMeta = {
    source: "bitget",
    endpoint: STATES_PATH,
    retrievedAt,
    retrievedAtDate: raw.retrievedAt,
    observedAt: raw.session?.evaluatedAt,
    error: raw.sessionError,
  };
  const marketSession = derivedField(raw.session?.marketSession ?? null, {
    ...sessionMeta,
    formula: SESSION_FORMULA,
    note: raw.session?.derivation.join(" "),
  });
  const bitgetState = observedField(raw.session ? raw.session.bitgetState : undefined, {
    ...sessionMeta,
    allowNull: true,
    note: raw.session?.bitgetState
      ? "Bitget state taken from the window that matches the current New York clock."
      : raw.sessionError
        ? undefined
        : "No Bitget state window matched the current New York clock.",
  });
  const underlyingUsEquity = derivedField(raw.session?.underlyingUsEquity ?? null, {
    ...sessionMeta,
    formula: "Map Bitget state: regular→regular, pre_market/after_hours→extended, overnight/weekend/holiday→closed",
    note: "This is the implied US equity session, not a Bitget live-tape status feed.",
  });
  const windows = observedField(raw.states?.windows, {
    source: "bitget",
    endpoint: STATES_PATH,
    retrievedAt,
    retrievedAtDate: raw.retrievedAt,
    error: raw.sessionError,
    note: "Schedule windows from GET /api/v3/reality/market/states. These are not a current-session flag.",
  });
  const weekend = derivedField(raw.session ? raw.session.weekend : null, {
    ...sessionMeta,
    endpoint: CALENDAR_PATH,
    formula: "weekend = Bitget calendar regularConfig includes today's America/New_York weekday",
  });
  const holiday = observedField(raw.session ? (raw.session.holiday ?? null) : undefined, {
    ...sessionMeta,
    endpoint: CALENDAR_PATH,
    allowNull: true,
    note: raw.session?.holiday
      ? "Current time falls inside a Bitget calendar specificConfig window."
      : raw.session
        ? "No Bitget holiday window matched the current time."
        : undefined,
  });
  const timeZone = observedField(raw.session?.timeZone ?? raw.calendar?.timeZone ?? raw.states?.windows[0]?.timeZone, {
    ...sessionMeta,
    note: "Bitget-provided timezone label. Derivation still uses America/New_York civil time.",
  });
  const daylightType = observedField(raw.states?.daylightType, {
    ...sessionMeta,
    note: "Bitget daylightType as returned. Observed payloads have used 'standard' even in September.",
  });
  const tokenTradingPeriod = observedField(raw.stock?.tradingPeriod, {
    source: "bitget",
    endpoint: STOCK_PATH,
    retrievedAt,
    retrievedAtDate: raw.retrievedAt,
    error: raw.stockError,
    note: "Bitget stock-info tradingPeriod list for this rToken.",
  });
  const weekendTradable = observedField(
    raw.stock ? raw.stock.weekendTradable : null,
    {
      source: "bitget",
      endpoint: STOCK_PATH,
      retrievedAt,
      retrievedAtDate: raw.retrievedAt,
      error: raw.stockError,
    },
  );
  const tokenWindowMatch = derivedField(
    raw.stock && raw.session?.bitgetState
      ? raw.stock.tradingPeriod.includes(raw.session.bitgetState)
      : null,
    {
      source: "bitget",
      endpoint: STOCK_PATH,
      retrievedAt,
      retrievedAtDate: raw.retrievedAt,
      formula: TOKEN_WINDOW_FORMULA,
      error: raw.stockError ?? raw.sessionError,
      note:
        raw.stock && raw.session?.bitgetState
          ? "True when Bitget stock-info lists the current state as a tradable window for this rToken. This is not an order-routing signal."
          : "Need both stock-info tradingPeriod and a matched Bitget state to derive tokenWindowMatch.",
    },
  );

  const stockUnderlying = raw.stock?.underlyingCode;
  const conventionUnderlying = underlyingFromPair(pair);
  const underlyingSymbol = stockUnderlying
    ? observedField(stockUnderlying, {
        source: "bitget",
        endpoint: STOCK_PATH,
        retrievedAt,
        retrievedAtDate: raw.retrievedAt,
        note: "Bitget Reality stock-info `code` field.",
      })
    : derivedField(conventionUnderlying, {
        source: "bitget",
        endpoint: STOCK_PATH,
        retrievedAt,
        retrievedAtDate: raw.retrievedAt,
        formula: UNDERLYING_CONVENTION_FORMULA,
        assumption: true,
        error: raw.stockError,
        note: raw.stockError
          ? "stock-info failed. This underlying code is a symbol-convention assumption, not a Bitget-verified listing."
          : "stock-info did not include code. This underlying code is derived from the pair name (rAAPL → AAPL) and is not a verified exchange listing.",
      });
  const underlyingName = observedField(raw.stock?.name ?? raw.company?.name, {
    source: "bitget",
    endpoint: raw.stock?.name ? STOCK_PATH : COMPANY_PATH,
    retrievedAt,
    retrievedAtDate: raw.retrievedAt,
    error: raw.stockError ?? raw.companyError ?? undefined,
    note: raw.stock?.name
      ? "Bitget stock-info name."
      : raw.company?.name
        ? "Bitget company-overview name. This is metadata, not a live tape identifier."
        : undefined,
  });
  const tokenPrice = observedField(raw.ticker?.lastPriceNumber, {
    ...tickerMeta(raw, { unit: quote }),
    note: "Same observation as ticker lastPrice. This is the rToken price on Bitget, not a US tape print.",
  });
  const referencePrice = unavailableField<number>(
    "Bitget does not provide a live US-listed underlying tape or any other verified reference price.",
    { retrievedAt, status: "unverified" },
  );
  const referenceTimestamp = unavailableField<string>(
    "No verified reference-price timestamp exists because no US tape is available from Bitget.",
    { retrievedAt, status: "unverified" },
  );
  const divergence = unavailableField<number>(
    "Divergence needs a token last price and a verified reference price. The reference side is unavailable, so divergence is not calculated.",
    { retrievedAt, status: "unverified", formula: "divergence is not computed without a verified reference price" },
  );
  const companyHigh52Week = observedField(raw.company?.high52Week, {
    source: "bitget",
    endpoint: COMPANY_PATH,
    retrievedAt,
    retrievedAtDate: raw.retrievedAt,
    unit: quote,
    error: raw.companyError ?? undefined,
    note: "Bitget company-overview high52Week. Historical metadata, not a live underlying quote, and not used as referencePrice.",
  });
  const companyLow52Week = observedField(raw.company?.low52Week, {
    source: "bitget",
    endpoint: COMPANY_PATH,
    retrievedAt,
    retrievedAtDate: raw.retrievedAt,
    unit: quote,
    error: raw.companyError ?? undefined,
    note: "Bitget company-overview low52Week. Historical metadata, not a live underlying quote, and not used as referencePrice.",
  });

  const publicBook = raw.publicOrderBook;
  const publicSummary: PublicBookSummary | null =
    publicBook?.availability === "available" && publicBook.book
      ? {
          bidCount: publicBook.book.bids.length,
          askCount: publicBook.book.asks.length,
          sourceTimestamp: publicBook.book.sourceTimestamp,
          source: publicBook.book.source,
        }
      : null;
  const publicUtaBook = publicSummary
    ? observedField(publicSummary, {
        source: "bitget",
        endpoint: PUBLIC_BOOK_PATH,
        retrievedAt,
        retrievedAtDate: raw.retrievedAt,
        observedAt: publicSummary.sourceTimestamp,
        note:
          publicBook?.book?.note ??
          "Public UTA SPOT order book. This is not the whitelist Reality 40-level book.",
      })
    : unavailableField<PublicBookSummary>(
        publicBook?.reason ?? "Public UTA order book was not retrieved.",
        {
          retrievedAt,
          endpoint: PUBLIC_BOOK_PATH,
          status: publicBook?.availability === "error" ? "error" : "missing",
        },
      );

  const realityBookResult = raw.realityOrderBook;
  const realitySummary: PublicBookSummary | null =
    realityBookResult?.availability === "available" && realityBookResult.book
      ? {
          bidCount: realityBookResult.book.bids.length,
          askCount: realityBookResult.book.asks.length,
          sourceTimestamp: realityBookResult.book.sourceTimestamp,
          source: realityBookResult.book.source,
        }
      : null;
  const realityBook = realitySummary
    ? observedField(realitySummary, {
        source: "bitget",
        endpoint: REALITY_BOOK_PATH,
        retrievedAt,
        retrievedAtDate: raw.retrievedAt,
        observedAt: realitySummary.sourceTimestamp,
        note: "Reality-specific depth. Official docs cap this at 40 levels and require whitelist access.",
      })
    : unavailableField<PublicBookSummary>(
        realityBookResult?.reason ??
          "Reality-specific order book was not retrieved. Official docs require API key authentication and UID whitelist access.",
        {
          retrievedAt,
          endpoint: REALITY_BOOK_PATH,
          status:
            realityBookResult?.availability === "error"
              ? "error"
              : realityBookResult?.availability === "unauthorized"
                ? "unverified"
                : "missing",
        },
      );

  const limitations = [
    ...(raw.isDemoFixture
      ? [
          `DEMO / FIXTURE DATA: This snapshot contains deterministic fixture data for demonstration and testing (${raw.fixtureLabel ?? raw.fixtureId ?? "fixture"}). It was not retrieved from live Bitget APIs.`,
        ]
      : []),
    ...MARKET_CONTEXT_LIMITATIONS,
    ...raw.failures.map((failure) => `${failure.resource} failed: ${failure.message}`),
  ];

  const context: MarketContext = {
    milestone: "2-market-context",
    requestedSymbol: raw.requestedSymbol,
    pair,
    tokenSymbol,
    retrievedAt,
    isDemoFixture: raw.isDemoFixture,
    fixtureId: raw.fixtureId,
    fixtureLabel: raw.fixtureLabel,
    instrument: {
      pair: instrumentPair,
      tokenSymbol: instrumentToken,
      status: instrumentStatus,
      isReality,
      quoteCoin,
    },
    price: {
      last,
      sourceTimestamp,
      change24hPercent,
      volume24h,
      turnover24h,
      high24h,
      low24h,
      open24h,
    },
    bookTop: {
      bid: bidField,
      bidSize,
      ask: askField,
      askSize,
      spread,
      spreadBps,
      mid,
    },
    candles: {
      interval,
      supportedIntervals: REALITY_CANDLE_INTERVALS,
      count: candleCount,
      latestClose,
      latestTimestamp,
      series: candleSeries,
    },
    session: {
      marketSession,
      bitgetState,
      underlyingUsEquity,
      windows,
      weekend,
      holiday,
      timeZone,
      daylightType,
      tokenTradingPeriod,
      weekendTradable,
      tokenWindowMatch,
      derivation: raw.session?.derivation ?? [],
    },
    reference: {
      underlyingSymbol,
      underlyingName,
      tokenPrice,
      referencePrice,
      referenceTimestamp,
      divergence,
      companyHigh52Week,
      companyLow52Week,
      note: REFERENCE_NOTE,
    },
    depth: {
      publicUtaBook,
      realityBook,
      note: DEPTH_NOTE,
    },
    failures: raw.failures,
    limitations,
    coverage: {
      observed: 0,
      derived: 0,
      unavailable: 0,
      ok: 0,
      stale: 0,
      missing: 0,
      error: 0,
      unverified: 0,
      unknown: 0,
    },
  };

  context.coverage = summarizeCoverage(context);
  return context;
}
