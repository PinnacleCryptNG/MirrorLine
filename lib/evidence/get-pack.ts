import { getMarketContext } from "@/lib/market/context";
import { buildEvidencePack } from "./pack";
import type { EvidencePack } from "./types";

export async function getEvidencePack(
  symbol: string,
  options: { question?: string } = {},
): Promise<EvidencePack> {
  const context = await getMarketContext(symbol);
  return buildEvidencePack(context, options);
}
