# Architecture

Milestone 3 sits on the Milestone 2 market context layer. Context still normalizes Bitget payloads; the evidence pack only classifies those fields.

```
Browser
  → Next.js route handlers in app/api/market
    → lib/evidence (FACT / INFERENCE / ASSUMPTION / UNKNOWN pack)
      → lib/market (normalize, freshness, spread, gather)
        → lib/bitget
          → https://api.bitget.com
```

No Bitget credentials or raw provider calls are exposed to the client. Trading endpoints are not implemented. The pack is not a multi-agent investigation pipeline.

## Layout

- `lib/bitget/` — typed Bitget Reality client (Milestone 1)
- `lib/market/` — labeled market context (Milestone 2)
- `lib/evidence/types.ts` — evidence item and pack schema
- `lib/evidence/pack.ts` — pure generator over `MarketContext`
- `lib/evidence/get-pack.ts` — gathers context once, then builds the pack
- `app/api/market/evidence/[symbol]/route.ts` — HTTP surface

Failed or missing Bitget resources become UNKNOWN evidence items. Inferences must cite supporting facts. Assumptions are never classified as facts. No US tape, news, or Reality 40-level depth is invented.
