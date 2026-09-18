# Mirrorline

Mirrorline is an evidence-first AI trading desk for stress-testing decisions in 24/7 Bitget Reality rToken markets.

This repository currently ships **Milestone 2 — Market Context Layer** for the Bitget AI × Crypto Hackathon Genesis Season 2, built on the Milestone 1 Bitget data foundation.

It does not tell anyone what to buy or sell. It does not place orders. It does not invent prices, liquidity, news, US tape prints, or market status.

## What works now

Server-side Bitget UTA/Reality market data, plus a normalized context snapshot:

- Discover supported Reality rToken instruments (`isReality=yes`)
- Retrieve ticker data: last price, 24h change, bid/ask, volume, source timestamp
- Retrieve candle history on Bitget-supported rToken intervals
- Retrieve stock/session metadata: stock info, US session windows, holiday calendar, company overview
- Normalize a market context object that labels every field **observed**, **derived**, or **unavailable**
- Derive spread, mid, session, and token-window match from Bitget fields only
- Keep stale, missing, and failed resources explicit — no silent substitution
- Leave `referencePrice` and `divergence` unverified (Bitget does not provide a US tape)
- Optional order-book retrieval, with Reality 40-level depth treated as whitelist-gated
- A verification desk plus `pnpm verify:bitget`

## Run locally

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

The app listens on [http://localhost:43123](http://localhost:43123).

Public Bitget market data does not require API keys. If you later need Reality order-book depth or fills, add server-only credentials:

```
BITGET_API_KEY=
BITGET_API_SECRET=
BITGET_PASSPHRASE=
```

Never expose those values to the browser.

## Verify the integration

```bash
pnpm test
pnpm verify:bitget
# or
pnpm verify:bitget rNVDA
```

HTTP verification route:

```
GET /api/market/verify?symbol=rAAPL
```

Other server routes:

- `GET /api/market/instruments?query=nvda&limit=20`
- `GET /api/market/tickers/rAAPL`
- `GET /api/market/candles?symbol=rAAPL&interval=1H&limit=48`
- `GET /api/market/session?symbol=rAAPL&company=true`
- `GET /api/market/snapshot/rAAPL` — raw Bitget payload plus `context`
- `GET /api/market/context/rAAPL` — normalized context only
- `GET /api/market/orderbook/rAAPL`

## Architecture

Bitget access stays isolated under `lib/bitget/`. Normalization lives in `lib/market/` and only consumes those getters. Next.js route handlers in `app/api/market/` are the only HTTP surface. The homepage is the verification desk for this milestone, not the full investigation UI.

See `docs/BITGET.md` and `ENVIRONMENT.md`.

## Known limitations

- Reality-specific order book and platform fills require Bitget API credentials and may still need UID whitelist access.
- Bitget session endpoints return schedules; current session is derived from those schedules plus the calendar.
- Company overview is Bitget metadata, not a live US exchange tape. It is never used as `referencePrice`.
- Public UTA book depth is not Reality 40-level depth.
- No database, auth, or AI investigation engine yet. Those belong to later milestones.

## Tests

```bash
pnpm test
pnpm lint
pnpm build
```
