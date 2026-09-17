import { BitgetError } from "./errors";
import { REALITY_CANDLE_INTERVALS, type RealityCandleInterval } from "./types";

const SYMBOL_PATTERN = /^[A-Z0-9]{2,32}$/;

export function normalizeRTokenSymbol(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new BitgetError({
      code: "BITGET_VALIDATION",
      message: "A Reality symbol is required.",
      httpStatus: 400,
    });
  }

  const value = trimmed.toUpperCase().replace(/[-_/]/g, "");
  if (value.startsWith("R") && value.endsWith("USDT")) {
    return assertSymbol(value);
  }
  if (value.endsWith("USDT") && !value.startsWith("R")) {
    return assertSymbol(`R${value}`);
  }
  if (value.startsWith("R")) {
    return assertSymbol(`${value}USDT`);
  }
  return assertSymbol(`R${value}USDT`);
}

export function tokenSymbolFromPair(symbol: string): string {
  const pair = normalizeRTokenSymbol(symbol);
  const withoutQuote = pair.endsWith("USDT") ? pair.slice(0, -4) : pair;
  if (!withoutQuote.startsWith("R")) {
    return withoutQuote;
  }
  return `r${withoutQuote.slice(1)}`;
}

export function underlyingFromPair(symbol: string): string {
  const token = tokenSymbolFromPair(symbol);
  return token.startsWith("r") ? token.slice(1) : token;
}

export function assertSymbol(symbol: string): string {
  if (!SYMBOL_PATTERN.test(symbol)) {
    throw new BitgetError({
      code: "BITGET_VALIDATION",
      message: `Invalid symbol '${symbol}'. Use a Bitget Reality pair such as RAAPLUSDT or rAAPL.`,
      httpStatus: 400,
    });
  }
  return symbol;
}

export function parseOptionalNumber(value: string | number | undefined | null): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function requireNumber(value: string | number, field: string): number {
  const n = parseOptionalNumber(value);
  if (n === undefined) {
    throw new BitgetError({
      code: "BITGET_VALIDATION",
      message: `Bitget field '${field}' was missing or not numeric.`,
      httpStatus: 502,
    });
  }
  return n;
}

export function assertRealityInterval(interval: string): RealityCandleInterval {
  if ((REALITY_CANDLE_INTERVALS as readonly string[]).includes(interval)) {
    return interval as RealityCandleInterval;
  }
  throw new BitgetError({
    code: "BITGET_UNSUPPORTED_INTERVAL",
    message: `rToken candles only support intervals ${REALITY_CANDLE_INTERVALS.join(", ")}. '${interval}' is not supported.`,
    httpStatus: 400,
  });
}

export function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return value;
}
