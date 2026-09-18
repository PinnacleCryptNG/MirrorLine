import type { ComparisonReport, ComparisonSymbolColumn } from "./types";

function cell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  return String(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function symbolHeading(column: ComparisonSymbolColumn): string {
  const name = column.tokenSymbol ?? column.requestedSymbol;
  const retrieved = column.snapshot?.retrievedAt ?? "snapshot not loaded";
  const stale = column.snapshot?.stale ? "stale" : column.loadStatus;
  return `${name} (${stale}; retrieved ${retrieved})`;
}

export function serializeComparisonReportMarkdown(report: ComparisonReport): string {
  const lines: string[] = [
    `# Mirrorline multi-symbol comparison`,
    "",
    "**Non-advisory.** This comparison does not rank symbols, recommend trades, or predict price.",
    "",
    `- Report created: ${report.createdAt}`,
    `- Shared claims: ${report.sharedClaims.length}`,
    `- Columns: ${report.symbols.map((item) => item.tokenSymbol ?? item.requestedSymbol).join(", ")}`,
    `- Report id: \`${report.reportId}\``,
    "",
    "Each column keeps its own evidence snapshot. These retrievedAt values are not a shared print:",
    "",
  ];
  for (const column of report.symbols) {
    lines.push(`- **${column.tokenSymbol ?? column.requestedSymbol}:** ${symbolHeading(column)}`);
    if (column.error) {
      lines.push(`  - Load error: ${column.error}`);
    }
    if (column.snapshot?.warning) {
      lines.push(`  - ${column.snapshot.warning}`);
    }
  }

  lines.push("", "## Disclaimers", "");
  for (const line of report.disclaimers) {
    lines.push(`- ${line}`);
  }

  lines.push("", "## Shared structured claims", "");
  for (const claim of report.sharedClaims) {
    const fields = Object.entries(claim.fields)
      .map(([key, value]) => `${key}=${value}`)
      .join(", ");
    lines.push(`- \`${claim.id}\` · ${claim.kind} · ${fields}`);
  }
  if (report.freeText) {
    lines.push("", "Optional free text (kept as written):", "", report.freeText, "");
  }

  lines.push("", "## Comparison table", "");
  const header = ["Claim", ...report.symbols.map((column) => cell(symbolHeading(column)))];
  lines.push(`| ${header.join(" | ")} |`);
  lines.push(`| ${header.map(() => "---").join(" | ")} |`);
  for (const row of report.table) {
    const values = report.symbols.map((column) => {
      const entry = row.cells[column.key];
      if (!entry) {
        return "—";
      }
      return cell(`${entry.statuses.join(", ")} — ${entry.reasoning}`);
    });
    lines.push(`| ${cell(row.renderedText)} | ${values.join(" | ")} |`);
  }

  lines.push("", "## Per-symbol snapshot notes", "");
  for (const column of report.symbols) {
    lines.push(`### ${column.tokenSymbol ?? column.requestedSymbol}`, "");
    if (column.loadStatus !== "loaded") {
      lines.push(`${column.loadStatus}: ${column.error ?? "snapshot unavailable"}. This column is not filled from another symbol.`, "");
      continue;
    }
    lines.push(
      `- Snapshot id: \`${column.snapshot?.id}\``,
      `- Retrieved: ${column.snapshot?.retrievedAt}`,
      `- Classifications: FACT ${column.classifications?.fact ?? 0}, INFERENCE ${column.classifications?.inference ?? 0}, ASSUMPTION ${column.classifications?.assumption ?? 0}, UNKNOWN ${column.classifications?.unknown ?? 0}`,
      `- Failures: ${column.failures.length === 0 ? "none attached" : column.failures.map((item) => `${item.resource} (${item.message})`).join("; ")}`,
      "",
    );
    if (column.tensions.length > 0) {
      lines.push("Tensions (interpretation risks, not verdicts):", "");
      for (const tension of column.tensions) {
        lines.push(`- ${tension.severity}: ${tension.title} — ${tension.explanation}`);
        lines.push(`  - Evidence: ${tension.evidenceIds.join(", ") || "none"}`);
      }
      lines.push("");
    }
  }

  lines.push("## Limitations", "");
  for (const line of report.limitations) {
    lines.push(`- ${line}`);
  }
  lines.push("");
  return lines.join("\n");
}
