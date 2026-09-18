import type { InvestigationReport, ReportFieldSnapshot, ReportRevision } from "./types";

function cell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  return String(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function fieldLine(label: string, field: ReportFieldSnapshot | null): string[] {
  if (!field) {
    return [`- **${label}:** not present in this pack.`];
  }
  const source = [field.provider, field.endpoint, field.field].filter(Boolean).join(" · ");
  const time = [
    field.observedAt ? `observed ${field.observedAt}` : null,
    field.retrievedAt ? `retrieved ${field.retrievedAt}` : null,
    field.freshnessSeconds !== null && field.freshnessSeconds !== undefined
      ? `age ${field.freshnessSeconds}s`
      : null,
  ]
    .filter(Boolean)
    .join("; ");
  return [
    `- **${label}:** ${field.classification} · ${field.status} · ${cell(field.value)}`,
    `  - ${field.claim}`,
    source ? `  - Source: ${source}` : "  - Source: not attached",
    time ? `  - Timing: ${time}` : "  - Timing: not attached",
  ];
}

function revisionBlock(revision: ReportRevision): string[] {
  const lines = [
    `### Revision ${revision.sequence} (\`${revision.revisionId}\`)`,
    "",
    `- Created: ${revision.createdAt}`,
    `- Snapshot changed: ${revision.snapshotChanged ? "yes" : "no"}`,
    `- Attribution warning: ${revision.snapshotWarning ?? "none"}`,
    `- Summary: ${revision.summary.added} added, ${revision.summary.removed} removed, ${revision.summary.edited} edited, ${revision.summary.reordered} reordered, ${revision.summary.unchanged} unchanged, ${revision.summary.statusChanged} status changes`,
    "",
  ];
  for (const claim of revision.claims) {
    lines.push(
      `- **${claim.change}** (${claim.attribution}; ${claim.matchReason})`,
      `  - Before: ${claim.previousText ?? "—"}`,
      `  - After: ${claim.currentText ?? "—"}`,
    );
  }
  lines.push("");
  return lines;
}

export function serializeInvestigationReportMarkdown(report: InvestigationReport): string {
  const challenge = report.challenge;
  const lines: string[] = [
    `# Mirrorline investigation report — ${report.tokenSymbol}`,
    "",
    ...(report.isDemoFixture
      ? [
          `> **DEMO / FIXTURE DATA** · Frozen demonstration scenario: ${report.fixtureLabel ?? report.fixtureId ?? "fixture"}. This export does not contain live Bitget market data.`,
          "",
        ]
      : []),
    `**Non-advisory.** This is not a trade recommendation and not a price prediction.`,
    "",
    `- Report created: ${report.createdAt}`,
    `- Evidence snapshot retrieved: ${report.snapshot.retrievedAt}${report.isDemoFixture ? " (fixture timestamp)" : ""}`,
    `- Snapshot id: \`${report.snapshot.id}\``,
    ...(report.isDemoFixture ? [`- Fixture scenario: \`${report.fixtureId ?? "custom"}\``] : []),
    `- Pair: ${report.pair}`,
    `- Question: ${report.question}`,
    `- Report id: \`${report.reportId}\``,
    "",
  ];

  if (report.snapshot.stale || report.snapshot.warning) {
    lines.push("## Snapshot freshness", "");
    if (report.snapshot.stale) {
      lines.push(
        `**Stale evidence is present.** Item ids: ${report.snapshot.staleEvidenceIds.join(", ") || "none listed"}. Stale facts keep their older timestamps; they are not replaced with guessed prints.`,
        "",
      );
    }
    if (report.snapshot.warning) {
      lines.push(report.snapshot.warning, "");
    }
  }

  lines.push("## Disclaimers", "");
  for (const line of report.disclaimers) {
    lines.push(`- ${line}`);
  }

  lines.push("", "## Market context summary", "", report.contextSummary.note, "");
  lines.push(...fieldLine("Last price", report.contextSummary.lastPrice));
  lines.push(...fieldLine("24-hour change", report.contextSummary.change24h));
  lines.push(...fieldLine("US session", report.contextSummary.session));
  lines.push(...fieldLine("Named underlying", report.contextSummary.underlying));
  lines.push(...fieldLine("Reference price", report.contextSummary.referencePrice));
  lines.push(...fieldLine("Public UTA book", report.contextSummary.publicUtaDepth));
  lines.push(...fieldLine("Reality depth", report.contextSummary.realityDepth));

  const summary = report.classifications;
  lines.push(
    "",
    "## Evidence pack",
    "",
    `Classification counts: FACT ${summary.fact}, INFERENCE ${summary.inference}, ASSUMPTION ${summary.assumption}, UNKNOWN ${summary.unknown}. Status counts: stale ${summary.stale}, missing ${summary.missing}, error ${summary.error}, unverified ${summary.unverified}.`,
    "",
    "| ID | Class | Status | Claim | Value | Source field | Observed | Freshness |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
  );
  for (const item of report.pack.items) {
    const source = item.sources[0];
    lines.push(
      `| ${cell(item.id)} | ${item.classification} | ${item.status} | ${cell(item.claim)} | ${cell(item.value)} | ${cell(source?.field)} | ${cell(source?.observedAt)} | ${cell(source?.freshnessSeconds)} |`,
    );
  }

  lines.push("", "### Evidence caveats", "");
  for (const item of report.pack.items) {
    if (item.caveats.length === 0) {
      continue;
    }
    lines.push(`- \`${item.id}\`: ${item.caveats.join("; ")}`);
  }

  lines.push("", "## Investigation brief", "");
  for (const paragraph of report.brief.executiveSummary) {
    lines.push(paragraph.text, "");
    if (paragraph.evidenceIds.length > 0) {
      lines.push(`Citations: ${paragraph.evidenceIds.join(", ")}`, "");
    }
  }

  lines.push("### Tensions", "");
  if (report.tensions.length === 0) {
    lines.push("No tensions were recorded.", "");
  }
  for (const tension of report.tensions) {
    lines.push(`- **${tension.severity}: ${tension.title}** — ${tension.explanation}`);
    lines.push(`  - Evidence: ${tension.evidenceIds.join(", ") || "none"}`);
  }

  lines.push("", "## Structured claims and challenge", "");
  if (!challenge) {
    lines.push("No interpretation challenge was attached to this export. The evidence pack and brief still stand.", "");
  } else {
    lines.push(
      `- Challenge snapshot: ${challenge.retrievedAt}`,
      `- Matches evidence snapshot: ${report.snapshot.challengeMatchesSnapshot ? "yes" : "no"}`,
      `- Assessments: ${challenge.summary.supported} supported / ${challenge.summary.challenged} challenged / ${challenge.summary.unsupported} unsupported / ${challenge.summary.unassessed} unassessed`,
      "",
    );
    if (report.structuredClaims.length > 0) {
      lines.push("### Structured claims", "");
      for (const claim of report.structuredClaims) {
        lines.push(
          `- \`${claim.id}\` · ${claim.kind} · ${Object.entries(claim.fields)
            .map(([key, value]) => `${key}=${value}`)
            .join(", ")}`,
        );
      }
      lines.push("");
    }
    if (challenge.composer?.freeText) {
      lines.push("Optional free text (kept as written):", "", challenge.composer.freeText, "");
    }
    lines.push("### Assessments", "");
    for (const assessment of challenge.assessments) {
      lines.push(
        `- **${assessment.status}** — ${assessment.text}`,
        `  - ${assessment.reasoning}`,
        `  - Evidence: ${assessment.evidenceIds.join(", ") || "none"}`,
      );
    }
  }

  lines.push("", "## Revision history", "");
  if (report.revisions.length === 0) {
    lines.push("No revisions were attached.", "");
  } else {
    for (const revision of report.revisions) {
      lines.push(...revisionBlock(revision));
    }
  }

  lines.push("## Partial data and failures", "");
  if (report.failures.length === 0) {
    lines.push("No upstream resource failures were attached.", "");
  } else {
    for (const failure of report.failures) {
      lines.push(`- ${failure.resource}${failure.code ? ` (${failure.code})` : ""}: ${failure.message}`);
    }
    lines.push("");
  }

  lines.push("## Limitations", "");
  for (const line of report.limitations) {
    lines.push(`- ${line}`);
  }
  lines.push("");
  return lines.join("\n");
}
