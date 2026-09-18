# Architecture

Milestone 11 introduces **Hackathon Demo Readiness & Reproducible Demo Mode**, adding deterministic fixture scenarios, first-time user orientation, and unmistakable demo labeling while keeping live Bitget mode completely isolated.

```
Browser
  → Next.js route handlers in app/api/market
    ├── /api/market/demo/* (deterministic fixtures)
    │     → lib/fixtures (frozen scenarios: rAAPL, rNVDA, rTSLA)
    │         → lib/market/normalize (with isDemoFixture: true)
    │             → lib/evidence (labeled packs)
    │                 → lib/brief (labeled briefs)
    └── /api/market/* (live data)
          → lib/compare (multi-symbol comparison)
            → lib/report (per-symbol report assembly + sanitization)
            → lib/composer (shared structured claims)
            → lib/challenge
              → lib/brief
                → lib/evidence
                  → lib/market
                    → lib/bitget
                      → https://api.bitget.com
```

Snapshot loads stay explicit user actions. Demo mode does not query Bitget or fall back to live data. Live mode never silently substitutes fixtures.

## Layout

- `lib/fixtures/types.ts` — DemoScenario, DemoScenarioSummary, and DemoRecommendedClaim models
- `lib/fixtures/scenarios.ts` — Deterministic scenario definitions with frozen timestamps and preserved stale/failure states:
  - `rAAPL`: Thursday regular session downside (-0.43%), tight spread, fresh ticker (3s old).
  - `rNVDA`: Thursday overnight session upside (+1.20%), wider spread, session divergence tension against closed US equity.
  - `rTSLA`: Saturday weekend session, stale ticker (48s old vs 15s limit), and partial book failure resilience.
- `lib/fixtures/index.ts` — Scenario catalog matching, snapshot generation, and supported demo symbols.
- `app/api/market/demo/scenarios/route.ts` — GET catalog route.
- `app/api/market/demo/snapshot/[symbol]/route.ts` — GET deterministic frozen snapshot route (404 with no fallback for unmapped symbols).
- `components/first-time-orientation.tsx` — Product-specific orientation card explaining what Mirrorline does and deliberately does not do, evidence classifications (**FACT**, **INFERENCE**, **ASSUMPTION**, **UNKNOWN**), and assessment statuses (supported by evidence only, not proof of a profitable trading outcome).
- `lib/report/` & `lib/compare/` — HTML, Markdown, and JSON serializers with prominent `DEMO / FIXTURE DATA` banners and disclaimers when `isDemoFixture: true`.
- `components/multi-symbol-comparison-panel.tsx` — Multi-symbol comparison desk with fixture mode toggle, 1-click demo pair loader (`rAAPL vs rNVDA`), per-column fixture tags, and live claim recomputation.
