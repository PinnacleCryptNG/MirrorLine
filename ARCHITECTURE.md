# Architecture

Milestone 7 sits on the Milestone 5 challenge engine and Milestone 6 revision loop. The composer does not call Bitget and does not invent evidence. It turns explicit claim kinds into sentences the existing engine can score, then applies timeframe and data-limitation guards.

```
Browser
  → Next.js route handlers in app/api/market
    → lib/composer (structured claim composer)
      → lib/revision (thesis revision loop)
      → lib/challenge (interpretation challenge)
        → lib/brief
          → lib/evidence
            → lib/market
              → lib/bitget
                → https://api.bitget.com
```

Selecting a structured kind does not verify the claim. Optional free text is kept as written.

## Layout

- `lib/composer/schema.ts` — kinds, permitted fields, limitations
- `lib/composer/validate.ts` — parse/validate structured input
- `lib/composer/render.ts` — kind + fields → engine sentence
- `lib/composer/challenge.ts` — engine call + guards
- `app/api/market/composer/[symbol]/route.ts` — HTTP surface
- `components/structured-claim-composer.tsx` — desk composer

Revision identity prefers a structured claim id when present, then the Milestone 6 fingerprint strategy. Same-snapshot attribution rules are unchanged. Optional free text is stored on `challenge.composer.freeText` and is not rewritten into structured rows.
