import { isoFromMillis, nowIso } from "@/lib/utils";
import { isBitgetError } from "./errors";
import { orderBookSchema } from "./schemas";
import { normalizeRTokenSymbol } from "./symbols";
import type { BitgetClient } from "./client";
import { getBitgetClient } from "./client";
import type { DataProvenance, OrderBookLevel, OrderBookSnapshot } from "./types";

const PUBLIC_ORDERBOOK_PATH = "/api/v3/market/orderbook";
const REALITY_ORDERBOOK_PATH = "/api/v3/account/reality-orderbook";
const REALITY_FILLS_PATH = "/api/v3/account/reality-fills";

function mapLevels(rows: Array<Array<string | number>>): OrderBookLevel[] {
  return rows
    .map((row) => ({
      price: String(row[0] ?? ""),
      size: String(row[1] ?? ""),
    }))
    .filter((level) => level.price !== "" && level.size !== "");
}

function toSnapshot(
  raw: unknown,
  source: OrderBookSnapshot["source"],
  note?: string,
): OrderBookSnapshot {
  const parsed = orderBookSchema.parse(raw);
  return {
    asks: mapLevels(parsed.a),
    bids: mapLevels(parsed.b),
    sourceTimestamp: isoFromMillis(parsed.ts),
    source,
    availability: "available",
    note,
  };
}

export async function getPublicOrderBook(
  symbol: string,
  client: BitgetClient = getBitgetClient(),
  limit = 5,
): Promise<{ book: OrderBookSnapshot; provenance: DataProvenance }> {
  const pair = normalizeRTokenSymbol(symbol);
  const retrievedAt = nowIso();
  const envelope = await client.get<unknown>(PUBLIC_ORDERBOOK_PATH, {
    searchParams: {
      category: "SPOT",
      symbol: pair,
      limit,
    },
  });
  return {
    book: toSnapshot(
      envelope.data,
      "uta_public_orderbook",
      "This is the public UTA SPOT order book, not the whitelist Reality 40-level book. Treat depth as optional market structure context only.",
    ),
    provenance: {
      source: "bitget",
      endpoint: PUBLIC_ORDERBOOK_PATH,
      retrievedAt,
      requestTime: envelope.requestTime,
      observedAt: isoFromMillis(
        typeof envelope.data === "object" && envelope.data && "ts" in envelope.data
          ? (envelope.data as { ts?: string }).ts
          : envelope.requestTime,
      ),
    },
  };
}

export async function getRealityOrderBook(
  symbol: string,
  client: BitgetClient = getBitgetClient(),
): Promise<{ book: OrderBookSnapshot; provenance: DataProvenance }> {
  const pair = normalizeRTokenSymbol(symbol);
  const retrievedAt = nowIso();
  const envelope = await client.get<unknown>(REALITY_ORDERBOOK_PATH, {
    auth: true,
    searchParams: { symbol: pair },
  });
  return {
    book: toSnapshot(
      envelope.data,
      "reality_orderbook",
      "Reality-specific depth snapshot. Official docs cap this at 40 levels and require whitelist access.",
    ),
    provenance: {
      source: "bitget",
      endpoint: REALITY_ORDERBOOK_PATH,
      retrievedAt,
      requestTime: envelope.requestTime,
      observedAt: isoFromMillis(envelope.requestTime),
    },
  };
}

export async function getOptionalRealityOrderBook(
  symbol: string,
  client: BitgetClient = getBitgetClient(),
): Promise<{
  book: OrderBookSnapshot | null;
  provenance?: DataProvenance;
  availability: OrderBookSnapshot["availability"];
  reason?: string;
}> {
  try {
    const result = await getRealityOrderBook(symbol, client);
    return {
      book: result.book,
      provenance: result.provenance,
      availability: "available",
    };
  } catch (error) {
    if (isBitgetError(error) && (error.code === "BITGET_AUTH_REQUIRED" || error.code === "BITGET_WHITELIST_REQUIRED")) {
      return {
        book: null,
        availability: "unauthorized",
        reason: error.message,
      };
    }
    if (isBitgetError(error)) {
      return {
        book: null,
        availability: "error",
        reason: error.message,
      };
    }
    return {
      book: null,
      availability: "error",
      reason: error instanceof Error ? error.message : "Unknown order book error",
    };
  }
}

export async function getOptionalPublicOrderBook(
  symbol: string,
  client: BitgetClient = getBitgetClient(),
): Promise<{
  book: OrderBookSnapshot | null;
  provenance?: DataProvenance;
  availability: OrderBookSnapshot["availability"];
  reason?: string;
}> {
  try {
    const result = await getPublicOrderBook(symbol, client);
    return {
      book: result.book,
      provenance: result.provenance,
      availability: "available",
    };
  } catch (error) {
    if (isBitgetError(error) && error.code === "BITGET_NOT_FOUND") {
      return { book: null, availability: "missing", reason: error.message };
    }
    return {
      book: null,
      availability: "error",
      reason: error instanceof Error ? error.message : "Unknown public order book error",
    };
  }
}

export const REALITY_FILLS_ENDPOINT = REALITY_FILLS_PATH;
export const REALITY_ORDERBOOK_ENDPOINT = REALITY_ORDERBOOK_PATH;
