# Mirrorline Environment & Configuration

Mirrorline is designed to run locally or deployed with zero mandatory external API keys for its core evaluation and demo workflows.

## Quick Start (Zero Credentials Required)

To evaluate Mirrorline locally:

```bash
# 1. Clone repository
git clone <repo-url>
cd mirrorline

# 2. Install dependencies
pnpm install

# 3. Copy example environment
cp .env.example .env.local

# 4. Start development server
pnpm dev
```

The app will start on [http://localhost:43123](http://localhost:43123).

## Environment Variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `NODE_ENV` | No | `development` | Node runtime environment |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:43123` | Canonical app URL for origin references |
| `BITGET_BASE_URL` | No | `https://api.bitget.com` | Base URL for public and authenticated Bitget UTA REST calls |
| `BITGET_TIMEOUT_MS` | No | `10000` | HTTP timeout (in milliseconds) for Bitget upstream requests |
| `BITGET_API_KEY` | Optional | `""` | Bitget API key (server-side only; needed only for whitelist-gated Reality depth) |
| `BITGET_API_SECRET` | Optional | `""` | Bitget API secret (server-side only) |
| `BITGET_PASSPHRASE` | Optional | `""` | Bitget API passphrase (server-side only) |

## Feature Matrix by Credential Level

| Feature | No Keys (Demo Mode) | No Keys (Live Mode) | With Bitget API Keys |
| --- | :---: | :---: | :---: |
| **Reproducible Demo Mode** (`rAAPL`, `rNVDA`, `rTSLA`) | **Full** | **Full** | **Full** |
| **First-Time Orientation & Judge Guide** | **Full** | **Full** | **Full** |
| **Live Instrument Discovery** (`GET /api/v3/market/instruments`) | — | **Full** | **Full** |
| **Live Ticker & 24h Change** (`GET /api/v3/market/tickers`) | — | **Full** | **Full** |
| **Live Kline/Candlestick History** (`GET /api/v3/market/candles`) | — | **Full** | **Full** |
| **Live Session & Calendar Normalization** | — | **Full** | **Full** |
| **Live Public Order Book (UTA top 15)** | — | **Full** | **Full** |
| **Evidence Pack Generation & Classification** | **Full** | **Full** | **Full** |
| **Investigation Brief & Tension Analysis** | **Full** | **Full** | **Full** |
| **Structured Claim Composer & Scoring** | **Full** | **Full** | **Full** |
| **Thesis Revision Loop & Diff Tracking** | **Full** | **Full** | **Full** |
| **Single-Symbol Investigation Report Export** | **Full** | **Full** | **Full** |
| **Multi-Symbol Comparison Desk & Export** | **Full** | **Full** | **Full** |
| **Reality 40-level Book Depth** | Unavailable | Unavailable | Whitelist-gated by Bitget BD |
| **Reality Platform Fills** | Unavailable | Unavailable | Whitelist-gated by Bitget BD |

## Security & Trust Safeguards

1. **No Frontend Exposure**: Bitget credentials (`BITGET_API_KEY`, `BITGET_API_SECRET`, `BITGET_PASSPHRASE`) are strictly server-side environment variables. None are prefixed with `NEXT_PUBLIC_` and none are ever transmitted to the client.
2. **JSON Redaction**: Serializers actively scan and redact sensitive keys (`apiKey`, `secret`, `passphrase`, `token`, `password`, `auth`) before returning API responses or exporting reports.
3. **HTML Sanitization**: All user-supplied text (claims, reasons, free-text hypotheses) is strictly escaped before rendering HTML reports or comparison exports.
4. **No LLM or Remote Execution**: No external LLM API keys (OpenAI, Anthropic, etc.) are needed or invoked. All evidence parsing and scoring is 100% deterministic, transparent, and auditable.
