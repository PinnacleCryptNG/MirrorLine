import type { InvestigationReport, ReportFieldSnapshot } from "./types";
import { escapeHtml } from "./sanitize";

function text(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  return escapeHtml(String(value));
}

function fieldCard(label: string, field: ReportFieldSnapshot | null): string {
  if (!field) {
    return `<article class="card"><h3>${escapeHtml(label)}</h3><p>Not present in this pack.</p></article>`;
  }
  const source = [field.provider, field.endpoint, field.field].filter(Boolean).join(" · ");
  return `<article class="card">
    <h3>${escapeHtml(label)}</h3>
    <p><span class="pill">${text(field.classification)}</span> <span class="pill">${text(field.status)}</span> <strong>${text(field.value)}</strong></p>
    <p>${text(field.claim)}</p>
    <p class="meta">Source: ${text(source || "not attached")}</p>
    <p class="meta">Observed ${text(field.observedAt)} · retrieved ${text(field.retrievedAt)} · age ${text(field.freshnessSeconds)}</p>
  </article>`;
}

export function serializeInvestigationReportHtml(report: InvestigationReport): string {
  const challenge = report.challenge;
  const staleBanner = report.snapshot.stale || report.snapshot.warning
    ? `<section class="banner">${
        report.snapshot.stale
          ? `<p><strong>Stale evidence is present.</strong> Item ids: ${text(report.snapshot.staleEvidenceIds.join(", ") || "none listed")}. Stale facts keep their older timestamps; they are not replaced.</p>`
          : ""
      }${report.snapshot.warning ? `<p>${text(report.snapshot.warning)}</p>` : ""}</section>`
    : "";

  const evidenceRows = report.pack.items
    .map((item) => {
      const source = item.sources[0];
      return `<tr>
        <td>${text(item.id)}</td>
        <td>${text(item.classification)}</td>
        <td>${text(item.status)}</td>
        <td>${text(item.claim)}</td>
        <td>${text(item.value)}</td>
        <td>${text(source?.field)}</td>
        <td>${text(source?.endpoint)}</td>
        <td>${text(source?.observedAt)}</td>
        <td>${text(source?.freshnessSeconds)}</td>
      </tr>`;
    })
    .join("");

  const tensions = report.tensions
    .map(
      (tension) =>
        `<article class="card"><h3>${text(tension.severity)} · ${text(tension.title)}</h3><p>${text(tension.explanation)}</p><p class="meta">Evidence: ${text(tension.evidenceIds.join(", ") || "none")}</p></article>`,
    )
    .join("");

  const assessments = challenge
    ? challenge.assessments
        .map(
          (assessment) =>
            `<article class="card">
              <p><span class="pill">${text(assessment.status)}</span> ${assessment.structuredClaimId ? `<span class="meta">${text(assessment.structuredClaimId)}</span>` : ""}</p>
              <p>${text(assessment.text)}</p>
              <p>${text(assessment.reasoning)}</p>
              <p class="meta">Evidence: ${text(assessment.evidenceIds.join(", ") || "none")}</p>
            </article>`,
        )
        .join("")
    : "<p>No interpretation challenge was attached to this export.</p>";

  const structured = report.structuredClaims
    .map(
      (claim) =>
        `<li><code>${text(claim.id)}</code> · ${text(claim.kind)} · ${text(
          Object.entries(claim.fields)
            .map(([key, value]) => `${key}=${value}`)
            .join(", "),
        )}</li>`,
    )
    .join("");

  const revisions = report.revisions
    .map((revision) => {
      const claims = revision.claims
        .map(
          (claim) =>
            `<li><strong>${text(claim.change)}</strong> (${text(claim.attribution)}; ${text(claim.matchReason)})<br/>Before: ${text(claim.previousText)}<br/>After: ${text(claim.currentText)}</li>`,
        )
        .join("");
      return `<article class="card">
        <h3>Revision ${text(revision.sequence)}</h3>
        <p class="meta">Created ${text(revision.createdAt)} · snapshot changed: ${revision.snapshotChanged ? "yes" : "no"}</p>
        ${revision.snapshotWarning ? `<p>${text(revision.snapshotWarning)}</p>` : ""}
        <ul>${claims}</ul>
      </article>`;
    })
    .join("");

  const failures =
    report.failures.length === 0
      ? "<p>No upstream resource failures were attached.</p>"
      : `<ul>${report.failures.map((failure) => `<li>${text(failure.resource)}${failure.code ? ` (${text(failure.code)})` : ""}: ${text(failure.message)}</li>`).join("")}</ul>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Mirrorline investigation report — ${text(report.tokenSymbol)}</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: Georgia, "Times New Roman", serif; color: #111; background: #fff; margin: 0; }
    main { max-width: 920px; margin: 0 auto; padding: 32px 24px 64px; }
    h1, h2, h3 { font-family: system-ui, sans-serif; }
    h1 { font-size: 28px; margin-bottom: 8px; }
    h2 { margin-top: 32px; border-bottom: 1px solid #ccc; padding-bottom: 6px; }
    p, li { line-height: 1.5; }
    .meta { color: #444; font-size: 13px; font-family: ui-monospace, monospace; }
    .banner { border: 2px solid #b45309; background: #fff7ed; padding: 12px 16px; margin: 16px 0; }
    .card { border: 1px solid #ddd; padding: 12px 16px; margin: 12px 0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
    .pill { display: inline-block; border: 1px solid #999; padding: 1px 8px; font-size: 11px; text-transform: uppercase; font-family: ui-monospace, monospace; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #ddd; padding: 6px; vertical-align: top; }
    th { text-align: left; background: #f4f4f5; }
    @media print {
      .no-print { display: none !important; }
      .banner { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      a { color: inherit; text-decoration: none; }
    }
  </style>
</head>
<body>
  <main>
    <p class="no-print meta"><button type="button" onclick="window.print()">Print or save as PDF</button></p>
    <p class="meta">NON-ADVISORY · MIRRORLINE INVESTIGATION REPORT</p>
    <h1>${text(report.tokenSymbol)} investigation report</h1>
    <p>This export does not recommend buys, sells, targets, or forecasts.</p>
    <ul>
      <li>Report created: <strong>${text(report.createdAt)}</strong></li>
      <li>Evidence snapshot retrieved: <strong>${text(report.snapshot.retrievedAt)}</strong></li>
      <li>Snapshot id: ${text(report.snapshot.id)}</li>
      <li>Question: ${text(report.question)}</li>
      <li>Pair: ${text(report.pair)}</li>
    </ul>
    ${staleBanner}
    <h2>Disclaimers</h2>
    <ul>${report.disclaimers.map((line) => `<li>${text(line)}</li>`).join("")}</ul>
    <h2>Market context summary</h2>
    <p>${text(report.contextSummary.note)}</p>
    <div class="grid">
      ${fieldCard("Last price", report.contextSummary.lastPrice)}
      ${fieldCard("24-hour change", report.contextSummary.change24h)}
      ${fieldCard("US session", report.contextSummary.session)}
      ${fieldCard("Named underlying", report.contextSummary.underlying)}
      ${fieldCard("Reference price", report.contextSummary.referencePrice)}
      ${fieldCard("Public UTA book", report.contextSummary.publicUtaDepth)}
      ${fieldCard("Reality depth", report.contextSummary.realityDepth)}
    </div>
    <h2>Evidence pack</h2>
    <p>FACT ${report.classifications.fact} · INFERENCE ${report.classifications.inference} · ASSUMPTION ${report.classifications.assumption} · UNKNOWN ${report.classifications.unknown}. Stale ${report.classifications.stale} · missing ${report.classifications.missing} · error ${report.classifications.error}.</p>
    <table>
      <thead><tr><th>ID</th><th>Class</th><th>Status</th><th>Claim</th><th>Value</th><th>Field</th><th>Endpoint</th><th>Observed</th><th>Age s</th></tr></thead>
      <tbody>${evidenceRows}</tbody>
    </table>
    <h2>Investigation brief</h2>
    ${report.brief.executiveSummary.map((paragraph) => `<p>${text(paragraph.text)}</p><p class="meta">Citations: ${text(paragraph.evidenceIds.join(", "))}</p>`).join("")}
    <h2>Tensions</h2>
    ${tensions || "<p>No tensions were recorded.</p>"}
    <h2>Structured claims and challenge</h2>
    ${structured ? `<ul>${structured}</ul>` : ""}
    ${challenge?.composer?.freeText ? `<p>Optional free text (kept as written): ${text(challenge.composer.freeText)}</p>` : ""}
    ${assessments}
    <h2>Revision history</h2>
    ${revisions || "<p>No revisions were attached.</p>"}
    <h2>Partial data and failures</h2>
    ${failures}
    <h2>Limitations</h2>
    <ul>${report.limitations.map((line) => `<li>${text(line)}</li>`).join("")}</ul>
  </main>
</body>
</html>`;
}
