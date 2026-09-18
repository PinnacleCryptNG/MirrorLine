export interface SpreadResult {
  spread: number | null;
  spreadBps: number | null;
  mid: number | null;
  formula?: string;
  reason?: string;
}

export function calculateSpread(
  bid: number | undefined,
  ask: number | undefined,
  lastPrice?: number,
): SpreadResult {
  if (bid === undefined || ask === undefined || !Number.isFinite(bid) || !Number.isFinite(ask)) {
    return {
      spread: null,
      spreadBps: null,
      mid: null,
      reason: "Bid or ask was not provided by Bitget, so spread was not calculated.",
    };
  }

  const spread = ask - bid;
  const mid = (bid + ask) / 2;
  const denominator = mid !== 0 ? mid : lastPrice;
  if (denominator === undefined || !Number.isFinite(denominator) || denominator === 0) {
    return {
      spread,
      spreadBps: null,
      mid,
      formula: "spread = ask - bid",
      reason: "Spread exists, but basis-point spread needs a non-zero mid or last price.",
    };
  }

  return {
    spread,
    spreadBps: (spread / denominator) * 10_000,
    mid,
    formula: "spread = ask - bid; spreadBps = spread / mid × 10,000 (mid falls back to last price if mid is 0)",
  };
}
