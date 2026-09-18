"use client";

import { STRUCTURED_KIND_DEFS, createStructuredClaim, kindDef, type StructuredClaimKind } from "@/lib/composer";
import type { StructuredClaim } from "@/lib/challenge/types";

export function StructuredClaimComposer({
  claims,
  onChange,
}: {
  claims: StructuredClaim[];
  onChange: (claims: StructuredClaim[]) => void;
}) {
  const add = (kind: StructuredClaimKind) => {
    onChange([...claims, createStructuredClaim(kind, claims.length)]);
  };

  const update = (index: number, next: StructuredClaim) => {
    onChange(claims.map((claim, item) => (item === index ? next : claim)));
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= claims.length) {
      return;
    }
    const copy = [...claims];
    const [row] = copy.splice(index, 1);
    copy.splice(target, 0, row);
    onChange(copy);
  };

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] px-4 py-3.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] font-mono">
          Structured Claim Builder
        </p>
        <span className="text-[11px] text-[var(--text-muted)]">
          {claims.length} claim{claims.length === 1 ? "" : "s"} added
        </span>
      </div>
      <p className="mt-1 text-xs text-[var(--text-muted)] leading-relaxed">
        Choose a claim type below and fill in your idea. Choosing a type tests it against the evidence pack—it does not automatically verify it.
      </p>
      
      <div className="mt-3 flex flex-wrap gap-1.5">
        {STRUCTURED_KIND_DEFS.map((def) => (
          <button
            key={def.kind}
            type="button"
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1 font-mono text-[11px] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors shadow-2xs"
            onClick={() => add(def.kind)}
          >
            + {def.label}
          </button>
        ))}
      </div>

      <ul className="mt-3.5 space-y-3">
        {claims.length === 0 ? (
          <li className="rounded-lg border border-dashed border-[var(--border)] p-4 text-center text-xs text-[var(--text-muted)]">
            No structured claims added yet. Click one of the buttons above to test price move, session, or spread.
          </li>
        ) : (
          claims.map((claim, index) => {
            const def = kindDef(claim.kind);
            return (
              <li key={claim.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2.5">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{def?.label ?? claim.kind}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      aria-label={`Move ${def?.label ?? claim.kind} claim up`}
                      disabled={index === 0}
                      className="font-mono text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30"
                      onClick={() => move(index, -1)}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${def?.label ?? claim.kind} claim down`}
                      disabled={index === claims.length - 1}
                      className="font-mono text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30"
                      onClick={() => move(index, 1)}
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${def?.label ?? claim.kind} claim`}
                      className="font-mono text-[11px] text-[var(--negative)] hover:underline"
                      onClick={() => onChange(claims.filter((_, item) => item !== index))}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-[var(--text-muted)]">{def?.limitation}</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {(def?.fields ?? []).map((field) => (
                    <label key={field.key} className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-[var(--text-secondary)] font-mono">
                      {field.label}
                      {field.input === "select" ? (
                        <select
                          value={claim.fields[field.key] ?? field.options?.[0] ?? ""}
                          onChange={(event) =>
                            update(index, {
                              ...claim,
                              fields: { ...claim.fields, [field.key]: event.target.value },
                            })
                          }
                          className="h-9 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                        >
                          {(field.options ?? []).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={claim.fields[field.key] ?? ""}
                          onChange={(event) =>
                            update(index, {
                              ...claim,
                              fields: { ...claim.fields, [field.key]: event.target.value },
                            })
                          }
                          className="h-9 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                        />
                      )}
                      <span className="normal-case tracking-normal text-[10px] text-[var(--text-muted)]">{field.note}</span>
                    </label>
                  ))}
                </div>
                <label className="mt-3 flex flex-col gap-1 text-[11px] uppercase tracking-wide text-[var(--text-secondary)] font-mono">
                  Optional explanation
                  <input
                    value={claim.explanation ?? ""}
                    onChange={(event) => update(index, { ...claim, explanation: event.target.value })}
                    className="h-9 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                    placeholder="Why you believe this"
                  />
                </label>
                <label className="mt-3 flex flex-col gap-1 text-[11px] uppercase tracking-wide text-[var(--text-secondary)] font-mono">
                  Optional assumption
                  <input
                    value={claim.assumptions?.[0] ?? ""}
                    onChange={(event) =>
                      update(index, {
                        ...claim,
                        assumptions: event.target.value.trim() ? [event.target.value.trim()] : undefined,
                      })
                    }
                    className="h-9 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                    placeholder="What you are taking as given without direct verification"
                  />
                </label>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
