import { useMemo, useState } from "react";
import type { EvidenceClass } from "@/lib/market/fields";
import type { EvidenceItem, EvidencePack } from "@/lib/evidence/types";

const FILTERS: Array<"ALL" | EvidenceClass> = ["ALL", "FACT", "INFERENCE", "ASSUMPTION", "UNKNOWN"];

function classColor(classification: EvidenceClass) {
  if (classification === "FACT") return "border-[#5EA7FF]/30 bg-[#5EA7FF]/10 text-[#5EA7FF]";
  if (classification === "INFERENCE") return "border-[#8B7CFF]/30 bg-[#8B7CFF]/10 text-[#8B7CFF]";
  if (classification === "ASSUMPTION") return "border-[#F4C95D]/30 bg-[#F4C95D]/10 text-[#F4C95D]";
  return "border-[#626B7A]/40 bg-[#171B24] text-[#9BA3B2]";
}

function statusColor(status: string) {
  if (status === "ok") return "border-[#36D399]/30 bg-[#36D399]/10 text-[#36D399]";
  if (status === "stale") return "border-[#F4C95D]/30 bg-[#F4C95D]/10 text-[#F4C95D]";
  if (status === "error") return "border-[#FF6B7A]/30 bg-[#FF6B7A]/10 text-[#FF6B7A]";
  return "border-[#626B7A]/40 bg-[#171B24] text-[#9BA3B2]";
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
      <section className="rounded-xl border border-[#252B36] bg-[#10131A] px-4 py-6 text-sm text-[#9BA3B2]">
        An evidence pack has not been generated yet. Verify live data to classify Bitget context as FACT, INFERENCE,
        ASSUMPTION, or UNKNOWN.
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-[#252B36] bg-[#10131A] px-4 py-4">
        <p className="font-data text-xs tracking-[0.24em] text-[#8B7CFF]">INVESTIGATION EVIDENCE PACK</p>
        <h2 className="mt-2 text-lg font-medium">{pack.investigation.question}</h2>
        <p className="mt-1 font-data text-xs text-[#626B7A]">
          {pack.investigation.tokenSymbol} · {pack.investigation.pair} · retrieved {pack.investigation.retrievedAt}
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <SummaryChip label="FACT" value={pack.summary.fact} />
          <SummaryChip label="INFERENCE" value={pack.summary.inference} />
          <SummaryChip label="ASSUMPTION" value={pack.summary.assumption} />
          <SummaryChip label="UNKNOWN" value={pack.summary.unknown} />
        </div>
        {(pack.summary.stale > 0 || pack.summary.error > 0) && (
          <p className="mt-3 text-xs text-[#F4C95D]">
            Freshness flags: {pack.summary.stale} stale · {pack.summary.missing} missing · {pack.summary.error} error ·{" "}
            {pack.summary.unverified} unverified
          </p>
        )}
      </section>

      {pack.unknowns.length > 0 ? (
        <section className="rounded-xl border border-[#252B36] bg-[#10131A] px-4 py-3">
          <h3 className="text-sm font-medium">Explicit unknowns</h3>
          <ul className="mt-2 space-y-1 text-sm text-[#9BA3B2]">
            {pack.unknowns.map((question) => (
              <li key={question}>• {question}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={`rounded-full border px-3 py-1 font-data text-xs ${
              filter === item ? "border-[#8B7CFF] text-[#8B7CFF]" : "border-[#252B36] text-[#9BA3B2]"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {visible.length === 0 ? (
          <p className="rounded-xl border border-[#252B36] bg-[#10131A] px-4 py-6 text-sm text-[#9BA3B2]">
            No evidence items match {filter}.
          </p>
        ) : (
          visible.map((item) => <EvidenceCard key={item.id} item={item} />)
        )}
      </div>

      <section className="rounded-xl border border-[#252B36] bg-[#10131A] px-4 py-3 text-sm text-[#9BA3B2]">
        <h3 className="mb-2 text-sm font-medium text-[#F5F7FA]">Pack limitations</h3>
        <ul className="space-y-2">
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
    <div className="rounded-lg border border-[#252B36] bg-[#080A0F] px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-[#626B7A]">{label}</p>
      <p className="mt-1 font-data text-xl text-[#F5F7FA]">{value}</p>
    </div>
  );
}

function EvidenceCard({ item }: { item: EvidenceItem }) {
  const source = item.sources[0];
  return (
    <article id={`ev-${item.id}`} className="rounded-xl border border-[#252B36] bg-[#10131A] px-4 py-3 scroll-mt-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-data text-[11px] text-[#626B7A]">{item.id}</p>
          <h3 className="mt-1 text-sm text-[#F5F7FA]">{item.claim}</h3>
        </div>
        <div className="flex flex-wrap gap-1">
          <span className={`rounded-full border px-2 py-0.5 font-data text-[10px] uppercase ${classColor(item.classification)}`}>
            {item.classification}
          </span>
          <span className={`rounded-full border px-2 py-0.5 font-data text-[10px] uppercase ${statusColor(item.status)}`}>
            {item.status}
          </span>
        </div>
      </div>
      <p className="mt-2 font-data text-sm text-[#F5F7FA]">
        Value: {formatItemValue(item)}
        {item.unit ? <span className="text-[#626B7A]"> {item.unit}</span> : null}
      </p>
      <p className="mt-2 text-sm text-[#9BA3B2]">{item.reasoning}</p>
      {source ? (
        <p className="mt-2 font-data text-[11px] text-[#626B7A]">
          Source {source.provider}
          {source.endpoint ? ` · ${source.endpoint}` : ""} · field {source.field}
          {source.observedAt ? ` · observed ${source.observedAt}` : " · no source timestamp"}
          {source.freshnessSeconds !== undefined && source.freshnessSeconds !== null
            ? ` · age ${source.freshnessSeconds}s`
            : ""}
        </p>
      ) : (
        <p className="mt-2 font-data text-[11px] text-[#626B7A]">No Bitget source field is attached.</p>
      )}
      {item.supports.length > 0 ? (
        <p className="mt-1 font-data text-[11px] text-[#8B7CFF]">Supports: {item.supports.join(", ")}</p>
      ) : null}
      {item.confidence ? (
        <p className="mt-1 text-xs text-[#9BA3B2]">
          Confidence {item.confidence.level}: {item.confidence.justification}
        </p>
      ) : (
        <p className="mt-1 text-xs text-[#626B7A]">No confidence score — the claim is unclassified or unanswered.</p>
      )}
      {item.caveats.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs text-[#9BA3B2]">
          {item.caveats.map((caveat) => (
            <li key={caveat}>Caveat: {caveat}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
