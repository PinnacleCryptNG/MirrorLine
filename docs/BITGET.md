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

## Intentionally not implemented

- Place/cancel Reality orders
- Order amendment or batch operations
- Frontend Bitget calls
- Fabricated reference prices, depth, news, or market status
