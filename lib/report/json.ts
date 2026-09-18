import type { InvestigationReport } from "./types";
import { sanitizeForExport } from "./sanitize";

export function serializeInvestigationReportJson(report: InvestigationReport): string {
  return `${JSON.stringify(sanitizeForExport(report), null, 2)}\n`;
}
