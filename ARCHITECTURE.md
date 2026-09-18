# Architecture

Milestone 5 sits on the Milestone 4 investigation brief. The challenge engine does not call Bitget, does not reclassify fields, and does not use an LLM. It matches a trader thesis to existing evidence with transparent rules.

```
Browser
  → Next.js route handlers in app/api/market
    → lib/challenge (interpretation challenge)
      → lib/brief (investigation brief, tensions)
        → lib/evidence (FACT / INFERENCE / ASSUMPTION / UNKNOWN pack)
          → lib/market
            → lib/bitget
              → https://api.bitget.com
```

No Bitget credentials or raw provider calls are exposed to the client. Trading endpoints are not implemented. The challenge is deterministic (no LLM) and is not a multi-agent pipeline.

## Layout

- `lib/bitget/` — typed Bitget Reality client (Milestone 1)
- `lib/market/` — labeled market context (Milestone 2)
- `lib/evidence/` — classified evidence pack (Milestone 3)
- `lib/brief/` — investigation brief (Milestone 4)
- `lib/challenge/types.ts` — interpretation challenge schema
- `lib/challenge/split.ts` — sentence / assumption splitting
- `lib/challenge/rules.ts` — transparent claim-matching rules
- `lib/challenge/engine.ts` — pack + brief + thesis → challenge
- `lib/challenge/get-challenge.ts` — gathers evidence once, then challenges
- `app/api/market/challenge/[symbol]/route.ts` — HTTP surface

## Claim statuses

- **supported** — a rule matched and pack FACT/INFERENCE affirms the specific claim
- **challenged** — a rule matched and pack evidence contradicts or freshness-limits the claim
- **unsupported** — a rule matched but required evidence is UNKNOWN/missing (not disproven)
- **unassessed** — no reliable rule mapped the sentence, polarity was negated, or the claim is a trade action

Overnight rToken quoting vs a closed US equity session remains a brief tension. Attack points only restate existing evidence and tensions. UNKNOWN is never treated as proof the thesis is false.
