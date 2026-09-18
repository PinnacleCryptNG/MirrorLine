# Architecture

Milestone 4 sits on the Milestone 3 evidence pack. The brief generator does not call Bitget and does not reclassify fields; it only composes a non-advisory document from pack items.

```
Browser
  → Next.js route handlers in app/api/market
    → lib/brief (investigation brief, tensions)
      → lib/evidence (FACT / INFERENCE / ASSUMPTION / UNKNOWN pack)
        → lib/market
          → lib/bitget
            → https://api.bitget.com
```

No Bitget credentials or raw provider calls are exposed to the client. Trading endpoints are not implemented. The brief is deterministic (no LLM) and is not a multi-agent pipeline.

## Layout

- `lib/bitget/` — typed Bitget Reality client (Milestone 1)
- `lib/market/` — labeled market context (Milestone 2)
- `lib/evidence/` — classified evidence pack (Milestone 3)
- `lib/brief/types.ts` — investigation brief schema
- `lib/brief/tensions.ts` — tension vs contradiction detector
- `lib/brief/generate.ts` — pure pack → brief mapping
- `lib/brief/get-brief.ts` — gathers evidence once, then builds the brief
- `app/api/market/brief/[symbol]/route.ts` — HTTP surface

Every brief paragraph cites evidence IDs. Overnight rToken quoting vs a closed US equity session is a tension, not a contradiction. UNKNOWN stays an unanswered question.
