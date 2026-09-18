# Bitget Reality integration

Official documentation used at implementation time:

- [Reality Trading Guide](https://www.bitget.com/api-doc/uta/reality/reality-trading-guide)
- [Get Instruments](https://www.bitget.com/api-doc/uta/public/Instruments)
- [Get Tickers](https://www.bitget.com/api-doc/uta/public/Tickers)
- [Get Kline/Candlestick](https://www.bitget.com/api-doc/uta/public/Get-Candle-Data)
- [Place Reality Order](https://www.bitget.com/api-doc/uta/trade/Place-Reality-Order) (not implemented; trading is out of scope)

Base URL: `https://api.bitget.com`

## Endpoints implemented

| Purpose | Method | Path | Auth | Status |
| --- | --- | --- | --- | --- |
| Discover instruments | GET | `/api/v3/market/instruments?category=SPOT` | Public | Implemented |
| Reality stock metadata | GET | `/api/v3/reality/market/stock-info` | Public | Implemented |
| Tickers | GET | `/api/v3/market/tickers?category=SPOT&symbol=` | Public | Implemented |
| Candles | GET | `/api/v3/market/candles?category=SPOT&symbol=&interval=&type=market` | Public | Implemented |
| Historical candles | GET | `/api/v3/market/history-candles` | Public | Implemented |
| Market session windows | GET | `/api/v3/reality/market/states` | Public | Implemented |
| Market calendar | GET | `/api/v3/reality/market/calendar` | Public | Implemented |
| Company overview | GET | `/api/v3/reality/market/company-overview?code=` | Public | Implemented |
| Public UTA order book | GET | `/api/v3/market/orderbook?category=SPOT&symbol=` | Public | Optional / labeled |
| Reality order book | GET | `/api/v3/account/reality-orderbook?symbol=` | API key + whitelist | Optional |
| Reality fills | GET | `/api/v3/account/reality-fills?symbol=` | API key + whitelist | Not called in MVP path |

## rToken identification

- Trading pair example: `RAAPLUSDT`
- Base coin example: `rAAPL`
- `isReality` is `yes` for Reality stock tokens
- `symbolType` is `stock` on observed Reality pairs

## Candle constraints from Bitget docs

- Type: `market` only
- Intervals: `1m`, `5m`, `15m`, `1H`, `4H`, `1D`
- Volume/turnover may be empty for candles before 2026-07-09

## Session mapping

Bitget `states` returns schedule windows, not a current-session flag. Mirrorline derives current session from:

1. `/api/v3/reality/market/calendar` weekend days and holiday windows
2. `/api/v3/reality/market/states` clock windows
3. Current time in `America/New_York`

Bitget currently labels those windows `EST` with `daylightType=standard` even in September. The raw payload is stored; derivation uses New York civil time because that is the US equity session clock.

## Market context (Milestone 2)

`lib/market/normalize.ts` turns a gathered Bitget snapshot into labeled fields:

| Field | Kind | Source |
| --- | --- | --- |
| last price, 24h change/volume, bid/ask, candle bars, session windows, stock-info code | observed | Bitget payloads |
| spread, mid, spread bps, current session, weekend flag, token window match | derived | formulas over observed fields |
| referencePrice, reference timestamp, divergence | unavailable / unverified | no US tape from Bitget |
| Reality 40-level book | unavailable unless whitelist keys work | not inferred from the public UTA book |

Ticker last prices older than 15s (vs source timestamp) are `stale`. Candle series older than 2× the requested interval are `stale`. Missing timestamps are `unknown`, not silently treated as fresh or stale.

## Investigation evidence pack (Milestone 3)

`lib/evidence/pack.ts` turns a `MarketContext` into classified evidence items:

- **FACT** — a Bitget field as returned (price, windows, candle OHLC)
- **INFERENCE** — a conclusion with supporting fact IDs (spread, current session, last bar close vs open)
- **ASSUMPTION** — a convention used only when Bitget omitted a verified field (underlying from pair name)
- **UNKNOWN** — an unanswered question (US tape, divergence, news, Reality 40-level depth, failed resources)

Each item carries source endpoint/field, timestamps, freshness, reasoning, and caveats. Confidence is omitted for UNKNOWN items.

## Investigation brief (Milestone 4)

`lib/brief/generate.ts` turns an `EvidencePack` into a non-advisory brief. It does not call Bitget or an LLM.

Tensions cite evidence IDs. Overnight rToken quoting versus a closed US equity session is a **tension** (interpretation risk), not a contradiction. A contradiction is reserved for actual field conflicts such as bid above ask.

UNKNOWN remains an unanswered question, not a negative finding.

## Intentionally not implemented

- Place/cancel Reality orders
- Order amendment or batch operations
- Frontend Bitget calls
- Fabricated reference prices, depth, news, or market status
