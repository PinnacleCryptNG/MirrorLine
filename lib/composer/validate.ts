import type { StructuredClaim } from "@/lib/challenge/types";
import { STRUCTURED_CLAIM_KINDS, kindDef, type StructuredClaimKind } from "./schema";

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function createStructuredClaim(
  kind: StructuredClaimKind,
  index: number,
  createdAt = new Date().toISOString(),
): StructuredClaim {
  const def = kindDef(kind);
  const fields: Record<string, string> = {};
  for (const field of def?.fields ?? []) {
    fields[field.key] = field.options?.[0] ?? "";
  }
  return {
    id: `sc.${kind}.${index}.${createdAt.replace(/[:.]/g, "")}`,
    kind,
    fields,
    createdAt,
    source: "composer",
  };
}

export function validateStructuredClaim(raw: unknown, index = 0): StructuredClaim {
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`Structured claim ${index + 1} must be an object.`);
  }
  const record = raw as Record<string, unknown>;
  const kind = asString(record.kind);
  if (!STRUCTURED_CLAIM_KINDS.includes(kind as StructuredClaimKind)) {
    throw new Error(`Structured claim ${index + 1} has unknown kind '${kind || "(empty)"}'.`);
  }
  const def = kindDef(kind);
  if (!def) {
    throw new Error(`Structured claim ${index + 1} has unknown kind '${kind}'.`);
  }
  const incoming = record.fields && typeof record.fields === "object" ? (record.fields as Record<string, unknown>) : {};
  const fields: Record<string, string> = {};
  for (const field of def.fields) {
    const value = asString(incoming[field.key]);
    if (field.required && !value) {
      throw new Error(`${def.label}: ${field.label} is required.`);
    }
    if (field.options && value && !field.options.includes(value)) {
      throw new Error(`${def.label}: '${value}' is not permitted for ${field.label}.`);
    }
    if (value) {
      fields[field.key] = value;
    }
  }
  const id = asString(record.id) || `sc.${kind}.${index}`;
  const explanation = asString(record.explanation) || undefined;
  const assumptions = Array.isArray(record.assumptions)
    ? record.assumptions.map((item) => asString(item)).filter(Boolean).slice(0, 8)
    : undefined;
  const createdAt = asString(record.createdAt) || new Date().toISOString();
  const source = record.source === "imported-freetext" ? "imported-freetext" : "composer";
  return {
    id,
    kind,
    fields,
    explanation,
    assumptions: assumptions && assumptions.length > 0 ? assumptions : undefined,
    createdAt,
    source,
  };
}

export function parseComposerInput(raw: unknown): {
  claims: StructuredClaim[];
  freeText?: string;
  reason?: string;
  assumptions?: string[];
} {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Composer input must be an object.");
  }
  const record = raw as Record<string, unknown>;
  const claimsRaw = Array.isArray(record.claims) ? record.claims : [];
  const claims = claimsRaw.map((item, index) => validateStructuredClaim(item, index));
  const freeText = asString(record.freeText) || asString(record.thesis) || undefined;
  const reason = asString(record.reason) || undefined;
  const assumptions = Array.isArray(record.assumptions)
    ? record.assumptions.map((item) => asString(item)).filter(Boolean)
    : asString(record.assumptions)
      ? [asString(record.assumptions)]
      : undefined;
  if (claims.length === 0 && !freeText) {
    throw new Error("Add at least one structured claim or optional free-text thesis.");
  }
  if (claims.length > 20) {
    throw new Error("A composer challenge is limited to 20 structured claims.");
  }
  return {
    claims,
    freeText,
    reason,
    assumptions: assumptions && assumptions.length > 0 ? assumptions : undefined,
  };
}
