# Architecture

Milestone 2 sits on the Milestone 1 Bitget client. The client still talks to Bitget; the context layer only normalizes what that client already returns.

```
Browser
  → Next.js route handlers in app/api/market
    → lib/market (normalize, freshness, spread, gather)
      → lib/bitget
        → https://api.bitget.com
```

No Bitget credentials or raw provider calls are exposed to the client. Trading endpoints are not implemented.

## Layout

- `lib/bitget/client.ts` — HTTP client, timeouts, envelope parsing, optional HMAC signing
- `lib/bitget/assets.ts` — rToken discovery
- `lib/bitget/market.ts` — tickers
- `lib/bitget/history.ts` — candles
- `lib/bitget/session.ts` — stock info, session windows, calendar, derived current session
- `lib/bitget/orderbook.ts` — optional public and Reality depth
- `lib/bitget/verify.ts` — integration report used by the HTTP route and CLI script
- `lib/market/fields.ts` — observed / derived / unavailable field helpers
- `lib/market/spread.ts` — ask − bid and basis-point spread
- `lib/market/freshness.ts` — ticker and candle staleness
- `lib/market/normalize.ts` — pure snapshot → context mapping
- `lib/market/context.ts` — gather existing Bitget getters with partial failure

Failed Bitget resources become `unavailable` fields with `error` or `missing` status. The layer does not invent a US tape, reference price, or Reality 40-level depth.

Later milestones add investigation, evidence, and decision engines on top of this context.
