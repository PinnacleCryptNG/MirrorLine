import { getEvidencePack } from "@/lib/evidence/get-pack";
import { buildInvestigationBrief } from "@/lib/brief/generate";
import type { InterpretationChallenge, StructuredClaim } from "@/lib/challenge/types";
import { buildComposerChallenge } from "./challenge";

export async function getComposerChallenge(
  symbol: string,
  input: {
    claims: StructuredClaim[];
    freeText?: string;
    reason?: string;
    assumptions?: string[];
  },
  options: { question?: string } = {},
): Promise<InterpretationChallenge> {
  const pack = await getEvidencePack(symbol, options);
  const brief = buildInvestigationBrief(pack);
  return buildComposerChallenge({
    pack,
    brief,
    claims: input.claims,
    freeText: input.freeText,
    reason: input.reason,
    assumptions: input.assumptions,
  });
}
