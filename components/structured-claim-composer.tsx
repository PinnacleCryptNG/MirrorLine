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
    <div className="rounded-md border border-[#252B36] bg-[#080A0F] px-3 py-3">
      <p className="text-xs uppercase tracking-wide text-[#626B7A]">Structured claims</p>
      <p className="mt-1 text-xs text-[#9BA3B2]">
        Pick a kind and fill permitted fields. Choosing a type does not verify the claim. Reference price, news, and
        Reality depth stay unanswered unless the pack actually has them.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {STRUCTURED_KIND_DEFS.map((def) => (
          <button
            key={def.kind}
            type="button"
            className="rounded-full border border-[#252B36] px-3 py-1 font-data text-[11px] text-[#9BA3B2] hover:border-[#8B7CFF] hover:text-[#8B7CFF]"
            onClick={() => add(def.kind)}
          >
            + {def.label}
          </button>
        ))}
      </div>
      <ul className="mt-3 space-y-3">
        {claims.length === 0 ? (
          <li className="text-sm text-[#9BA3B2]">No structured claims yet. Add one above, or use optional free text.</li>
        ) : (
          claims.map((claim, index) => {
            const def = kindDef(claim.kind);
            return (
              <li key={claim.id} className="rounded-lg border border-[#252B36] bg-[#10131A] px-3 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-[#F5F7FA]">{def?.label ?? claim.kind}</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="font-data text-[11px] text-[#9BA3B2]" onClick={() => move(index, -1)}>
                      Up
                    </button>
                    <button type="button" className="font-data text-[11px] text-[#9BA3B2]" onClick={() => move(index, 1)}>
                      Down
                    </button>
                    <button
                      type="button"
                      className="font-data text-[11px] text-[#FF6B7A]"
                      onClick={() => onChange(claims.filter((_, item) => item !== index))}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-xs text-[#9BA3B2]">{def?.limitation}</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {(def?.fields ?? []).map((field) => (
                    <label key={field.key} className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-[#626B7A]">
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
                          className="h-10 rounded-md border border-[#252B36] bg-[#080A0F] px-2 text-sm text-[#F5F7FA] outline-none focus:border-[#8B7CFF]"
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
                          className="h-10 rounded-md border border-[#252B36] bg-[#080A0F] px-3 text-sm text-[#F5F7FA] outline-none focus:border-[#8B7CFF]"
                        />
                      )}
                      <span className="normal-case tracking-normal text-[#626B7A]">{field.note}</span>
                    </label>
                  ))}
                </div>
                <label className="mt-3 flex flex-col gap-1 text-[11px] uppercase tracking-wide text-[#626B7A]">
                  Optional explanation
                  <input
                    value={claim.explanation ?? ""}
                    onChange={(event) => update(index, { ...claim, explanation: event.target.value })}
                    className="h-10 rounded-md border border-[#252B36] bg-[#080A0F] px-3 text-sm text-[#F5F7FA] outline-none focus:border-[#8B7CFF]"
                  />
                </label>
                <label className="mt-3 flex flex-col gap-1 text-[11px] uppercase tracking-wide text-[#626B7A]">
                  Optional assumption
                  <input
                    value={claim.assumptions?.[0] ?? ""}
                    onChange={(event) =>
                      update(index, {
                        ...claim,
                        assumptions: event.target.value.trim() ? [event.target.value.trim()] : undefined,
                      })
                    }
                    className="h-10 rounded-md border border-[#252B36] bg-[#080A0F] px-3 text-sm text-[#F5F7FA] outline-none focus:border-[#8B7CFF]"
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
