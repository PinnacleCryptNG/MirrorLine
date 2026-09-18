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

## Interpretation challenge (Milestone 5)

`lib/challenge/engine.ts` turns a trader thesis plus the existing pack and brief into a non-advisory challenge. It does not call Bitget or an LLM.

Claims are split into sentences and matched with exported `CLAIM_RULES` (direction, last price, US session, causation, news, tape, liquidity, Reality depth, freshness, trade action, named underlying). Unmapped language is **unassessed**, not false. Missing evidence is **unsupported**, not disproof. Attack points only restate pack evidence and brief tensions.

`POST /api/market/challenge/{symbol}` accepts `{ thesis, reason?, assumptions? }`.

## Thesis revision loop (Milestone 6)

`lib/revision/diff.ts` compares two interpretation challenges. It does not call Bitget or an LLM.

Claim identity uses exported thresholds: exact fingerprint, token containment, Jaccard ≥ 0.55, then Levenshtein ratio ≥ 0.72. Reordered claims keep identity. A status change on a new evidence snapshot is not attributed to the thesis edit. A status change is not a grade.

`POST /api/market/revision/{symbol}` accepts `{ previous, thesis?, reason?, assumptions?, current?, sequence? }`. When `current` is omitted, a new challenge is gathered and then diffed (snapshot will usually change). The desk diffs against the already-loaded pack so comparisons stay on the same snapshot until the trader refreshes live data.

## Structured claim composer (Milestone 7)

`lib/composer/` turns explicit claim kinds and fields into sentences the existing challenge engine can score. It does not call Bitget or an LLM. Selecting a kind does not make the assertion a verified fact.

Direction with an intraday or unspecified timeframe is **unassessed**, not scored against 24-hour change. Reference price, news, and Reality 40-level depth stay **unsupported** when those items are UNKNOWN — not false.

`POST /api/market/composer/{symbol}` accepts `{ claims, freeText?, reason?, assumptions? }`. Optional free text is kept as written. Revision identity prefers a structured claim id, then the Milestone 6 fingerprint strategy.

## Investigation report export (Milestone 8)

`lib/report/assemble.ts` packages the currently loaded evidence pack, brief, challenge, and revision trail. It does not call Bitget or an LLM.

Report creation time is stored separately from evidence `retrievedAt` / `observedAt`. Stale pack items are labeled, not replaced. UNKNOWN remains unanswered. Export does not invent US tape, news, liquidity, or Reality depth.

`POST /api/market/report/{symbol}?format=json|markdown|html` accepts `{ pack, brief, challenge?, revisions?, context?, question?, createdAt? }`. Omitting the loaded pack is a 400, not a live refresh.

## Multi-symbol comparison (Milestone 9)

`lib/compare/` scores the same structured claims against each selected rToken's own loaded pack and brief. It does not call Bitget during export and does not invent a shared observation time.

A supported cell on one symbol does not support another. Failed snapshots stay unavailable for that column. The comparison is not a ranking.

`POST /api/market/compare/report?format=json|markdown|html` accepts `{ symbols, claims, freeText? }`. Challenges are recomputed from the supplied packs, briefs, and shared claims. Client-supplied statuses are ignored.

## Intentionally not implemented

- Place/cancel Reality orders
- Order amendment or batch operations
- Frontend Bitget calls
- Fabricated reference prices, depth, news, or market status
