import { escapeHtml } from "@/lib/report/sanitize";
import type { ComparisonReport, ComparisonSymbolColumn } from "./types";

function text(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  return escapeHtml(String(value));
}

function heading(column: ComparisonSymbolColumn): string {
  const name = column.tokenSymbol ?? column.requestedSymbol;
  return `${name}`;
}

export function serializeComparisonReportHtml(report: ComparisonReport): string {
  const headers = report.symbols
    .map((column) => {
      return `<th>${text(heading(column))}<div class="meta">${text(column.snapshot?.retrievedAt ?? column.error ?? "snapshot not loaded")}${column.snapshot?.stale ? " · stale" : ""}</div></th>`;
    })
    .join("");
  const rows = report.table
    .map((row) => {
      const cells = report.symbols
        .map((column) => {
          const entry = row.cells[column.key];
          if (!entry) {
            return "<td>—</td>";
          }
          const ids = entry.evidenceIds.length > 0 ? `<div class="meta">Evidence: ${text(entry.evidenceIds.join(", "))}</div>` : "";
          return `<td><span class="pill">${text(entry.statuses.join(" · "))}</span><p>${text(entry.reasoning)}</p>${ids}</td>`;
        })
        .join("");
      return `<tr><th>${text(row.renderedText)}</th>${cells}</tr>`;
    })
    .join("");

  const symbolNotes = report.symbols
    .map((column) => {
      if (column.loadStatus !== "loaded") {
        return `<article class="card"><h3>${text(heading(column))}</h3><p>${text(column.loadStatus)}: ${text(column.error ?? "snapshot unavailable")}. This column is not filled from another symbol.</p></article>`;
      }
      const tensions = column.tensions
        .map((tension) => `<li>${text(tension.severity)}: ${text(tension.title)} — ${text(tension.explanation)} (evidence ${text(tension.evidenceIds.join(", ") || "none")})</li>`)
        .join("");
      return `<article class="card">
        <h3>${text(heading(column))}</h3>
        <p class="meta">Snapshot ${text(column.snapshot?.id)} · retrieved ${text(column.snapshot?.retrievedAt)}</p>
        <p>FACT ${column.classifications?.fact ?? 0} · INFERENCE ${column.classifications?.inference ?? 0} · ASSUMPTION ${column.classifications?.assumption ?? 0} · UNKNOWN ${column.classifications?.unknown ?? 0}</p>
        ${column.failures.length > 0 ? `<p>Partial data: ${text(column.failures.map((item) => `${item.resource} (${item.message})`).join(" · "))}</p>` : ""}
        ${tensions ? `<p>Tensions remain interpretation risks:</p><ul>${tensions}</ul>` : ""}
      </article>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Mirrorline multi-symbol comparison</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: Georgia, "Times New Roman", serif; color: #111; background: #fff; margin: 0; }
    main { max-width: 1100px; margin: 0 auto; padding: 32px 24px 64px; }
    h1, h2, h3 { font-family: system-ui, sans-serif; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #ddd; padding: 8px; vertical-align: top; }
    th { background: #f4f4f5; text-align: left; }
    .meta { color: #444; font-size: 12px; font-family: ui-monospace, monospace; }
    .pill { display: inline-block; border: 1px solid #999; padding: 1px 8px; font-size: 11px; text-transform: uppercase; font-family: ui-monospace, monospace; }
    .card { border: 1px solid #ddd; padding: 12px 16px; margin: 12px 0; }
    @media print { .no-print { display: none !important; } }
  </style>
</head>
<body>
  <main>
    <p class="no-print meta"><button type="button" onclick="window.print()">Print or save as PDF</button></p>
    <p class="meta">NON-ADVISORY · MULTI-SYMBOL COMPARISON</p>
    <h1>Mirrorline multi-symbol comparison</h1>
    <p>This export does not rank symbols, recommend trades, or predict price. Each column keeps its own snapshot timestamp.</p>
    <ul>
      <li>Report created: <strong>${text(report.createdAt)}</strong></li>
      <li>Columns: ${report.symbols.map((item) => text(item.tokenSymbol ?? item.requestedSymbol)).join(", ")}</li>
    </ul>
    <h2>Disclaimers</h2>
    <ul>${report.disclaimers.map((line) => `<li>${text(line)}</li>`).join("")}</ul>
    ${report.freeText ? `<p>Optional free text (kept as written): ${text(report.freeText)}</p>` : ""}
    <h2>Comparison table</h2>
    <table>
      <thead><tr><th>Shared claim</th>${headers}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <h2>Per-symbol snapshot notes</h2>
    ${symbolNotes}
    <h2>Limitations</h2>
    <ul>${report.limitations.map((line) => `<li>${text(line)}</li>`).join("")}</ul>
  </main>
</body>
</html>`;
}
