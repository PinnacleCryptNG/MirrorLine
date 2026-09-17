import { describe, expect, it } from "vitest";
import {
  assertRealityInterval,
  normalizeRTokenSymbol,
  tokenSymbolFromPair,
  underlyingFromPair,
} from "@/lib/bitget/symbols";
import { BitgetError } from "@/lib/bitget/errors";

describe("normalizeRTokenSymbol", () => {
  it("accepts rToken, pair, and underlying forms", () => {
    expect(normalizeRTokenSymbol("rAAPL")).toBe("RAAPLUSDT");
    expect(normalizeRTokenSymbol("RAAPLUSDT")).toBe("RAAPLUSDT");
    expect(normalizeRTokenSymbol("rAAPLUSDT")).toBe("RAAPLUSDT");
    expect(normalizeRTokenSymbol("AAPL")).toBe("RAAPLUSDT");
    expect(normalizeRTokenSymbol("r-nvda")).toBe("RNVDAUSDT");
  });

  it("rejects empty input", () => {
    expect(() => normalizeRTokenSymbol(" ")).toThrow(BitgetError);
  });
});

describe("token helpers", () => {
  it("derives display token and underlying symbols", () => {
    expect(tokenSymbolFromPair("RAAPLUSDT")).toBe("rAAPL");
    expect(underlyingFromPair("RAAPLUSDT")).toBe("AAPL");
  });
});

describe("assertRealityInterval", () => {
  it("allows documented rToken intervals only", () => {
    expect(assertRealityInterval("1m")).toBe("1m");
    expect(assertRealityInterval("1H")).toBe("1H");
    expect(() => assertRealityInterval("3m")).toThrow(/only support intervals/);
    expect(() => assertRealityInterval("1h")).toThrow(BitgetError);
  });
});
