import { getRealityInstrument } from "@/lib/bitget/assets";
import { discoverRealityInstruments } from "@/lib/bitget/assets";
import { getTicker } from "@/lib/bitget/market";
import { getCandles } from "@/lib/bitget/history";
import {
  getCompanyOverview,
  getSessionSnapshot,
  getStockInfoForSymbol,
} from "@/lib/bitget/session";
import {
  getOptionalPublicOrderBook,
  getOptionalRealityOrderBook,
} from "@/lib/bitget/orderbook";
import { getBitgetClient } from "@/lib/bitget/client";
import { isBitgetError } from "@/lib/bitget/errors";
import { normalizeRTokenSymbol } from "@/lib/bitget/symbols";
import { REALITY_CANDLE_INTERVALS } from "@/lib/bitget/types";
import { getMarketSnapshot } from "@/lib/market/context";
import { buildEvidencePack } from "@/lib/evidence/pack";
import { buildInvestigationBrief } from "@/lib/brief/generate";
import { TENSION_IDS } from "@/lib/brief/types";
import { buildInterpretationChallenge } from "@/lib/challenge/engine";

export interface VerificationCheck {
  id: string;
  title: string;
  endpoint: string;
  access: "public" | "optional-auth";
  status: "pass" | "fail" | "skipped";
  detail: string;
  sample?: unknown;
}

function failureDetail(error: unknown): string {
  if (isBitgetError(error)) {
    return `${error.code}: ${error.message}`;
  }
  return error instanceof Error ? error.message : "Unknown error";
}

export async function runBitgetVerification(symbolInput = "rAAPL") {
  const startedAt = new Date().toISOString();
  const client = getBitgetClient();
  const symbol = normalizeRTokenSymbol(symbolInput);
  const checks: VerificationCheck[] = [];

  const discovery = await (async () => {
    try {
      const result = await discoverRealityInstruments(client, { status: "online" });
      const featured = result.instruments.filter((item) =>
        ["RAAPLUSDT", "RNVDAUSDT", "RTSLAUSDT", "RCOINUSDT", "RMSFTUSDT"].includes(item.symbol),
      );
      checks.push({
        id: "discover",
        title: "Discover Reality rToken instruments",
        endpoint: "GET /api/v3/market/instruments?category=SPOT plus GET /api/v3/reality/market/stock-info",
        access: "public",
        status: result.total > 0 ? "pass" : "fail",
        detail: `Found ${result.total} Reality instruments with isReality=yes.`,
        sample: {
          total: result.total,
          featured: featured.map((item) => ({
            symbol: item.symbol,
            tokenSymbol: item.tokenSymbol,
            underlyingSymbol: item.underlyingSymbol,
            status: item.status,
            weekendTradable: item.weekendTradable,
          })),
          sample: result.instruments.slice(0, 8).map((item) => item.symbol),
        },
      });
      return result;
    } catch (error) {
      checks.push({
        id: "discover",
        title: "Discover Reality rToken instruments",
        endpoint: "GET /api/v3/market/instruments?category=SPOT",
        access: "public",
        status: "fail",
        detail: failureDetail(error),
      });
      return null;
    }
  })();

  try {
    const instrument = await getRealityInstrument(symbol, client);
    checks.push({
      id: "instrument",
      title: "Resolve a single rToken instrument",
      endpoint: `GET /api/v3/market/instruments?category=SPOT&symbol=${symbol}`,
      access: "public",
      status: instrument.instrument.isReality ? "pass" : "fail",
      detail: `${instrument.instrument.tokenSymbol} maps to ${instrument.instrument.symbol}. isReality=${instrument.instrument.isReality}, status=${instrument.instrument.status}.`,
      sample: {
        symbol: instrument.instrument.symbol,
        tokenSymbol: instrument.instrument.tokenSymbol,
        underlyingSymbol: instrument.instrument.underlyingSymbol,
        isReality: instrument.instrument.isReality,
        status: instrument.instrument.status,
        tradingPeriod: instrument.instrument.tradingPeriod,
        weekendTradable: instrument.instrument.weekendTradable,
      },
    });
  } catch (error) {
    checks.push({
      id: "instrument",
      title: "Resolve a single rToken instrument",
      endpoint: `GET /api/v3/market/instruments?category=SPOT&symbol=${symbol}`,
      access: "public",
      status: "fail",
      detail: failureDetail(error),
    });
  }

  try {
    const tickerResult = await getTicker(symbol, client);
    const ticker = tickerResult.ticker;
    checks.push({
      id: "ticker",
      title: "Retrieve ticker (price, 24h change, bid/ask, volume, timestamp)",
      endpoint: `GET /api/v3/market/tickers?category=SPOT&symbol=${symbol}`,
      access: "public",
      status: "pass",
      detail: `lastPrice=${ticker.lastPrice}, change24h=${ticker.change24hPercent}, bid=${ticker.bid}, ask=${ticker.ask}, volume24h=${ticker.volume24h}, ts=${ticker.sourceTimestamp ?? "not provided"}.`,
      sample: ticker,
    });
  } catch (error) {
    checks.push({
      id: "ticker",
      title: "Retrieve ticker (price, 24h change, bid/ask, volume, timestamp)",
      endpoint: `GET /api/v3/market/tickers?category=SPOT&symbol=${symbol}`,
      access: "public",
      status: "fail",
      detail: failureDetail(error),
    });
  }

  try {
    const candles = await getCandles({ symbol, interval: "1H", limit: 5 }, client);
    const emptyVolume = candles.candles.filter((candle) => candle.volume === null).length;
    checks.push({
      id: "candles",
      title: "Retrieve rToken candles on a supported interval",
      endpoint: `GET /api/v3/market/candles?category=SPOT&symbol=${symbol}&interval=1H&type=market`,
      access: "public",
      status: candles.candles.length > 0 ? "pass" : "fail",
      detail: `Returned ${candles.candles.length} 1H market candles. Supported rToken intervals: ${REALITY_CANDLE_INTERVALS.join(", ")}. Empty volume fields: ${emptyVolume}.`,
      sample: candles.candles.slice(-3),
    });
  } catch (error) {
    checks.push({
      id: "candles",
      title: "Retrieve rToken candles on a supported interval",
      endpoint: `GET /api/v3/market/candles?category=SPOT&symbol=${symbol}&interval=1H&type=market`,
      access: "public",
      status: "fail",
      detail: failureDetail(error),
    });
  }

  try {
    await getCandles({ symbol, interval: "3m", limit: 1 }, client);
    checks.push({
      id: "candles-unsupported",
      title: "Reject unsupported rToken candle intervals",
      endpoint: `GET /api/v3/market/candles?category=SPOT&symbol=${symbol}&interval=3m`,
      access: "public",
      status: "fail",
      detail: "Bitget accepted interval=3m for an rToken. Official docs say only 1m, 5m, 15m, 1H, 4H, 1D are supported.",
    });
  } catch (error) {
    checks.push({
      id: "candles-unsupported",
      title: "Reject unsupported rToken candle intervals",
      endpoint: `GET /api/v3/market/candles?category=SPOT&symbol=${symbol}&interval=3m`,
      access: "public",
      status: "pass",
      detail: `Unsupported interval correctly failed: ${failureDetail(error)}`,
    });
  }

  try {
    const session = await getSessionSnapshot(client);
    checks.push({
      id: "session",
      title: "Retrieve US session schedule and calendar",
      endpoint: "GET /api/v3/reality/market/states and GET /api/v3/reality/market/calendar",
      access: "public",
      status: "pass",
      detail: `Derived marketSession=${session.session.marketSession}, bitgetState=${session.session.bitgetState}, underlyingUsEquity=${session.session.underlyingUsEquity}.`,
      sample: {
        session: session.session,
        windows: session.states.windows,
        weekendDays: session.calendar.weekendDays,
        holidays: session.calendar.holidays,
      },
    });
  } catch (error) {
    checks.push({
      id: "session",
      title: "Retrieve US session schedule and calendar",
      endpoint: "GET /api/v3/reality/market/states and GET /api/v3/reality/market/calendar",
      access: "public",
      status: "fail",
      detail: failureDetail(error),
    });
  }

  try {
    const stock = await getStockInfoForSymbol(symbol, client);
    checks.push({
      id: "stock-info",
      title: "Retrieve Reality stock/session metadata",
      endpoint: `GET /api/v3/reality/market/stock-info?symbol=${symbol}`,
      access: "public",
      status: stock.stock ? "pass" : "fail",
      detail: stock.stock
        ? `${stock.stock.symbol} underlying=${stock.stock.underlyingCode}, weekendTradable=${stock.stock.weekendTradable}, tradingPeriod=${stock.stock.tradingPeriod.join(",")}.`
        : "No stock-info row was returned for this symbol.",
      sample: stock.stock,
    });
  } catch (error) {
    checks.push({
      id: "stock-info",
      title: "Retrieve Reality stock/session metadata",
      endpoint: `GET /api/v3/reality/market/stock-info?symbol=${symbol}`,
      access: "public",
      status: "fail",
      detail: failureDetail(error),
    });
  }

  try {
    const stock = await getStockInfoForSymbol(symbol, client);
    const code = stock.stock?.underlyingCode;
    if (!code) {
      checks.push({
        id: "company",
        title: "Retrieve company overview for the underlying stock",
        endpoint: "GET /api/v3/reality/market/company-overview",
        access: "public",
        status: "skipped",
        detail: "Skipped because stock-info did not provide an underlying code.",
      });
    } else {
      const company = await getCompanyOverview(code, client);
      checks.push({
        id: "company",
        title: "Retrieve company overview for the underlying stock",
        endpoint: `GET /api/v3/reality/market/company-overview?code=${code}`,
        access: "public",
        status: "pass",
        detail: `${company.company.name} (${company.company.code}). This is Bitget-provided company metadata, not a live US tape price.`,
        sample: company.company,
      });
    }
  } catch (error) {
    checks.push({
      id: "company",
      title: "Retrieve company overview for the underlying stock",
      endpoint: "GET /api/v3/reality/market/company-overview",
      access: "public",
      status: "fail",
      detail: failureDetail(error),
    });
  }

  const publicBook = await getOptionalPublicOrderBook(symbol, client);
  checks.push({
    id: "public-orderbook",
    title: "Public UTA order book (not the whitelist Reality book)",
    endpoint: `GET /api/v3/market/orderbook?category=SPOT&symbol=${symbol}`,
    access: "public",
    status: publicBook.availability === "available" ? "pass" : "fail",
    detail:
      publicBook.availability === "available"
        ? `Returned ${publicBook.book?.bids.length ?? 0} bids and ${publicBook.book?.asks.length ?? 0} asks. This is not claimed as Reality 40-level depth.`
        : publicBook.reason ?? "Public order book unavailable.",
    sample: publicBook.book
      ? { bids: publicBook.book.bids.slice(0, 3), asks: publicBook.book.asks.slice(0, 3), ts: publicBook.book.sourceTimestamp }
      : null,
  });

  const realityBook = await getOptionalRealityOrderBook(symbol, client);
  checks.push({
    id: "reality-orderbook",
    title: "Reality-specific order book (optional, whitelist)",
    endpoint: `GET /api/v3/account/reality-orderbook?symbol=${symbol}`,
    access: "optional-auth",
    status: realityBook.availability === "available" ? "pass" : "skipped",
    detail:
      realityBook.availability === "available"
        ? `Returned Reality depth: ${realityBook.book?.bids.length ?? 0} bids / ${realityBook.book?.asks.length ?? 0} asks.`
        : realityBook.reason ??
          "Not verified. Official docs require API key authentication and UID whitelist access.",
    sample: realityBook.book
      ? { bids: realityBook.book.bids.slice(0, 3), asks: realityBook.book.asks.slice(0, 3) }
      : null,
  });

  try {
    const snapshot = await getMarketSnapshot(symbol);
    const ctx = snapshot.context;
    const referenceHonest =
      ctx.reference.referencePrice.kind === "unavailable" &&
      ctx.reference.divergence.kind === "unavailable" &&
      ctx.reference.referenceTimestamp.kind === "unavailable";
    const publicBookNote = (ctx.depth.publicUtaBook.note ?? "").toLowerCase();
    const publicBookHonest =
      ctx.depth.publicUtaBook.kind !== "observed" ||
      (publicBookNote.includes("not") && publicBookNote.includes("reality"));
    checks.push({
      id: "market-context",
      title: "Normalize market context (observed / derived / unavailable)",
      endpoint: `composed snapshot → GET /api/market/context/${symbolInput}`,
      access: "public",
      status: referenceHonest && publicBookHonest ? "pass" : "fail",
      detail: referenceHonest
        ? `Coverage: ${ctx.coverage.observed} observed, ${ctx.coverage.derived} derived, ${ctx.coverage.unavailable} unavailable, ${ctx.coverage.stale} stale, ${ctx.coverage.missing} missing, ${ctx.coverage.error} error. last=${ctx.price.last.value ?? "n/a"} (${ctx.price.last.kind}/${ctx.price.last.status}), spread=${ctx.bookTop.spread.value ?? "n/a"} (${ctx.bookTop.spread.kind}), session=${ctx.session.marketSession.value ?? "n/a"} (${ctx.session.marketSession.kind}). referencePrice remains ${ctx.reference.referencePrice.status}. Failures: ${ctx.failures.length}.`
        : "Context claimed a verified reference price or divergence. Bitget does not provide a US tape, so those fields must stay unavailable.",
      sample: {
        coverage: ctx.coverage,
        last: ctx.price.last,
        spread: ctx.bookTop.spread,
        session: ctx.session.marketSession,
        referencePrice: ctx.reference.referencePrice,
        divergence: ctx.reference.divergence,
        limitations: ctx.limitations,
        failures: ctx.failures,
      },
    });

    const pack = buildEvidencePack(ctx);
    const referenceItem = pack.items.find((item) => item.id === "reference.price");
    const divergenceItem = pack.items.find((item) => item.id === "reference.divergence");
    const newsItem = pack.items.find((item) => item.id === "news.context");
    const inferences = pack.items.filter((item) => item.classification === "INFERENCE");
    const assumptionsAsFacts = pack.items.filter(
      (item) => item.classification === "FACT" && /symbol-convention|pair name/i.test(item.reasoning),
    );
    const fabricated = pack.items.filter((item) =>
      /US tape print|NYSE print|NASDAQ print|breaking news|Reality 40-level depth is available/i.test(item.claim),
    );
    const inferencesTraced = inferences.every((item) => item.supports.length > 0 && item.reasoning.length > 0);
    const honest =
      referenceItem?.classification === "UNKNOWN" &&
      divergenceItem?.classification === "UNKNOWN" &&
      newsItem?.classification === "UNKNOWN" &&
      inferencesTraced &&
      assumptionsAsFacts.length === 0 &&
      fabricated.length === 0;
    checks.push({
      id: "evidence-pack",
      title: "Build an investigation evidence pack (FACT / INFERENCE / ASSUMPTION / UNKNOWN)",
      endpoint: `composed context → GET /api/market/evidence/${symbolInput}`,
      access: "public",
      status: honest ? "pass" : "fail",
      detail: honest
        ? `Pack has ${pack.summary.fact} FACT, ${pack.summary.inference} INFERENCE, ${pack.summary.assumption} ASSUMPTION, ${pack.summary.unknown} UNKNOWN. referencePrice and divergence remain UNKNOWN. News is UNKNOWN. Inferences cite supporting items.`
        : "Evidence pack made an unsupported claim (reference price, news, untraced inference, or assumption presented as fact).",
      sample: {
        summary: pack.summary,
        question: pack.investigation.question,
        unknowns: pack.unknowns,
        referencePrice: referenceItem,
        divergence: divergenceItem,
        itemIds: pack.items.map((item) => item.id),
      },
    });

    const brief = buildInvestigationBrief(pack);
    const knownIds = new Set(pack.items.map((item) => item.id));
    const citationsOk = Object.keys(brief.citations).every((id) => knownIds.has(id));
    const tensionsOk = brief.tensions.every((tension) =>
      tension.evidenceIds.every((id) => knownIds.has(id)),
    );
    const factsKeepClaims = brief.observedFacts.paragraphs.every((paragraph) => {
      const item = pack.items.find((entry) => entry.id === paragraph.evidenceIds[0]);
      return item ? paragraph.text.includes(item.claim) : false;
    });
    const namedWithoutTape = brief.tensions.some(
      (tension) => tension.id === TENSION_IDS.namedUnderlyingWithoutTape && tension.severity === "tension",
    );
    const overnightIsContradiction = brief.tensions.some(
      (tension) => tension.id === TENSION_IDS.tokenVsClosedEquity && tension.severity === "contradiction",
    );
    const invented = [brief.executiveSummary, brief.doesNotEstablish, brief.nextQuestions]
      .flat()
      .some((paragraph) =>
        /NYSE print|NASDAQ print|breaking news|buy this|sell this/i.test(paragraph.text),
      );
    const briefHonest =
      brief.advisory === false &&
      citationsOk &&
      tensionsOk &&
      factsKeepClaims &&
      namedWithoutTape &&
      !overnightIsContradiction &&
      !invented;
    checks.push({
      id: "investigation-brief",
      title: "Compose a non-advisory investigation brief",
      endpoint: `composed pack → GET /api/market/brief/${symbolInput}`,
      access: "public",
      status: briefHonest ? "pass" : "fail",
      detail: briefHonest
        ? `Brief has ${brief.observedFacts.paragraphs.length} fact lines, ${brief.derivedInferences.paragraphs.length} inferences, ${brief.unknowns.paragraphs.length} unknowns, ${brief.tensions.length} tensions. Citations resolve to pack IDs. Overnight token/US-close is not labeled a contradiction.`
        : "Brief lost traceability, rewrote facts, invented claims, or mislabeled a tension as a contradiction.",
      sample: {
        question: brief.question,
        tensionIds: brief.tensions.map((tension) => tension.id),
        doesNotEstablish: brief.doesNotEstablish.map((paragraph) => paragraph.id),
        cited: Object.keys(brief.citations),
      },
    });

    const challenge = buildInterpretationChallenge({
      pack,
      brief,
      input: {
        thesis: `${pack.investigation.tokenSymbol} fell because of earnings news and is cheap versus the US stock. Buy it. The moon phase confirms the move.`,
        reason: "The public book is liquid Reality depth.",
        assumptions: ["The last print is current."],
      },
    });
    const challengeKnown = new Set(pack.items.map((entry) => entry.id));
    const challengeIds = [
      ...challenge.assessments.flatMap((entry) => entry.evidenceIds),
      ...challenge.whatAmIMissing.flatMap((entry) => entry.evidenceIds),
      ...challenge.attackMyThesis.flatMap((entry) => entry.evidenceIds),
    ];
    const challengeTraceable = challengeIds.every((id) => challengeKnown.has(id));
    const generated = JSON.stringify({
      assessments: challenge.assessments.map((entry) => ({
        kind: entry.kind,
        status: entry.status,
        reasoning: entry.reasoning,
      })),
      attack: challenge.attackMyThesis.map((entry) => ({ title: entry.title, text: entry.text })),
    });
    const fabricatedChallenge = /NYSE print showed|NASDAQ print of|Bloomberg reports|Reuters reports|should buy|should sell|buy this|sell this|price will|price target/i.test(
      generated,
    );
    const causation = challenge.assessments.find((entry) => entry.kind === "causation");
    const tape = challenge.assessments.find((entry) => entry.kind === "reference.tape");
    const trade = challenge.assessments.find((entry) => entry.kind === "trade.action");
    const unmatched = challenge.assessments.find((entry) => /moon phase/i.test(entry.text));
    const direction = challenge.assessments.find((entry) => entry.kind === "price.direction");
    const challengeHonest =
      challenge.advisory === false &&
      challenge.milestone === "5-interpretation-challenge" &&
      challengeTraceable &&
      !fabricatedChallenge &&
      causation?.status === "unsupported" &&
      tape?.status === "unsupported" &&
      trade?.status === "unassessed" &&
      unmatched?.status === "unassessed" &&
      direction !== undefined &&
      direction.status !== "unassessed" &&
      challenge.attackMyThesis.every((point) => point.invented === false) &&
      challenge.whatAmIMissing.some((entry) => entry.kind === "unknown");
    checks.push({
      id: "interpretation-challenge",
      title: "Challenge a thesis against the investigation brief",
      endpoint: `composed brief → POST /api/market/challenge/${symbolInput}`,
      access: "public",
      status: challengeHonest ? "pass" : "fail",
      detail: challengeHonest
        ? `Challenge ${challenge.summary.supported} supported / ${challenge.summary.challenged} challenged / ${challenge.summary.unsupported} unsupported / ${challenge.summary.unassessed} unassessed. Causation and tape stay unsupported. Trade language is unassessed. Citations resolve to pack IDs.`
        : "Challenge lost traceability, treated missing evidence as false, invented counterclaims, or emitted a recommendation.",
      sample: {
        summary: challenge.summary,
        statuses: challenge.assessments.map((entry) => ({
          kind: entry.kind,
          status: entry.status,
          ruleId: entry.ruleId,
        })),
        attackIds: challenge.attackMyThesis.map((entry) => entry.id),
      },
    });
  } catch (error) {
    checks.push({
      id: "market-context",
      title: "Normalize market context (observed / derived / unavailable)",
      endpoint: `composed snapshot → GET /api/market/context/${symbolInput}`,
      access: "public",
      status: "fail",
      detail: failureDetail(error),
    });
    checks.push({
      id: "evidence-pack",
      title: "Build an investigation evidence pack (FACT / INFERENCE / ASSUMPTION / UNKNOWN)",
      endpoint: `composed context → GET /api/market/evidence/${symbolInput}`,
      access: "public",
      status: "fail",
      detail: failureDetail(error),
    });
    checks.push({
      id: "investigation-brief",
      title: "Compose a non-advisory investigation brief",
      endpoint: `composed pack → GET /api/market/brief/${symbolInput}`,
      access: "public",
      status: "fail",
      detail: failureDetail(error),
    });
    checks.push({
      id: "interpretation-challenge",
      title: "Challenge a thesis against the investigation brief",
      endpoint: `composed brief → POST /api/market/challenge/${symbolInput}`,
      access: "public",
      status: "fail",
      detail: failureDetail(error),
    });
  }

  const passed = checks.filter((check) => check.status === "pass").length;
  const failed = checks.filter((check) => check.status === "fail").length;
  const skipped = checks.filter((check) => check.status === "skipped").length;

  return {
    product: "Mirrorline",
    milestone: "5-interpretation-challenge",
    startedAt,
    finishedAt: new Date().toISOString(),
    symbol,
    credentialsConfigured: client.hasPrivateCredentials(),
    summary: { passed, failed, skipped, total: checks.length },
    checks,
    notes: [
      "All Bitget calls are server-side. API secrets are never returned.",
      "Ticker bid/ask/size come from Get Tickers. Do not treat that as full book depth.",
      "Reality-specific order book and platform fills remain optional until a whitelisted API key is configured.",
      "No trading or order-execution endpoints are implemented.",
      "Market context labels every field as observed, derived, or unavailable. Stale and missing data stay explicit.",
      "Evidence packs classify Bitget context as FACT, INFERENCE, ASSUMPTION, or UNKNOWN. Assumptions are not facts.",
      "Investigation briefs are non-advisory. Tensions cite evidence IDs; overnight rToken quoting vs closed US equity is a tension, not a contradiction.",
      "Interpretation challenges match thesis claims with transparent rules. Unmapped language is unassessed, not false. Missing evidence does not disprove a thesis.",
      "The public UTA order book is not treated as Reality 40-level depth.",
      discovery
        ? `Live discovery counted ${discovery.total} Reality instruments at verification time.`
        : "Instrument discovery did not complete.",
    ],
  };
}
