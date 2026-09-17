# Architecture

Milestone 1 isolates Bitget Reality market data behind a typed server client.

```
Browser
  → Next.js route handlers in app/api/market
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

Later milestones add investigation, evidence, and decision engines on top of this data layer.
