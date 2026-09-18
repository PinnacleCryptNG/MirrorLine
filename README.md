# Mirrorline

**Evidence-First AI Trading Desk for 24/7 Bitget Reality rToken Markets**  
*Bitget AI Hackathon Genesis Season 2 Submission*

Mirrorline is an evidence-first, non-advisory AI trading desk purpose-built to stress-test trader interpretations against empirical market evidence. It evaluates claims against real-time Bitget UTA data or deterministic demo fixtures without generating buy/sell advice, predicting price targets, executing orders, or fabricating missing tape data.

---

## The Problem: The 24/7 RWA Reality Gap

Bitget Reality rTokens allow global traders to trade equity-backed synthetic tokens 24/7, including when underlying US equity exchanges are closed. This creates severe structural hazards:

1. **Session Divergence**: Token prices can decouple or drift during overnight and weekend hours while the underlying US market is shut. Traders often mistake overnight liquidity movements for true underlying price discovery.
2. **Illusion of Completeness**: Public exchange APIs lack live US consolidated exchange tape, company earnings news, or deep institutional books. AI agents frequently hallucinate missing reference prices or treat absences as bearish signals.
3. **Advisory Fallacy**: Conventional AI trading bots offer unverified buy/sell recommendations with black-box confidence scores, encouraging overleveraged trades without showing the provenance of their underlying assumptions.

### Mirrorline's Solution

Mirrorline acts as an **auditable defense layer**:
- **Stress-Tests Hypotheses**: Evaluates trader interpretations against loaded Bitget context.
- **Classifies All Information**: Separates direct **FACT**s from formulaic **INFERENCE**s, convention **ASSUMPTION**s, and explicit **UNKNOWN**s.
- **Surfaces Structural Tensions**: Exposes session misalignments, wide off-hours spreads, and stale quotes.
- **Strictly Non-Advisory**: Does not predict prices, pick winners, or execute trades. A `supported` claim means it aligns with loaded evidence — not that it will be profitable.

---

## 3–5 Minute Judge Walkthrough (Zero Credentials Required)

To evaluate Mirrorline immediately without API keys or live market movements:

1. **Launch the Desk**:
   ```bash
   pnpm install && cp .env.example .env.local && pnpm dev
   ```
   Open [http://localhost:43123](http://localhost:43123) in your browser.

2. **Step A: Activate Demo Fixture Mode & Load Scenario**
   - Click **`Try Demo Fixture (rAAPL Down)`** from the initial ready state, or switch to **`◆ Demo Fixture Mode`** in the header. You can also open **`? How it works`** to review principles and evaluator walkthrough steps anytime.
   - *Observation*: Notice the unmistakable amber **`DEMO / FIXTURE DATA`** banner, frozen timestamp (`2026-09-17T15:00:00.000Z`), and ticker stat cards.

3. **Step B: Inspect Evidence Classification & Structural Tensions**
   - In the **Overview & Brief** tab, examine key structural tensions and evidence breakdown pills.
   - Expand **Technical Auditability** to inspect raw Bitget fields, endpoints, and freshness.
   - *Observation*: Notice the breakdown of evidence:
     - **FACT**: 24h change (-0.43%), last price ($332.90), ticker observed 3s before snapshot.
     - **INFERENCE**: Derived session (`US_REGULAR`), tight bid-ask spread (2.4 bps).
     - **ASSUMPTION**: Underlying mapping convention (`rAAPL` → Apple Inc.).
     - **UNKNOWN**: Live US reference tape is explicitly unavailable (no Bitget US tape feed).

4. **Step C: Compose & Challenge a Structured Claim**
   - In the **Structured Claim Composer**, select:
     - Kind: `24h price change`
     - Direction: `down`
   - Click **`Run challenge`**.
   - *Observation*: Claim is scored as **`supported`** because the 24h change is negative (-0.43%).

5. **Step D: Revise the Claim and Inspect Thesis Evolution**
   - Change Direction from `down` to `up`.
   - Click **`Revise and re-challenge`**.
   - *Observation*: The assessment switches to **`challenged`** (contradicted by ticker data). The **Thesis Revision History** panel displays the before/after status diff and text change.

6. **Step E: Multi-Symbol Side-by-Side Comparison**
   - Scroll to the **Multi-Symbol Comparison Desk**.
   - Click **`Load Demo Comparison (rAAPL vs rNVDA)`**.
   - *Observation*: Both symbols load side-by-side with independent timestamps (`rAAPL` at regular hours, `rNVDA` overnight). The same claims are scored independently per column:
     - 24h change `down`: **supported** on rAAPL, **challenged** on rNVDA (+1.20%).
     - Session `regular`: **supported** on rAAPL, **challenged** on rNVDA (`US_CLOSED`).
     - Reference tape `divergence`: **unsupported** on both (remains UNKNOWN, not false).

7. **Step F: Export Non-Advisory Audit Report**
   - In either the single-symbol or comparison panel, click **`Preview report`** or export to **Markdown**, **JSON**, or **HTML**.
   - *Observation*: The report contains a clear **`DEMO / FIXTURE DATA`** watermark, non-advisory disclaimers (`advisory: false`), preserved scenario timestamps, and zero secret leakage.

---

## Reproducible Demo Scenarios

Mirrorline ships with three deterministic scenarios in `lib/fixtures/scenarios.ts`:

| Scenario ID | Symbol | Market Session | 24h Change | Key Testing Surface |
| --- | --- | --- | --- | --- |
| `scenario-raapl-session-down` | **rAAPL** | `US_REGULAR` | -0.43% | Regular trading hours, tight spread (2.4 bps), supported downside claim |
| `scenario-rnvda-overnight-up` | **rNVDA** | `US_CLOSED` (Overnight) | +1.20% | Overnight session divergence tension against closed underlying US equity |
| `scenario-rtsla-weekend-stale` | **rTSLA** | `WEEKEND` | +0.35% | 24/7 weekend token tradability, stale ticker flag (>15s), partial book failure |

**Isolation Guarantee**: Requesting an unmapped symbol in Demo Mode returns `404 DEMO_FIXTURE_NOT_FOUND` and never silently falls back to live data.

---

## Clean Launch & Setup

### Requirements
- **Node.js**: v20 or higher
- **pnpm**: v9 or higher

### Commands
```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env.local

# 3. Start development server
pnpm dev
# App listens at http://localhost:43123

# 4. Production build
pnpm build
pnpm start
```

### Environment Configuration

Public Bitget market data and Demo Mode require **0 credentials**. Optional keys are only used for whitelist-gated Reality depth:

```bash
# Optional (server-side only; never exposed to browser)
BITGET_API_KEY=
BITGET_API_SECRET=
BITGET_PASSPHRASE=

# Optional tuning
BITGET_TIMEOUT_MS=10000
BITGET_BASE_URL=https://api.bitget.com
NEXT_PUBLIC_APP_URL=http://localhost:43123
```

---

## Architecture & API Routes

### System Overview
- **Data Layer (`lib/bitget/`)**: Isolated Bitget UTA REST client for tickers, candles, sessions, and order books.
- **Normalization Layer (`lib/market/`)**: Labels every field as observed, derived, or unavailable. Preserves stale flags and resource failures.
- **Evidence Layer (`lib/evidence/`)**: Categorizes items into `FACT`, `INFERENCE`, `ASSUMPTION`, and `UNKNOWN`.
- **Brief Layer (`lib/brief/`)**: Compiles executive summaries, session tensions, and unanswered questions without LLM calls.
- **Challenge & Revision Engine (`lib/challenge/`, `lib/composer/`, `lib/revision/`)**: Deterministically assesses structured claims and tracks diffs across edits.
- **Comparison & Reporting (`lib/compare/`, `lib/report/`)**: Formats independent snapshots into Markdown, JSON, and print-ready HTML exports.

### API Routes

#### Demo Fixture Endpoints
- `GET /api/market/demo/scenarios` — Catalog of deterministic demo scenarios.
- `GET /api/market/demo/snapshot/[symbol]` — Deterministic frozen snapshot (`rAAPL`, `rNVDA`, `rTSLA`).

#### Live Bitget Endpoints
- `GET /api/market/verify?symbol=rAAPL` — Live Bitget API health check and endpoint audit.
- `GET /api/market/instruments?query=nvda&limit=20` — Discovers active Reality rTokens.
- `GET /api/market/tickers/[symbol]` — Live 24h ticker, price, and volume.
- `GET /api/market/candles?symbol=rAAPL&interval=1H&limit=48` — Market candlestick bars.
- `GET /api/market/session?symbol=rAAPL&company=true` — Bitget session windows and company info.
- `GET /api/market/snapshot/[symbol]` — Full raw and normalized live snapshot.
- `GET /api/market/evidence/[symbol]` — Classified evidence pack.
- `GET /api/market/brief/[symbol]` — Non-advisory investigation brief.
- `POST /api/market/challenge/[symbol]` — Deterministic interpretation challenge.
- `POST /api/market/revision/[symbol]` — Thesis revision diff analysis.
- `POST /api/market/composer/[symbol]` — Structured claim composer and challenge.
- `POST /api/market/report/[symbol]` — Assembles single-symbol report from loaded models.
- `POST /api/market/compare/report` — Assembles multi-symbol comparison report from loaded models.

---

## Verification & Testing Suite

Run the full verification suite with a single command:

```bash
# Run unit & integration tests (18 files, 125 tests)
pnpm test

# TypeScript strict type checking
pnpm exec tsc --noEmit

# ESLint code style and quality check
pnpm lint

# Live Bitget API verification audit
pnpm verify:bitget

# Browser QA automated walkthrough
node scripts/milestone11-walkthrough.mjs
```

---

## Security, Privacy, and Trust Safeguards

1. **Strictly Non-Advisory**: Every report, screen, and serializer explicitly embeds `advisory: false` and disclaimer notices.
2. **Credential Redaction**: Serializers inspect and redact any sensitive keys (`apiKey`, `secret`, `passphrase`, `token`) prior to export.
3. **HTML Sanitization**: All user-authored thesis inputs are escaped to prevent XSS.
4. **No Hidden Refreshes**: Report export functions assemble only in-memory, loaded snapshots. They never make background network calls.
5. **Timestamp Fidelity**: Each column in a multi-symbol comparison retains its own retrieval time. No shared observation time is fabricated.

---

## Known Limitations

- **No Live US Composite Tape**: Bitget does not provide consolidated US equity exchange data. Reference price and divergence remain classified as `UNKNOWN`.
- **Reality 40-level Book Depth**: Reality depth is whitelist-gated by Bitget BD; public UTA book depth is labeled as top-15 public order book.
- **Rule-Based Claim Matching**: Unmapped natural language statements are marked `unassessed`, not false.
- **Zero Execution**: No order placement, wallet keys, automated rebalancing, or trade execution.
