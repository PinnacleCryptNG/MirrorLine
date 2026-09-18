# Mirrorline environment

Copy `.env.example` to `.env.local` for local development.

## Required for Milestone 9 multi-symbol comparison

None. Comparison export scores already-loaded per-symbol packs against shared structured claims. No LLM key or database is required.

## Optional

These are only needed for Reality-specific order book depth and platform fills.

```
BITGET_API_KEY=
BITGET_API_SECRET=
BITGET_PASSPHRASE=
```

Even with credentials, Bitget documents Reality order-book depth and fills as whitelist-gated. Contact Bitget BD if those endpoints return auth or whitelist errors.

## Timeouts

```
BITGET_TIMEOUT_MS=10000
BITGET_BASE_URL=https://api.bitget.com
```

Never put secrets in frontend code or `NEXT_PUBLIC_*` variables.
