# Mirrorline

Mirrorline is an evidence-first AI trading desk for stress-testing decisions in 24/7 Bitget Reality rToken markets.

This repository currently ships **Milestone 7 — Structured Claim Composer** for the Bitget AI × Crypto Hackathon Genesis Season 2.

It does not tell anyone what to buy or sell. It does not place orders. It does not invent prices, liquidity, news, US tape prints, or market status.

## What works now

- Discover Reality rToken instruments and retrieve Bitget ticker, candles, session, and stock metadata
- Normalize a market context that labels every field observed, derived, or unavailable
- Build a per-investigation **evidence pack** that classifies claims as **FACT**, **INFERENCE**, **ASSUMPTION**, or **UNKNOWN**
- Compose a deterministic, non-advisory **investigation brief** with session context, tensions, and explicit unknowns
- Stress-test a trader's initial interpretation with a deterministic **interpretation challenge** (supported / challenged / unsupported / unassessed)
- Revise that thesis and **diff before/after challenges**, keeping claim identity across reorders and light edits
- Compose **structured claims** with explicit kinds and fields, then challenge them without treating the type as proof
- Trace each brief claim to evidence IDs, source fields, timestamps, and freshness
- Trace each item to a Bitget source field, timestamp, and freshness window
- Keep missing, stale, failed, and unverified data as explicit UNKNOWN or stale FACT items
- Leave reference price, divergence, news, and Reality 40-level depth unanswered unless Bitget actually returns them
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
- `GET /api/market/evidence/rAAPL` — investigation evidence pack
- `GET /api/market/brief/rAAPL` — non-advisory investigation brief
- `POST /api/market/challenge/rAAPL` — interpretation challenge (`{ thesis, reason?, assumptions? }`)
- `GET /api/market/challenge/rAAPL?thesis=...` — same challenge via query string
- `POST /api/market/revision/rAAPL` — thesis revision diff (`{ previous, thesis?, current?, sequence? }`)
- `POST /api/market/composer/rAAPL` — structured claim challenge (`{ claims, freeText?, reason?, assumptions? }`)
- `GET /api/market/orderbook/rAAPL`

## Architecture

Bitget access stays isolated under `lib/bitget/`. Normalization lives in `lib/market/`. Evidence classification lives in `lib/evidence/`. The investigation brief lives in `lib/brief/` and only consumes an `EvidencePack`. The interpretation challenge lives in `lib/challenge/`. Thesis revisions live in `lib/revision/`. Structured claims live in `lib/composer/` and render into the existing challenge engine.

See `docs/BITGET.md` and `ENVIRONMENT.md`.

## Known limitations

- This is not the full multi-agent investigation pipeline and not a trade recommendation.
- Claim matching is rule-based. Unmapped natural language is unassessed, not labeled false.
- Missing evidence does not disprove a thesis.
- Selecting a structured claim type does not make the assertion a verified fact.
- Intraday or unspecified price direction is unassessed because the pack only classifies 24-hour change.
- Reality-specific order book and platform fills require Bitget API credentials and may still need UID whitelist access.
- Bitget session endpoints return schedules; current session is an inference from those schedules plus the calendar.
- Company overview is Bitget metadata, not a live US exchange tape. It is never used as `referencePrice`.
- Public UTA book depth is not Reality 40-level depth.
- No database, auth, news feed, or trade execution.

## Tests

```bash
pnpm test
pnpm lint
pnpm build
```
