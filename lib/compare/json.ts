import { sanitizeForExport } from "@/lib/report/sanitize";
import type { ComparisonReport } from "./types";

export function serializeComparisonReportJson(report: ComparisonReport): string {
  return `${JSON.stringify(sanitizeForExport(report), null, 2)}\n`;
}
