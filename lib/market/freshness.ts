export const TICKER_STALE_AFTER_SECONDS = 15;

export const CANDLE_INTERVAL_MS: Record<string, number> = {
  "1m": 60_000,
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "1H": 60 * 60_000,
  "4H": 4 * 60 * 60_000,
  "1D": 24 * 60 * 60_000,
};

export type FreshnessClass = "fresh" | "stale" | "unknown";

export function freshnessSeconds(
  observedAtMs: number | undefined | null,
  retrievedAt: Date,
): number | null {
  if (observedAtMs === undefined || observedAtMs === null || !Number.isFinite(observedAtMs)) {
    return null;
  }
  return Math.max(0, Math.round((retrievedAt.getTime() - observedAtMs) / 1000));
}

export function classifyFreshness(
  seconds: number | null,
  staleAfterSeconds: number,
): FreshnessClass {
  if (seconds === null) {
    return "unknown";
  }
  return seconds > staleAfterSeconds ? "stale" : "fresh";
}

export function observedAtMs(value: string | number | undefined | null): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  const asNumber = Number(value);
  if (Number.isFinite(asNumber) && value.trim() !== "" && !value.includes("T")) {
    return asNumber;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function candleSeriesFreshness(
  lastCandleTimestampMs: number | undefined,
  interval: string,
  retrievedAt: Date,
): FreshnessClass {
  if (lastCandleTimestampMs === undefined) {
    return "unknown";
  }
  const intervalMs = CANDLE_INTERVAL_MS[interval];
  if (!intervalMs) {
    return "unknown";
  }
  const age = retrievedAt.getTime() - lastCandleTimestampMs;
  // The current interval's open candle is expected to be younger than 2× the interval.
  return age > intervalMs * 2 ? "stale" : "fresh";
}
