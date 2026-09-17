import { describe, expect, it } from "vitest";
import { mapTicker } from "@/lib/bitget/market";
import { mapCandle } from "@/lib/bitget/history";

describe("mapTicker", () => {
  it("maps Bitget ticker fields without inventing missing values", () => {
    const ticker = mapTicker({
      category: "SPOT",
      symbol: "RAAPLUSDT",
      ts: "1789652070212",
      lastPrice: "332.9",
      openPrice24h: "334.35",
      highPrice24h: "335.58",
      lowPrice24h: "330.7",
      ask1Price: "332.94",
      bid1Price: "332.86",
      bid1Size: "45",
      ask1Size: "20",
      price24hPcnt: "-0.00434",
      volume24h: "17336069.9731",
      turnover24h: "5769451285.3446",
      platformTurnover24h: "32565.9282",
    });

    expect(ticker.lastPriceNumber).toBe(332.9);
    expect(ticker.bid).toBe("332.86");
    expect(ticker.ask).toBe("332.94");
    expect(ticker.spread).toBeCloseTo(0.08);
    expect(ticker.sourceTimestamp).toBe(new Date(1789652070212).toISOString());
    expect(ticker.change24hPercentNumber).toBeCloseTo(-0.00434);
  });
});

describe("mapCandle", () => {
  it("keeps empty volume as null instead of fabricating it", () => {
    const candle = mapCandle(["1789642800000", "334.12", "334.25", "333.73", "334.04", "", ""]);
    expect(candle.open).toBe("334.12");
    expect(candle.volume).toBeNull();
    expect(candle.turnover).toBeNull();
    expect(candle.timestamp).toBe(new Date(1789642800000).toISOString());
  });
});
