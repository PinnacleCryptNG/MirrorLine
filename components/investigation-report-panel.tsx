"use client";

import { useMemo, useState } from "react";
import type { InvestigationBrief } from "@/lib/brief/types";
import type { InterpretationChallenge } from "@/lib/challenge/types";
import type { EvidencePack } from "@/lib/evidence/types";
import type { MarketContext } from "@/lib/market/types";
import type { ThesisRevision } from "@/lib/revision/types";
import {
  assembleInvestigationReport,
  serializeInvestigationReportHtml,
  serializeInvestigationReportJson,
  serializeInvestigationReportMarkdown,
} from "@/lib/report";
import type { InvestigationReport } from "@/lib/report";

function downloadFile(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function FieldBlock({
  label,
  field,
}: {
  label: string;
  field: InvestigationReport["contextSummary"]["lastPrice"];
}) {
  if (!field) {
    return (
      <article className="rounded-lg border border-[#252B36] bg-[#080A0F] px-3 py-3">
        <p className="font-data text-[10px] uppercase text-[#626B7A]">{label}</p>
        <p className="mt-1 text-sm text-[#9BA3B2]">Not present in this pack.</p>
      </article>
    );
  }
  return (
    <article className="rounded-lg border border-[#252B36] bg-[#080A0F] px-3 py-3">
      <p className="font-data text-[10px] uppercase text-[#626B7A]">{label}</p>
      <p className="mt-1 text-sm text-[#F5F7FA]">
        {field.classification} · {field.status} · {field.value === null ? "—" : String(field.value)}
      </p>
      <p className="mt-1 text-xs text-[#9BA3B2]">{field.claim}</p>
      <p className="mt-1 font-data text-[11px] text-[#626B7A]">
        {[field.endpoint, field.field].filter(Boolean).join(" · ") || "source not attached"}
        {field.observedAt ? ` · observed ${field.observedAt}` : ""}
        {field.freshnessSeconds !== null && field.freshnessSeconds !== undefined ? ` · age ${field.freshnessSeconds}s` : ""}
      </p>
    </article>
  );
}

export function InvestigationReportPanel({
  pack,
  brief,
  context,
  challenge,
  revisions,
}: {
  pack: EvidencePack | null;
  brief: InvestigationBrief | null;
  context: MarketContext | null;
  challenge: InterpretationChallenge | null;
  revisions: ThesisRevision[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const report = useMemo(() => {
    if (!pack || !brief) {
      return null;
    }
    return assembleInvestigationReport({
      pack,
      brief,
      context: context ?? undefined,
      challenge,
      revisions,
    });
  }, [pack, brief, context, challenge, revisions]);

  const exportReport = (format: "markdown" | "json" | "html" | "print") => {
    if (!report) {
      setError("Verify live data first so the export uses the currently loaded snapshot.");
      return;
    }
    setError(null);
    const stem = `mirrorline-${report.tokenSymbol}-investigation`;
    if (format === "markdown") {
      downloadFile(`${stem}.md`, serializeInvestigationReportMarkdown(report), "text/markdown;charset=utf-8");
      return;
    }
    if (format === "json") {
      downloadFile(`${stem}.json`, serializeInvestigationReportJson(report), "application/json;charset=utf-8");
      return;
    }
    const html = serializeInvestigationReportHtml(report);
    if (format === "html") {
      downloadFile(`${stem}.html`, html, "text/html;charset=utf-8");
      return;
    }
    const popup = window.open("", "_blank", "width=900,height=800");
    if (!popup) {
      setError("The browser blocked the print window. Allow popups for this site, or download the HTML report to print.");
      return;
    }
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-xl border border-[#252B36] bg-[#10131A] px-4 py-4">
        <p className="font-data text-xs tracking-[0.24em] text-[#8B7CFF]">INVESTIGATION REPORT · NON-ADVISORY</p>
        <h2 className="mt-2 text-lg font-medium">Export this investigation</h2>
        <p className="mt-1 text-sm text-[#9BA3B2]">
          Assembles the currently loaded evidence pack, brief, challenge, and revision trail. Export does not refresh
          Bitget data. Report creation time is separate from source timestamps.
        </p>
        {!pack || !brief ? (
          <p className="mt-3 text-sm text-[#9BA3B2]">Verify live data to load a snapshot before exporting a report.</p>
        ) : null}
        {report?.snapshot.stale || report?.snapshot.warning ? (
          <div className="mt-3 rounded-md border border-[#F4C95D]/40 bg-[#F4C95D]/10 px-3 py-2 text-sm text-[#F4C95D]">
            {report.snapshot.stale ? (
              <p>
                Stale evidence is present ({report.snapshot.staleEvidenceIds.join(", ")}). Stale facts keep their older
                timestamps.
              </p>
            ) : null}
            {report.snapshot.warning ? <p className="mt-1">{report.snapshot.warning}</p> : null}
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="h-10 rounded-md bg-[#8B7CFF] px-4 text-sm font-medium text-[#080A0F] disabled:opacity-60"
            disabled={!report}
            onClick={() => setOpen((current) => !current)}
          >
            {open ? "Hide report preview" : "Preview report"}
          </button>
          <button
            type="button"
            className="h-10 rounded-md border border-[#252B36] px-4 text-sm text-[#F5F7FA] disabled:opacity-60"
            disabled={!report}
            onClick={() => exportReport("markdown")}
          >
            Export Markdown
          </button>
          <button
            type="button"
            className="h-10 rounded-md border border-[#252B36] px-4 text-sm text-[#F5F7FA] disabled:opacity-60"
            disabled={!report}
            onClick={() => exportReport("json")}
          >
            Export JSON
          </button>
          <button
            type="button"
            className="h-10 rounded-md border border-[#252B36] px-4 text-sm text-[#F5F7FA] disabled:opacity-60"
            disabled={!report}
            onClick={() => exportReport("html")}
          >
            Export HTML
          </button>
          <button
            type="button"
            className="h-10 rounded-md border border-[#8B7CFF]/40 px-4 text-sm text-[#8B7CFF] disabled:opacity-60"
            disabled={!report}
            onClick={() => exportReport("print")}
          >
            Print / save as PDF
          </button>
        </div>
        {error ? (
          <p role="alert" aria-live="polite" className="mt-3 text-sm text-[#FF6B7A]">
            {error}
          </p>
        ) : null}
      </div>

      {open && report ? (
        <div className="report-print-root rounded-xl border border-[#252B36] bg-[#10131A] px-4 py-4">
          <p className="font-data text-[10px] uppercase tracking-wide text-[#8B7CFF]">Non-advisory report preview</p>
          <h3 className="mt-2 text-xl font-medium text-[#F5F7FA]">{report.tokenSymbol} investigation report</h3>
          <ul className="mt-3 space-y-1 text-sm text-[#9BA3B2]">
            <li>Report created: {report.createdAt}</li>
            <li>Evidence snapshot retrieved: {report.snapshot.retrievedAt}</li>
            <li>Snapshot id: {report.snapshot.id}</li>
            <li>Question: {report.question}</li>
          </ul>
          <p className="mt-3 text-sm text-[#9BA3B2]">{report.disclaimers[0]}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <FieldBlock label="Last price" field={report.contextSummary.lastPrice} />
            <FieldBlock label="24-hour change" field={report.contextSummary.change24h} />
            <FieldBlock label="US session" field={report.contextSummary.session} />
            <FieldBlock label="Reference price" field={report.contextSummary.referencePrice} />
          </div>
          <p className="mt-4 text-sm text-[#9BA3B2]">
            Evidence: FACT {report.classifications.fact} · INFERENCE {report.classifications.inference} · ASSUMPTION{" "}
            {report.classifications.assumption} · UNKNOWN {report.classifications.unknown}. Challenge{" "}
            {report.challenge
              ? `${report.challenge.summary.supported} supported / ${report.challenge.summary.challenged} challenged / ${report.challenge.summary.unsupported} unsupported / ${report.challenge.summary.unassessed} unassessed`
              : "not attached"}
            . Revisions {report.revisions.length}.
          </p>
          {report.failures.length > 0 ? (
            <p className="mt-3 text-sm text-[#F4C95D]">
              Partial data: {report.failures.map((failure) => `${failure.resource} (${failure.message})`).join(" · ")}.
              Missing resources are not treated as proof against a claim.
            </p>
          ) : null}
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-[#9BA3B2]">
            {report.tensions.slice(0, 4).map((tension) => (
              <li key={tension.id}>
                {tension.severity}: {tension.title}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
