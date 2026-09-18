# Architecture

Milestone 8 sits on the completed investigation stack. The report assembler does not call Bitget and does not reinterpret evidence. It packages the currently loaded pack, brief, challenge, and revision trail, then serializes JSON, Markdown, and print-friendly HTML.

```
Browser
  → Next.js route handlers in app/api/market
    → lib/report (investigation report export)
      → lib/composer (structured claim composer)
      → lib/revision (thesis revision loop)
      → lib/challenge (interpretation challenge)
        → lib/brief
          → lib/evidence
            → lib/market
              → lib/bitget
                → https://api.bitget.com
```

Export never refreshes the snapshot. Report creation time is stored separately from Bitget observation timestamps.

## Layout

- `lib/report/types.ts` — InvestigationReport model and disclaimers
- `lib/report/assemble.ts` — deterministic assembly from loaded models
- `lib/report/markdown.ts` / `html.ts` / `json.ts` — serializers
- `app/api/market/report/[symbol]/route.ts` — POST-only export of posted models
- `components/investigation-report-panel.tsx` — desk preview and download/print controls
