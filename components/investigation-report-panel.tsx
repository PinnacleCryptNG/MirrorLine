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
      <article className="rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] p-3">
        <p className="font-mono text-[10px] uppercase text-[var(--text-muted)]">{label}</p>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">Not present in this pack.</p>
      </article>
    );
  }
  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] p-3">
      <p className="font-mono text-[10px] uppercase text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-xs font-semibold text-[var(--text-primary)]">
        {field.classification} · {field.status} · {field.value === null ? "—" : String(field.value)}
      </p>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">{field.claim}</p>
      <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">
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
    <section className="flex flex-col gap-6">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-sm">
        <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] dark:text-[#86C495]">
          Investigation Report · Non-Advisory
        </p>
        <h2 className="mt-1 text-base md:text-lg font-semibold text-[var(--text-primary)]">
          Export this investigation
        </h2>
        <p className="mt-1 text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed">
          Assembles the currently loaded evidence pack, brief, challenge, and revision trail. Export does not refresh Bitget data; report creation time is kept separate from source timestamps.
        </p>

        {!pack || !brief ? (
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            Load live data or a demo fixture first to inspect and export a report.
          </p>
        ) : null}

        {report?.isDemoFixture ? (
          <div className="mt-3 rounded-lg border border-[var(--warning-border)] bg-[var(--warning-bg)] p-3 text-xs text-[var(--warning)]">
            <p className="font-semibold uppercase tracking-wide text-xs">DEMO / FIXTURE DATA</p>
            <p className="mt-0.5 text-xs">
              This report will be exported from frozen demonstration fixtures ({report.fixtureLabel ?? report.fixtureId ?? "fixture"}). It does not represent live Bitget market conditions.
            </p>
          </div>
        ) : null}

        {report?.snapshot.stale || report?.snapshot.warning ? (
          <div className="mt-3 rounded-lg border border-[var(--warning-border)] bg-[var(--warning-bg)] p-3 text-xs text-[var(--warning)]">
            {report.snapshot.stale ? (
              <p>
                Stale evidence is present ({report.snapshot.staleEvidenceIds.join(", ")}). Stale facts keep their older timestamps.
              </p>
            ) : null}
            {report.snapshot.warning ? <p className="mt-1">{report.snapshot.warning}</p> : null}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors shadow-xs"
            disabled={!report}
            onClick={() => setOpen((current) => !current)}
          >
            {open ? "Hide report preview" : "Preview report"}
          </button>
          <button
            type="button"
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] disabled:opacity-50 transition-colors"
            disabled={!report}
            onClick={() => exportReport("markdown")}
          >
            Export Markdown
          </button>
          <button
            type="button"
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] disabled:opacity-50 transition-colors"
            disabled={!report}
            onClick={() => exportReport("json")}
          >
            Export JSON
          </button>
          <button
            type="button"
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] disabled:opacity-50 transition-colors"
            disabled={!report}
            onClick={() => exportReport("html")}
          >
            Export HTML
          </button>
          <button
            type="button"
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] disabled:opacity-50 transition-colors"
            disabled={!report}
            onClick={() => exportReport("print")}
          >
            Print / save as PDF
          </button>
        </div>

        {error ? (
          <p role="alert" aria-live="polite" className="mt-3 text-xs text-[var(--negative)]">
            {error}
          </p>
        ) : null}
      </div>

      {open && report ? (
        <div className="report-print-root rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
            <p className="font-mono text-[10px] uppercase tracking-wide text-[var(--accent)] dark:text-[#86C495]">
              Non-advisory report preview
            </p>
            {report.isDemoFixture ? (
              <span className="rounded-full border border-[var(--warning-border)] bg-[var(--warning-bg)] px-2.5 py-0.5 font-mono text-[10px] text-[var(--warning)] font-bold">
                DEMO / FIXTURE DATA
              </span>
            ) : null}
          </div>

          <h3 className="mt-3 text-base md:text-lg font-semibold text-[var(--text-primary)]">
            {report.tokenSymbol} Investigation Report
          </h3>

          {report.isDemoFixture ? (
            <div className="mt-3 rounded-lg border border-[var(--warning-border)] bg-[var(--warning-bg)] p-3 text-xs text-[var(--warning)]">
              <strong>DEMO / FIXTURE DATA:</strong> Scenario {report.fixtureLabel ?? report.fixtureId}. Timestamps are preserved from the recorded scenario and not refreshed from live markets.
            </div>
          ) : null}

          <ul className="mt-3 space-y-1 text-xs text-[var(--text-secondary)]">
            <li><strong>Report created:</strong> {report.createdAt}</li>
            <li><strong>Evidence snapshot retrieved:</strong> {report.snapshot.retrievedAt}{report.isDemoFixture ? " (fixture timestamp)" : ""}</li>
            <li><strong>Snapshot id:</strong> <code className="font-mono">{report.snapshot.id}</code></li>
            <li><strong>Question:</strong> {report.question}</li>
          </ul>

          <p className="mt-3 text-xs text-[var(--text-muted)] italic">{report.disclaimers[0]}</p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <FieldBlock label="Last price" field={report.contextSummary.lastPrice} />
            <FieldBlock label="24-hour change" field={report.contextSummary.change24h} />
            <FieldBlock label="US session" field={report.contextSummary.session} />
            <FieldBlock label="Reference price" field={report.contextSummary.referencePrice} />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <FieldBlock label="Underlying asset" field={report.contextSummary.underlying} />
            <FieldBlock label="Public orderbook depth" field={report.contextSummary.publicUtaDepth} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
