import { normalizeRTokenSymbol } from "@/lib/bitget/symbols";
import type { MarketSnapshotPayload } from "@/lib/market/types";
import { DEMO_SCENARIO_LIST } from "./scenarios";
import type { DemoScenario, DemoScenarioSummary } from "./types";

export * from "./types";
export { DEMO_SCENARIO_LIST } from "./scenarios";

export const SUPPORTED_DEMO_SYMBOLS = ["rAAPL", "rNVDA", "rTSLA"] as const;

function matchScenario(key: string, scenario: DemoScenario): boolean {
  const clean = key.trim().toLowerCase();
  if (scenario.id === clean) return true;
  if (scenario.symbol.toLowerCase() === clean) return true;
  if (scenario.tokenSymbol.toLowerCase() === clean) return true;
  if (scenario.pair.toLowerCase() === clean) return true;

  try {
    const pair = normalizeRTokenSymbol(key);
    if (scenario.pair === pair) return true;
  } catch {
    // ignore normalization error for IDs or free strings
  }
  return false;
}

export function getDemoScenario(key: string): DemoScenario | undefined {
  return DEMO_SCENARIO_LIST.find((item) => matchScenario(key, item));
}

export function isDemoSymbol(key: string): boolean {
  return Boolean(getDemoScenario(key));
}

export function getDemoSnapshot(key: string): MarketSnapshotPayload | undefined {
  const scenario = getDemoScenario(key);
  if (!scenario) {
    return undefined;
  }
  return scenario.buildSnapshot();
}

export function listDemoScenarios(): DemoScenarioSummary[] {
  return DEMO_SCENARIO_LIST.map((item) => ({
    id: item.id,
    symbol: item.symbol,
    pair: item.pair,
    tokenSymbol: item.tokenSymbol,
    title: item.title,
    tagline: item.tagline,
    description: item.description,
    retrievedAt: item.retrievedAt,
    scenarioHighlights: item.scenarioHighlights,
    recommendedClaims: item.recommendedClaims,
  }));
}
