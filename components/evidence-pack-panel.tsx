import { useMemo, useState } from "react";
import type { EvidenceClass } from "@/lib/market/fields";
import type { EvidenceItem, EvidencePack } from "@/lib/evidence/types";

const FILTERS: Array<"ALL" | EvidenceClass> = ["ALL", "FACT", "INFERENCE", "ASSUMPTION", "UNKNOWN"];

function classColor(classification: EvidenceClass) {
  if (classification === "FACT") return "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info)]";
  if (classification === "INFERENCE") return "border-[var(--accent-border)] bg-[var(--accent-light)] text-[var(--accent-text)] dark:text-[#86C495]";
  if (classification === "ASSUMPTION") return "border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning)]";
  return "border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]";
}

function statusColor(status: string) {
  if (status === "ok") return "border-[var(--positive-border)] bg-[var(--positive-bg)] text-[var(--positive)]";
  if (status === "stale") return "border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning)]";
  if (status === "error") return "border-[var(--negative-border)] bg-[var(--negative-bg)] text-[var(--negative)]";
  return "border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]";
}

function formatItemValue(item: EvidenceItem): string {
  if (item.value === null || item.value === undefined) {
    return "—";
  }
  return String(item.value);
}

export function EvidencePackPanel({ pack }: { pack: EvidencePack | null }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");

  const visible = useMemo(() => {
    if (!pack) {
      return [];
    }
    if (filter === "ALL") {
      return pack.items;
    }
    return pack.items.filter((item) => item.classification === filter);
  }, [pack, filter]);

  if (!pack) {
    return (
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-6 text-xs text-[var(--text-muted)]">
        An evidence pack has not been generated yet. Load live or demo data to inspect classified Bitget market context.
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-xs">
        <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] dark:text-[#86C495]">
          Investigation Evidence Pack
        </p>
        <h3 className="mt-1 text-base font-semibold text-[var(--text-primary)]">{pack.investigation.question}</h3>
        <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">
          {pack.investigation.tokenSymbol} · {pack.investigation.pair} · retrieved {pack.investigation.retrievedAt}
        </p>
        <div className="mt-4 grid gap-3 grid-cols-2 md:grid-cols-4">
          <SummaryChip label="FACT" value={pack.summary.fact} />
          <SummaryChip label="INFERENCE" value={pack.summary.inference} />
          <SummaryChip label="ASSUMPTION" value={pack.summary.assumption} />
          <SummaryChip label="UNKNOWN" value={pack.summary.unknown} />
        </div>
        {(pack.summary.stale > 0 || pack.summary.error > 0) && (
          <p className="mt-3 text-xs text-[var(--warning)]">
            Freshness flags: {pack.summary.stale} stale · {pack.summary.missing} missing · {pack.summary.error} error ·{" "}
            {pack.summary.unverified} unverified
          </p>
        )}
      </section>

      {pack.unknowns.length > 0 ? (
        <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-xs">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] font-mono">Explicit unknowns</h4>
          <ul className="mt-2 space-y-1 text-xs text-[var(--text-secondary)]">
            {pack.unknowns.map((question) => (
              <li key={question}>• {question}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={`rounded-lg border px-3 py-1 font-mono text-xs transition-colors ${
              filter === item
                ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)] font-semibold"
                : "border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:border-[var(--accent)]"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {visible.length === 0 ? (
          <p className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-xs text-[var(--text-muted)]">
            No evidence items match {filter}.
          </p>
        ) : (
          visible.map((item) => <EvidenceCard key={item.id} item={item} />)
        )}
      </div>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-xs text-[var(--text-secondary)] shadow-xs">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] font-mono">Pack limitations</h4>
        <ul className="space-y-1.5">
          {pack.limitations.slice(0, 8).map((note) => (
            <li key={note}>• {note}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function SummaryChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] p-3 shadow-2xs">
      <p className="font-mono text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 font-mono text-xl font-bold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function EvidenceCard({ item }: { item: EvidenceItem }) {
  const source = item.sources[0];
  return (
    <article id={`ev-${item.id}`} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-xs scroll-mt-4">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[10px] text-[var(--text-muted)]">{item.id}</p>
          <h4 className="mt-0.5 text-xs md:text-sm font-semibold text-[var(--text-primary)]">{item.claim}</h4>
        </div>
        <div className="flex flex-wrap gap-1">
          <span className={`rounded-full border px-2 py-0.2 font-mono text-[10px] uppercase font-bold ${classColor(item.classification)}`}>
            {item.classification}
          </span>
          <span className={`rounded-full border px-2 py-0.2 font-mono text-[10px] uppercase font-bold ${statusColor(item.status)}`}>
            {item.status}
          </span>
        </div>
      </div>
      <p className="mt-2 font-mono text-xs text-[var(--text-primary)]">
        Value: {formatItemValue(item)}
        {item.unit ? <span className="text-[var(--text-muted)]"> {item.unit}</span> : null}
      </p>
      <p className="mt-1.5 text-xs text-[var(--text-secondary)]">{item.reasoning}</p>
      {source ? (
        <p className="mt-1.5 font-mono text-[10px] text-[var(--text-muted)]">
          Source {source.provider}
          {source.endpoint ? ` · ${source.endpoint}` : ""} · field {source.field}
          {source.observedAt ? ` · observed ${source.observedAt}` : " · no source timestamp"}
          {source.freshnessSeconds !== undefined && source.freshnessSeconds !== null
            ? ` · age ${source.freshnessSeconds}s`
            : ""}
        </p>
      ) : (
        <p className="mt-1.5 font-mono text-[10px] text-[var(--text-muted)]">No Bitget source field is attached.</p>
      )}
      {item.supports.length > 0 ? (
        <p className="mt-1 font-mono text-[10px] text-[var(--accent)] dark:text-[#86C495]">Supports: {item.supports.join(", ")}</p>
      ) : null}
      {item.confidence ? (
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Confidence {item.confidence.level}: {item.confidence.justification}
        </p>
      ) : (
        <p className="mt-1 text-[11px] text-[var(--text-muted)]">No confidence score — the claim is unclassified or unanswered.</p>
      )}
      {item.caveats.length > 0 ? (
        <ul className="mt-1.5 space-y-0.5 text-[11px] text-[var(--text-muted)]">
          {item.caveats.map((caveat) => (
            <li key={caveat}>• Caveat: {caveat}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
