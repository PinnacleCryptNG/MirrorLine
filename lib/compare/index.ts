export { assembleComparisonReport } from "./assemble";
export type { AssembleComparisonInput } from "./assemble";
export { parseComparisonInput } from "./parse";
export { parseComparisonSymbol, parseComparisonSymbolList, SUGGESTED_COMPARE_SYMBOLS } from "./symbols";
export { scoreSharedClaims } from "./score";
export { buildComparisonTable } from "./table";
export { serializeComparisonReportMarkdown } from "./markdown";
export { serializeComparisonReportHtml } from "./html";
export { serializeComparisonReportJson } from "./json";
export {
  COMPARISON_DISCLAIMERS,
  COMPARISON_LIMITATIONS,
  MIN_COMPARISON_SYMBOLS,
  MAX_COMPARISON_SYMBOLS,
} from "./types";
export type { ComparisonReport, ComparisonSymbolColumn, ComparisonRow, ComparisonCell } from "./types";
