import { getEvidencePack } from "@/lib/evidence/get-pack";
import { buildInvestigationBrief } from "@/lib/brief/generate";
import { buildInterpretationChallenge } from "./engine";
import type { InterpretationChallenge, ThesisInput } from "./types";

export async function getInterpretationChallenge(
  symbol: string,
  input: ThesisInput,
  options: { question?: string } = {},
): Promise<InterpretationChallenge> {
  const pack = await getEvidencePack(symbol, options);
  const brief = buildInvestigationBrief(pack);
  return buildInterpretationChallenge({ pack, brief, input });
}
