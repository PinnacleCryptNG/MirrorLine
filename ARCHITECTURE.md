# Architecture

Milestone 9 sits on the investigation stack and Milestone 8 report assembly. Multi-symbol comparison does not call Bitget during export. It scores the same structured claims against each already-loaded pack and brief, then serializes JSON, Markdown, and print-friendly HTML.

```
Browser
  → Next.js route handlers in app/api/market
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

Snapshot loads (GET `/api/market/snapshot/{symbol}`) stay explicit user actions. Comparison export only accepts posted packs/briefs/claims.

## Layout

- `lib/compare/types.ts` — ComparisonReport model
- `lib/compare/symbols.ts` — normalize, duplicate, and bounds checks
- `lib/compare/score.ts` — shared claims → existing composer engine
- `lib/compare/table.ts` — claim rows × symbol columns
- `lib/compare/assemble.ts` — recomputes challenges; does not trust client statuses
- `app/api/market/compare/report/route.ts` — POST-only export
- `components/multi-symbol-comparison-panel.tsx` — desk UI
