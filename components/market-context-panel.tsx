import type { ReactNode } from "react";
import type { ContextField, FieldKind, FieldStatus } from "@/lib/market/fields";
import type { MarketContext, ResourceFailure } from "@/lib/market/types";

type FieldView = Pick<ContextField<unknown>, "kind" | "status" | "value" | "note" | "formula" | "unit">;

function kindClass(kind: FieldKind) {
  if (kind === "observed") return "border-[#5EA7FF]/30 bg-[#5EA7FF]/10 text-[#5EA7FF]";
  if (kind === "derived") return "border-[#8B7CFF]/30 bg-[#8B7CFF]/10 text-[#8B7CFF]";
  return "border-[#626B7A]/40 bg-[#171B24] text-[#9BA3B2]";
}

function statusClass(status: FieldStatus) {
  if (status === "ok") return "border-[#36D399]/30 bg-[#36D399]/10 text-[#36D399]";
  if (status === "stale") return "border-[#F4C95D]/30 bg-[#F4C95D]/10 text-[#F4C95D]";
  if (status === "error") return "border-[#FF6B7A]/30 bg-[#FF6B7A]/10 text-[#FF6B7A]";
  return "border-[#626B7A]/40 bg-[#171B24] text-[#9BA3B2]";
}

function formatValue(field: FieldView): string {
  if (field.value === null || field.value === undefined) {
    return "—";
  }
  if (typeof field.value === "boolean") {
    return field.value ? "yes" : "no";
  }
  if (typeof field.value === "number") {
    if (field.unit === "fraction") {
      return `${(field.value * 100).toFixed(2)}%`;
    }
    if (field.unit === "bps") {
      return `${field.value.toFixed(2)} bps`;
    }
    if (Number.isInteger(field.value)) {
      return String(field.value);
    }
    return field.value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  }
  if (typeof field.value === "string") {
    return field.value;
  }
  if (Array.isArray(field.value)) {
    if (field.value.length === 0) {
      return "none";
    }
    if (typeof field.value[0] === "string") {
      return field.value.join(", ");
    }
    return `${field.value.length} items`;
  }
  if (typeof field.value === "object") {
    const record = field.value as Record<string, unknown>;
    if ("remark" in record && "startTime" in record) {
      return `${record.startTime} – ${record.endTime}${record.remark ? ` (${record.remark})` : ""}`;
    }
    if ("bidCount" in record && "askCount" in record) {
      return `${record.bidCount} bids / ${record.askCount} asks`;
    }
    return "present";
  }
  return String(field.value);
}

function FieldRow({
  label,
  field,
}: {
  label: string;
  field: FieldView;
}) {
  return (
    <div className="grid gap-1 border-b border-[#252B36] py-2.5 last:border-b-0 md:grid-cols-[minmax(8rem,11rem)_minmax(0,1fr)_auto] md:items-start md:gap-3">
      <p className="text-xs uppercase tracking-wide text-[#626B7A]">{label}</p>
      <div>
        <p className="font-data text-sm text-[#F5F7FA]">{formatValue(field)}</p>
        {field.note ? <p className="mt-1 text-xs text-[#9BA3B2]">{field.note}</p> : null}
        {field.formula ? <p className="mt-1 font-data text-[11px] text-[#626B7A]">{field.formula}</p> : null}
      </div>
      <div className="flex flex-wrap gap-1 md:justify-end">
        <span className={`rounded-full border px-2 py-0.5 font-data text-[10px] uppercase ${kindClass(field.kind)}`}>
          {field.kind}
        </span>
        <span className={`rounded-full border px-2 py-0.5 font-data text-[10px] uppercase ${statusClass(field.status)}`}>
          {field.status}
        </span>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-[#252B36] bg-[#10131A]">
      <div className="border-b border-[#252B36] px-4 py-3">
        <h2 className="text-sm font-medium">{title}</h2>
      </div>
      <div className="px-4 py-1">{children}</div>
    </section>
  );
}

export function MarketContextPanel({
  context,
  failures,
}: {
  context: MarketContext | null;
  failures: ResourceFailure[];
}) {
  if (!context) {
    return (
      <section className="rounded-xl border border-[#252B36] bg-[#10131A] px-4 py-6 text-sm text-[#9BA3B2]">
        Market context has not loaded yet. Verify live data to label observed, derived, and unavailable fields.
      </section>
    );
  }

  const windows = context.session.windows.value ?? [];
  const currentState = context.session.bitgetState.value;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 md:grid-cols-4">
        <CoverageStat label="Observed" value={context.coverage.observed} />
        <CoverageStat label="Derived" value={context.coverage.derived} />
        <CoverageStat label="Unavailable" value={context.coverage.unavailable} />
        <CoverageStat
          label="Stale / missing / error"
          value={`${context.coverage.stale} / ${context.coverage.missing} / ${context.coverage.error}`}
        />
      </div>

      {failures.length > 0 ? (
        <div className="rounded-lg border border-[#F4C95D]/40 bg-[#F4C95D]/10 px-4 py-3 text-sm text-[#F4C95D]">
          Partial context. Failed resources are labeled, not replaced with fabricated values.
          <ul className="mt-2 space-y-1 text-[#F5F7FA]">
            {failures.map((failure) => (
              <li key={`${failure.resource}:${failure.message}`}>
                <span className="font-data text-xs">{failure.resource}</span>
                {failure.code ? <span className="text-[#9BA3B2]"> ({failure.code})</span> : null}
                {": "}
                {failure.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Price and 24h tape (Bitget ticker)">
          <FieldRow label="Last price" field={context.price.last} />
          <FieldRow label="Source timestamp" field={context.price.sourceTimestamp} />
          <FieldRow label="24h change" field={context.price.change24hPercent} />
          <FieldRow label="24h volume" field={context.price.volume24h} />
          <FieldRow label="24h turnover" field={context.price.turnover24h} />
          <FieldRow label="24h high" field={context.price.high24h} />
          <FieldRow label="24h low" field={context.price.low24h} />
        </Panel>

        <Panel title="Bid / ask / spread">
          <FieldRow label="Bid" field={context.bookTop.bid} />
          <FieldRow label="Ask" field={context.bookTop.ask} />
          <FieldRow label="Bid size" field={context.bookTop.bidSize} />
          <FieldRow label="Ask size" field={context.bookTop.askSize} />
          <FieldRow label="Spread" field={context.bookTop.spread} />
          <FieldRow label="Spread (bps)" field={context.bookTop.spreadBps} />
          <FieldRow label="Mid" field={context.bookTop.mid} />
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Candle history">
          <p className="py-2 text-xs text-[#9BA3B2]">
            Requested interval {context.candles.interval}. Bitget rToken docs support{" "}
            {context.candles.supportedIntervals.join(", ")}. Type is market only.
          </p>
          <FieldRow label="Count" field={context.candles.count} />
          <FieldRow label="Latest close" field={context.candles.latestClose} />
          <FieldRow label="Latest bar time" field={context.candles.latestTimestamp} />
          <FieldRow label="Series" field={context.candles.series} />
        </Panel>

        <Panel title="Session and windows">
          <FieldRow label="Market session" field={context.session.marketSession} />
          <FieldRow label="Bitget state" field={context.session.bitgetState} />
          <FieldRow label="US equity" field={context.session.underlyingUsEquity} />
          <FieldRow label="Weekend" field={context.session.weekend} />
          <FieldRow label="Holiday" field={context.session.holiday} />
          <FieldRow label="Timezone label" field={context.session.timeZone} />
          <FieldRow label="Daylight type" field={context.session.daylightType} />
          <FieldRow label="Token windows" field={context.session.tokenTradingPeriod} />
          <FieldRow label="Weekend tradable" field={context.session.weekendTradable} />
          <FieldRow label="Token window match" field={context.session.tokenWindowMatch} />
          {windows.length > 0 ? (
            <ul className="mt-2 space-y-1 pb-3">
              {windows.map((window) => (
                <li
                  key={`${window.state}-${window.startTime}`}
                  className={`font-data text-xs ${
                    window.state === currentState ? "text-[#8B7CFF]" : "text-[#9BA3B2]"
                  }`}
                >
                  {window.state} {window.startTime}–{window.endTime} {window.timeZone}
                  {window.state === currentState ? " · current match" : ""}
                </li>
              ))}
            </ul>
          ) : null}
          {context.session.derivation.length > 0 ? (
            <details className="pb-3">
              <summary className="cursor-pointer text-xs text-[#9BA3B2]">Derivation notes</summary>
              <ul className="mt-2 space-y-1 text-xs text-[#626B7A]">
                {context.session.derivation.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Reference relationship">
          <p className="py-2 text-xs text-[#9BA3B2]">{context.reference.note}</p>
          <FieldRow label="Underlying symbol" field={context.reference.underlyingSymbol} />
          <FieldRow label="Underlying name" field={context.reference.underlyingName} />
          <FieldRow label="Token price" field={context.reference.tokenPrice} />
          <FieldRow label="Reference price" field={context.reference.referencePrice} />
          <FieldRow label="Reference time" field={context.reference.referenceTimestamp} />
          <FieldRow label="Divergence" field={context.reference.divergence} />
          <FieldRow label="Company 52w high" field={context.reference.companyHigh52Week} />
          <FieldRow label="Company 52w low" field={context.reference.companyLow52Week} />
        </Panel>

        <Panel title="Depth (optional, labeled)">
          <p className="py-2 text-xs text-[#9BA3B2]">{context.depth.note}</p>
          <FieldRow label="Public UTA book" field={context.depth.publicUtaBook} />
          <FieldRow label="Reality book" field={context.depth.realityBook} />
        </Panel>
      </div>

      <section className="rounded-xl border border-[#252B36] bg-[#10131A] px-4 py-3 text-sm text-[#9BA3B2]">
        <h2 className="mb-2 text-sm font-medium text-[#F5F7FA]">Context limitations</h2>
        <ul className="space-y-2">
          {context.limitations.map((note) => (
            <li key={note}>• {note}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function CoverageStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[#252B36] bg-[#10131A] px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-[#626B7A]">{label}</p>
      <p className="mt-1 font-data text-xl text-[#F5F7FA]">{value}</p>
    </div>
  );
}
