import { getEvidencePack } from "@/lib/evidence/get-pack";
import { buildInvestigationBrief } from "./generate";
import type { InvestigationBrief } from "./types";

export async function getInvestigationBrief(
  symbol: string,
  options: { question?: string } = {},
): Promise<InvestigationBrief> {
  const pack = await getEvidencePack(symbol, options);
  return buildInvestigationBrief(pack);
}
