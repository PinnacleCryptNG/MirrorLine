import type { StructuredClaimKind } from "@/lib/composer/schema";
import type { MarketSnapshotPayload } from "@/lib/market/types";

export type DemoScenarioId =
  | "scenario-raapl-session-down"
  | "scenario-rnvda-overnight-up"
  | "scenario-rtsla-weekend-stale";

export interface DemoRecommendedClaim {
  kind: StructuredClaimKind;
  fields: Record<string, string>;
  explanation?: string;
  expectedStatus: "supported" | "challenged" | "unsupported" | "unassessed";
  why: string;
}

export interface DemoScenario {
  id: DemoScenarioId;
  symbol: string;
  pair: string;
  tokenSymbol: string;
  title: string;
  tagline: string;
  description: string;
  retrievedAt: string;
  scenarioHighlights: string[];
  recommendedClaims: DemoRecommendedClaim[];
  buildSnapshot: () => MarketSnapshotPayload;
}

export interface DemoScenarioSummary {
  id: DemoScenarioId;
  symbol: string;
  pair: string;
  tokenSymbol: string;
  title: string;
  tagline: string;
  description: string;
  retrievedAt: string;
  scenarioHighlights: string[];
  recommendedClaims: DemoRecommendedClaim[];
}
