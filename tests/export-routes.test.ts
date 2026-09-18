import { describe, expect, it } from "vitest";
import { POST as exportInvestigationReport } from "@/app/api/market/report/[symbol]/route";
import { POST as exportComparisonReport } from "@/app/api/market/compare/report/route";
import { buildEvidencePack } from "@/lib/evidence/pack";
import { buildInvestigationBrief } from "@/lib/brief/generate";
import { normalizeMarketContext } from "@/lib/market/normalize";
import type { MarketRawInput } from "@/lib/market/types";
import { createStructuredClaim } from "@/lib/composer/validate";
import type { StructuredClaim } from "@/lib/challenge/types";

const appleAt = new Date("2026-09-17T15:00:00.000Z");
const nvidiaAt = new Date("2026-09-17T15:00:12.000Z");

function baseRaw(symbol: "rAAPL" | "rNVDA", retrievedAt: Date, overrides: Partial<MarketRawInput> = {}): MarketRawInput {
  const pair = symbol === "rAAPL" ? "RAAPLUSDT" : "RNVDAUSDT";
  const underlying = symbol === "rAAPL" ? "AAPL" : "NVDA";
  const last = symbol === "rAAPL" ? 332.9 : 120.4;
  const change = symbol === "rAAPL" ? -0.00434 : 0.012;
  return {
    retrievedAt,
    requestedSymbol: symbol,
    pair,
    instrument: {
      symbol: pair,
      category: "SPOT",
      baseCoin: symbol,
      quoteCoin: "USDT",
      isReality: true,
      status: "online",
      tokenSymbol: symbol,
      underlyingSymbol: underlying,
      displayName: underlying === "AAPL" ? "Apple" : "NVIDIA",
      tradingPeriod: ["pre_market", "regular", "after_hours", "overnight"],
      weekendTradable: true,
    },
    ticker: {
      symbol: pair,
      category: "SPOT",
      lastPrice: String(last),
      lastPriceNumber: last,
      change24hPercentNumber: change,
      bid: String(last - 0.04),
      ask: String(last + 0.04),
      volume24h: "1000",
      sourceTimestamp: new Date(retrievedAt.getTime() - 3_000).toISOString(),
      sourceTimestampMs: retrievedAt.getTime() - 3_000,
    },
    candles: [
      {
        timestampMs: retrievedAt.getTime() - 60 * 60 * 1000,
        timestamp: new Date(retrievedAt.getTime() - 60 * 60 * 1000).toISOString(),
        open: "334.12",
        high: "334.25",
        low: "333.73",
        close: "334.04",
        volume: "12",
        turnover: "4000",
      },
    ],
    candleInterval: "1H",
    session: {
      evaluatedAt: retrievedAt.toISOString(),
      timeZone: "EST",
      daylightType: "standard",
      bitgetState: "regular",
      marketSession: "US_REGULAR",
      underlyingUsEquity: "regular",
      weekend: false,
      derivation: ["Matched Bitget state 'regular'."],
    },
    realityOrderBook: { availability: "unauthorized", book: null, reason: "whitelist required" },
    failures: [],
    provenance: {},
    company: {
      code: underlying,
      name: underlying === "AAPL" ? "Apple" : "NVIDIA",
      high52Week: "260.1",
      low52Week: "169.2",
    },
    ...overrides,
  };
}

function packFor(symbol: "rAAPL" | "rNVDA", retrievedAt: Date) {
  const ctx = normalizeMarketContext(baseRaw(symbol, retrievedAt));
  const pack = buildEvidencePack(ctx);
  const brief = buildInvestigationBrief(pack);
  return { ctx, pack, brief };
}

function claim(kind: StructuredClaim["kind"], fields: Record<string, string>, index = 0): StructuredClaim {
  return { ...createStructuredClaim(kind as never, index, appleAt.toISOString()), fields };
}

describe("HTTP Export Routes", () => {
  it("POST /api/market/report/[symbol] exports JSON, Markdown, and HTML from loaded payload", async () => {
    const { pack, brief } = packFor("rAAPL", appleAt);
    const body = { pack, brief };

    // 1. JSON Export
    const jsonReq = new Request("http://localhost:43123/api/market/report/rAAPL?format=json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const jsonRes = await exportInvestigationReport(jsonReq, {
      params: Promise.resolve({ symbol: "rAAPL" }),
    });
    expect(jsonRes.status).toBe(200);
    const jsonData = await jsonRes.json();
    expect(jsonData.tokenSymbol).toBe("rAAPL");
    expect(jsonData.advisory).toBe(false);
    expect(jsonData.snapshot.retrievedAt).toBe("2026-09-17T15:00:00.000Z");

    // 2. Markdown Export
    const mdReq = new Request("http://localhost:43123/api/market/report/rAAPL?format=markdown", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const mdRes = await exportInvestigationReport(mdReq, {
      params: Promise.resolve({ symbol: "rAAPL" }),
    });
    expect(mdRes.status).toBe(200);
    const mdText = await mdRes.text();
    expect(mdText).toContain("# Mirrorline investigation report — rAAPL");
    expect(mdText).toContain("Non-advisory");

    // 3. HTML Export
    const htmlReq = new Request("http://localhost:43123/api/market/report/rAAPL?format=html", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const htmlRes = await exportInvestigationReport(htmlReq, {
      params: Promise.resolve({ symbol: "rAAPL" }),
    });
    expect(htmlRes.status).toBe(200);
    const htmlText = await htmlRes.text();
    expect(htmlText).toContain("<!DOCTYPE html>");
    expect(htmlText).toContain("NON-ADVISORY · MIRRORLINE INVESTIGATION REPORT");
    expect(htmlText).toContain("window.print()");
  });

  it("POST /api/market/compare/report exports JSON, Markdown, and HTML from loaded symbols without fetching Bitget", async () => {
    const apple = packFor("rAAPL", appleAt);
    const nvidia = packFor("rNVDA", nvidiaAt);
    const testClaim = claim("price.change24h", { sign: "down" });
    const body = {
      symbols: [
        { requestedSymbol: "rAAPL", pack: apple.pack, brief: apple.brief },
        { requestedSymbol: "rNVDA", pack: nvidia.pack, brief: nvidia.brief },
      ],
      claims: [testClaim],
      freeText: "Optional user note",
    };

    // 1. JSON Export
    const jsonReq = new Request("http://localhost:43123/api/market/compare/report?format=json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const jsonRes = await exportComparisonReport(jsonReq);
    expect(jsonRes.status).toBe(200);
    const jsonData = await jsonRes.json();
    expect(jsonData.milestone).toBe("9-multi-symbol-comparison");
    expect(jsonData.advisory).toBe(false);
    expect(jsonData.symbols).toHaveLength(2);
    expect(jsonData.symbols[0].snapshot.retrievedAt).toBe("2026-09-17T15:00:00.000Z");
    expect(jsonData.symbols[1].snapshot.retrievedAt).toBe("2026-09-17T15:00:12.000Z");

    // 2. Markdown Export
    const mdReq = new Request("http://localhost:43123/api/market/compare/report?format=markdown", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const mdRes = await exportComparisonReport(mdReq);
    expect(mdRes.status).toBe(200);
    const mdText = await mdRes.text();
    expect(mdText).toContain("# Mirrorline multi-symbol comparison");
    expect(mdText).toContain("Non-advisory");

    // 3. HTML Export
    const htmlReq = new Request("http://localhost:43123/api/market/compare/report?format=html", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const htmlRes = await exportComparisonReport(htmlReq);
    expect(htmlRes.status).toBe(200);
    const htmlText = await htmlRes.text();
    expect(htmlText).toContain("<!DOCTYPE html>");
    expect(htmlText).toContain("NON-ADVISORY · MULTI-SYMBOL COMPARISON");
    expect(htmlText).toContain("window.print()");
  });

  it("POST /api/market/compare/report returns 400 on invalid input or insufficient symbols", async () => {
    const req = new Request("http://localhost:43123/api/market/compare/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols: ["rAAPL"], claims: [] }),
    });
    const res = await exportComparisonReport(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("INVALID_INPUT");
  });
});
