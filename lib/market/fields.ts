import { classifyFreshness, freshnessSeconds, type FreshnessClass } from "./freshness";

export type FieldKind = "observed" | "derived" | "unavailable";
export type FieldStatus = "ok" | "stale" | "missing" | "error" | "unverified" | "unknown";
export type EvidenceClass = "FACT" | "INFERENCE" | "ASSUMPTION" | "UNKNOWN";

export interface ContextField<T> {
  kind: FieldKind;
  status: FieldStatus;
  evidence: EvidenceClass;
  value: T | null;
  unit?: string;
  source?: string;
  endpoint?: string;
  observedAt?: string;
  retrievedAt?: string;
  freshnessSeconds?: number | null;
  formula?: string;
  note?: string;
}

export interface FieldMeta {
  source?: string;
  endpoint?: string;
  observedAt?: string;
  observedAtMs?: number;
  retrievedAt?: string;
  retrievedAtDate?: Date;
  staleAfterSeconds?: number;
  unit?: string;
  formula?: string;
  note?: string;
  error?: string;
  assumption?: boolean;
  allowNull?: boolean;
}

export interface FieldCoverage {
  observed: number;
  derived: number;
  unavailable: number;
  ok: number;
  stale: number;
  missing: number;
  error: number;
  unverified: number;
  unknown: number;
}

function statusFromFreshness(freshness: FreshnessClass): FieldStatus {
  if (freshness === "stale") {
    return "stale";
  }
  if (freshness === "unknown") {
    return "unknown";
  }
  return "ok";
}

export function evidenceFor(
  kind: FieldKind,
  status: FieldStatus,
  assumption?: boolean,
): EvidenceClass {
  if (kind === "unavailable" || status === "missing" || status === "error") {
    return "UNKNOWN";
  }
  if (assumption) {
    return "ASSUMPTION";
  }
  if (kind === "observed") {
    return "FACT";
  }
  if (kind === "derived") {
    return "INFERENCE";
  }
  return "UNKNOWN";
}

function retrievedIso(meta: FieldMeta, fallback = true): string | undefined {
  if (meta.retrievedAt) {
    return meta.retrievedAt;
  }
  if (meta.retrievedAtDate) {
    return meta.retrievedAtDate.toISOString();
  }
  return fallback ? new Date().toISOString() : undefined;
}

function reasonNote(meta: FieldMeta): string {
  return meta.error ?? meta.note ?? "This value could not be derived from available Bitget fields.";
}

export function observedField<T>(
  value: T | null | undefined,
  meta: FieldMeta = {},
): ContextField<T> {
  const retrievedAtDate = meta.retrievedAtDate ?? (meta.retrievedAt ? new Date(meta.retrievedAt) : new Date());
  const retrievedAt = meta.retrievedAt ?? retrievedAtDate.toISOString();
  const missing = meta.allowNull
    ? value === undefined
    : value === null || value === undefined || value === "";
  if (missing) {
    const status: FieldStatus = meta.error ? "error" : "missing";
    return {
      kind: "unavailable",
      status,
      evidence: "UNKNOWN",
      value: null,
      source: meta.source,
      endpoint: meta.endpoint,
      retrievedAt,
      note: meta.error ?? meta.note ?? "Bitget did not return this field.",
    };
  }

  const age = freshnessSeconds(meta.observedAtMs, retrievedAtDate);
  const freshness = meta.staleAfterSeconds
    ? classifyFreshness(age, meta.staleAfterSeconds)
    : "fresh";
  const status = statusFromFreshness(freshness);

  return {
    kind: "observed",
    status,
    evidence: evidenceFor("observed", status, meta.assumption),
    value: value as T,
    unit: meta.unit,
    source: meta.source ?? "bitget",
    endpoint: meta.endpoint,
    observedAt: meta.observedAt,
    retrievedAt,
    freshnessSeconds: age,
    note:
      freshness === "stale"
        ? `Source timestamp is ${age}s old, which exceeds the ${meta.staleAfterSeconds}s freshness window.`
        : freshness === "unknown"
          ? (meta.note ?? "No source timestamp was provided, so freshness cannot be verified.")
          : meta.note,
  };
}

export function derivedField<T>(
  value: T | null | undefined,
  meta: FieldMeta & { formula: string },
): ContextField<T> {
  const retrievedAt = retrievedIso(meta, false);
  if (value === null || value === undefined) {
    const status: FieldStatus = meta.error ? "error" : "missing";
    return {
      kind: "unavailable",
      status,
      evidence: "UNKNOWN",
      value: null,
      formula: meta.formula,
      source: meta.source,
      endpoint: meta.endpoint,
      retrievedAt,
      note: reasonNote(meta),
    };
  }

  const retrievedAtDate = meta.retrievedAtDate ?? (meta.retrievedAt ? new Date(meta.retrievedAt) : new Date());
  const age = freshnessSeconds(meta.observedAtMs, retrievedAtDate);
  const freshness = meta.staleAfterSeconds
    ? classifyFreshness(age, meta.staleAfterSeconds)
    : "fresh";
  const status = meta.staleAfterSeconds ? statusFromFreshness(freshness) : "ok";

  return {
    kind: "derived",
    status,
    evidence: evidenceFor("derived", status, meta.assumption),
    value,
    unit: meta.unit,
    source: meta.source,
    endpoint: meta.endpoint,
    observedAt: meta.observedAt,
    retrievedAt: retrievedAt ?? retrievedAtDate.toISOString(),
    freshnessSeconds: age,
    formula: meta.formula,
    note:
      freshness === "stale"
        ? `Derived from source data that is ${age}s old, which exceeds the ${meta.staleAfterSeconds}s freshness window.`
        : meta.note,
  };
}

export function unavailableField<T = never>(
  note: string,
  meta: FieldMeta & { status?: FieldStatus } = {},
): ContextField<T> {
  const status = meta.status ?? (meta.error ? "error" : "unverified");
  return {
    kind: "unavailable",
    status,
    evidence: "UNKNOWN",
    value: null,
    source: meta.source,
    endpoint: meta.endpoint,
    retrievedAt: retrievedIso(meta, false),
    formula: meta.formula,
    note,
  };
}

export function isContextField(value: unknown): value is ContextField<unknown> {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    (record.kind === "observed" || record.kind === "derived" || record.kind === "unavailable") &&
    typeof record.status === "string" &&
    "value" in record &&
    typeof record.evidence === "string"
  );
}

export function collectFields(value: unknown, acc: ContextField<unknown>[] = []): ContextField<unknown>[] {
  if (!value || typeof value !== "object") {
    return acc;
  }
  if (isContextField(value)) {
    acc.push(value);
    return acc;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectFields(item, acc);
    }
    return acc;
  }
  for (const nested of Object.values(value)) {
    collectFields(nested, acc);
  }
  return acc;
}

export function summarizeCoverage(root: unknown): FieldCoverage {
  const fields = collectFields(root);
  const coverage: FieldCoverage = {
    observed: 0,
    derived: 0,
    unavailable: 0,
    ok: 0,
    stale: 0,
    missing: 0,
    error: 0,
    unverified: 0,
    unknown: 0,
  };
  for (const field of fields) {
    coverage[field.kind] += 1;
    coverage[field.status] += 1;
  }
  return coverage;
}
