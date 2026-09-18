const SENTENCE_SPLIT = /[\n;]+|(?<=[.!?])\s+/;

export function splitClaimText(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }
  return normalized
    .split(SENTENCE_SPLIT)
    .map((part) => part.trim().replace(/^[-•]\s*/, ""))
    .filter((part) => part.length > 0);
}

export function normalizeAssumptions(input: string[] | string | undefined): string[] {
  if (input === undefined || input === null) {
    return [];
  }
  const lines = Array.isArray(input) ? input : splitClaimText(input);
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(trimmed);
  }
  return unique;
}

export function hasNegation(text: string): boolean {
  return /\b(not|never|no longer|hardly|without)\b|n't\b/i.test(text);
}
