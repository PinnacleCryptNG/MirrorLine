import { getInterpretationChallenge } from "@/lib/challenge/get-challenge";
import { parseThesisInput } from "@/lib/challenge/engine";
import type { InterpretationChallenge, ThesisInput } from "@/lib/challenge/types";
import { getComposerChallenge } from "@/lib/composer/get-challenge";
import { validateStructuredClaim } from "@/lib/composer/validate";
import { buildThesisRevision } from "./diff";
import type { ThesisRevision } from "./types";

export function parseRevisionRequest(raw: unknown): {
  previous: InterpretationChallenge;
  input?: ThesisInput;
  current?: InterpretationChallenge;
  sequence: number;
} {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Revision input must be an object.");
  }
  const record = raw as Record<string, unknown>;
  const previous = record.previous;
  if (!previous || typeof previous !== "object" || !Array.isArray((previous as InterpretationChallenge).assessments)) {
    throw new Error("A previous challenge is required to revise a thesis.");
  }
  const current = record.current && typeof record.current === "object" ? (record.current as InterpretationChallenge) : undefined;
  const sequence = typeof record.sequence === "number" && Number.isFinite(record.sequence) ? Math.max(1, Math.floor(record.sequence)) : 1;
  if (current) {
    return { previous: previous as InterpretationChallenge, current, sequence };
  }
  const structuredClaims = Array.isArray(record.claims)
    ? record.claims
    : Array.isArray(record.structuredClaims)
      ? record.structuredClaims
      : undefined;
  const input = parseThesisInput(
    {
      thesis:
        typeof record.thesis === "string"
          ? record.thesis
          : typeof record.freeText === "string"
            ? record.freeText
            : (previous as InterpretationChallenge).input?.thesis,
      reason: record.reason,
      assumptions: record.assumptions,
      structuredClaims,
    },
    { allowEmpty: true },
  );
  return { previous: previous as InterpretationChallenge, input, sequence };
}

export async function getThesisRevision(
  symbol: string,
  options: {
    previous: InterpretationChallenge;
    input: ThesisInput;
    sequence?: number;
    question?: string;
  },
): Promise<ThesisRevision> {
  const current = options.input.structuredClaims?.length
    ? await getComposerChallenge(
        symbol,
        {
          claims: options.input.structuredClaims.map((claim, index) => validateStructuredClaim(claim, index)),
          freeText: options.input.thesis || undefined,
          reason: options.input.reason,
          assumptions: options.input.assumptions,
        },
        { question: options.question },
      )
    : await getInterpretationChallenge(symbol, options.input, { question: options.question });
  return buildThesisRevision({
    previous: options.previous,
    current,
    sequence: options.sequence ?? 1,
  });
}
