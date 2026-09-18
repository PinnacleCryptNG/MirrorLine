# Mirrorline Architecture

Mirrorline is an evidence-first, non-advisory AI trading desk purpose-built for stress-testing trader decisions in 24/7 Bitget Reality rToken markets.

```
Browser (Next.js Client Components)
  ├── components/data-foundation-desk.tsx (Master Desk Controller)
  ├── components/first-time-orientation.tsx (Judge Guide & Evidence Principles)
  ├── components/structured-claim-composer.tsx (Formal Claim Builder)
  ├── components/interpretation-challenge-panel.tsx (Deterministic Scoring & Revision Loop)
  ├── components/multi-symbol-comparison-panel.tsx (Independent Column Comparison)
  └── components/investigation-report-panel.tsx (Audit Export: MD, JSON, HTML, Print)
        │
        ▼ (HTTP REST API Routes in app/api/market)
  ┌───────────────────────────────────────────────┬───────────────────────────────────────────────┐
  │ DEMO FIXTURE ROUTE DOMAIN (Isolated / Frozen) │ LIVE BITGET DATA ROUTE DOMAIN (Real-time UTA) │
  │ • /api/market/demo/scenarios                  │ • /api/market/verify                          │
  │ • /api/market/demo/snapshot/[symbol]          │ • /api/market/snapshot/[symbol]               │
  │   └── lib/fixtures/                           │ • /api/market/instruments                     │
  │       (rAAPL, rNVDA, rTSLA deterministic data)│ • /api/market/tickers/[symbol]                │
  │                                               │ • /api/market/candles                         │
  │                                               │ • /api/market/session                         │
  │                                               │ • /api/market/orderbook/[symbol]              │
  └───────────────────────┬───────────────────────┴───────────────────────┬───────────────────────┘
                          │                                               │
                          ▼                                               ▼
              lib/market/normalize.ts                        lib/bitget/ (Isolated Client)
              (Labels Observed, Derived, Unavailable)        (Direct HTTP to https://api.bitget.com)
                          │
                          ▼
              lib/evidence/pack.ts
              (Classifies FACT, INFERENCE, ASSUMPTION, UNKNOWN)
                          │
                          ▼
              lib/brief/generate.ts
              (Composes Non-Advisory Brief & Surfaces Structural Tensions)
                          │
                          ▼
              lib/challenge/engine.ts + lib/composer/
              (Scores Claims: supported, challenged, unsupported, unassessed)
                          │
                          ▼
              lib/revision/diff.ts
              (Tracks Thesis Evolution Across Edits)
                          │
                          ▼
              lib/compare/ & lib/report/
              (Assembles Independent Exports with Frozen vs Live Timestamp Integrity)
```

## Architectural Design Principles

1. **Evidence-First, Non-Advisory Guarantee**
   - Mirrorline **never** issues buy/sell recommendations, forecasts target prices, or computes trade sizing.
   - A `supported` claim means only that the assertion matches the loaded evidence snapshot — **not** that it is a profitable trade thesis.

2. **Strict Mode Isolation**
   - **Demo Mode**: Serviced by `/api/market/demo/*` with frozen snapshots in `lib/fixtures/`. Demo mode **never** falls back to live Bitget APIs. If an unsupported symbol is requested, an explicit `404 DEMO_FIXTURE_NOT_FOUND` error is returned.
   - **Live Mode**: Directly queries public Bitget UTA REST endpoints via `lib/bitget/`. Live mode **never** injects synthetic fixture data.

3. **Explicit Unknowns & No Data Fabrication**
   - Bitget public APIs do not provide a live underlying US equity tape or composite reference prices. Mirrorline labels `referencePrice` as `unavailable` / `unverified` and classifies it as `UNKNOWN`.
   - Missing data does **not** disprove a thesis. It is retained as `unsupported` or `UNKNOWN`, never synthesized.

4. **Snapshot Independence in Comparison**
   - In multi-symbol comparisons, each rToken retains its own snapshot ID, `retrievedAt` timestamp, and freshness state. Mirrorline never implies a shared observation time.

5. **Deterministic Auditability**
   - Every claim assessment, brief paragraph, and tension is linked back to explicit evidence IDs, source endpoints, fields, and observation timestamps.
