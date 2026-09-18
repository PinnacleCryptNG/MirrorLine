export { calculateSpread } from "./spread";
export {
  TICKER_STALE_AFTER_SECONDS,
  CANDLE_INTERVAL_MS,
  freshnessSeconds,
  classifyFreshness,
  observedAtMs,
  candleSeriesFreshness,
} from "./freshness";
export {
  observedField,
  derivedField,
  unavailableField,
  collectFields,
  summarizeCoverage,
  evidenceFor,
} from "./fields";
export type { ContextField, FieldKind, FieldStatus, EvidenceClass, FieldCoverage } from "./fields";
export { normalizeMarketContext } from "./normalize";
export { gatherMarketRaw, getMarketSnapshot, getMarketContext } from "./context";
export { MARKET_CONTEXT_LIMITATIONS } from "./types";
export type {
  MarketContext,
  MarketRawInput,
  MarketSnapshotPayload,
  ResourceFailure,
} from "./types";
