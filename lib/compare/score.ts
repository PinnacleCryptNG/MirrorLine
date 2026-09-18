import { buildComposerChallenge } from "@/lib/composer/challenge";
import type { EvidencePack } from "@/lib/evidence/types";
import type { InvestigationBrief } from "@/lib/brief/types";
import type { InterpretationChallenge, StructuredClaim } from "@/lib/challenge/types";

export function scoreSharedClaims(options: {
  pack: EvidencePack;
  brief: InvestigationBrief;
  claims: StructuredClaim[];
  freeText?: string;
  reason?: string;
  assumptions?: string[];
}): InterpretationChallenge {
  return buildComposerChallenge({
    pack: options.pack,
    brief: options.brief,
    claims: options.claims,
    freeText: options.freeText,
    reason: options.reason,
    assumptions: options.assumptions,
  });
}
