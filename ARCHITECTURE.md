# Architecture

Milestone 6 sits on the Milestone 5 interpretation challenge. The revision loop does not call Bitget, does not reclassify evidence, and does not use an LLM. It diffs two challenges with a published claim-matching strategy.

```
Browser
  → Next.js route handlers in app/api/market
    → lib/revision (thesis revision loop)
      → lib/challenge (interpretation challenge)
        → lib/brief (investigation brief, tensions)
          → lib/evidence (FACT / INFERENCE / ASSUMPTION / UNKNOWN pack)
            → lib/market
              → lib/bitget
                → https://api.bitget.com
```

No Bitget credentials or raw provider calls are exposed to the client. Trading endpoints are not implemented. Revisions are deterministic (no LLM) and are not a multi-agent pipeline. History is session-only; there is no database.

## Layout

- `lib/bitget/` — typed Bitget Reality client (Milestone 1)
- `lib/market/` — labeled market context (Milestone 2)
- `lib/evidence/` — classified evidence pack (Milestone 3)
- `lib/brief/` — investigation brief (Milestone 4)
- `lib/challenge/` — interpretation challenge (Milestone 5)
- `lib/revision/types.ts` — revision record and claim-change schema
- `lib/revision/claims.ts` — fingerprints, units, snapshot ids
- `lib/revision/match.ts` — exact fingerprint → containment → Jaccard → Levenshtein
- `lib/revision/diff.ts` — pack-free previous/current challenge diff
- `lib/revision/get-revision.ts` — optional live re-challenge, then diff
- `app/api/market/revision/[symbol]/route.ts` — HTTP surface

The desk prefers the same loaded evidence pack for before/after. If Bitget data is refreshed, the next revision is marked `snapshotChanged` and status shifts are not attributed to the thesis edit alone.

## Claim matching (transparent)

1. Exact normalized fingerprint and same source
2. Token containment (smaller set ⊆ larger, at least 2 tokens)
3. Token Jaccard ≥ 0.55
4. Levenshtein ratio ≥ 0.72
5. Otherwise added / removed — never a silent rewrite

A status change is not a score. UNKNOWN is never treated as proof the thesis is false.
