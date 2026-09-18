import type { EvidencePack } from "@/lib/evidence/types";
import type { InvestigationBrief } from "@/lib/brief/types";
import type { InterpretationChallenge } from "@/lib/challenge/types";
import type { MarketContext } from "@/lib/market/types";
import type { ThesisRevision } from "@/lib/revision/types";
import { REPORT_FORMATS, type ReportFormat } from "./types";
import type { AssembleReportInput } from "./assemble";

export function parseReportFormat(value: string | null | undefined): ReportFormat {
  const normalized = (value ?? "json").trim().toLowerCase();
  if (normalized === "md") {
    return "markdown";
  }
  if (REPORT_FORMATS.includes(normalized as ReportFormat)) {
    return normalized as ReportFormat;
  }
  throw new Error("Report format must be json, markdown, or html.");
}

export function parseReportInput(raw: unknown): AssembleReportInput {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Report input must be an object containing the loaded pack and brief.");
  }
  const record = raw as Record<string, unknown>;
  const pack = record.pack as EvidencePack | undefined;
  const brief = record.brief as InvestigationBrief | undefined;
  if (!pack || typeof pack !== "object" || !Array.isArray(pack.items) || !pack.investigation) {
    throw new Error("An evidence pack from the currently loaded snapshot is required.");
  }
  if (!brief || typeof brief !== "object" || brief.advisory !== false || !brief.citations) {
    throw new Error("An investigation brief from the currently loaded snapshot is required.");
  }
  const challenge =
    record.challenge && typeof record.challenge === "object"
      ? (record.challenge as InterpretationChallenge)
      : null;
  const revisions = Array.isArray(record.revisions) ? (record.revisions as ThesisRevision[]) : undefined;
  const context = record.context && typeof record.context === "object" ? (record.context as MarketContext) : undefined;
  const question = typeof record.question === "string" ? record.question : undefined;
  const createdAt = typeof record.createdAt === "string" ? record.createdAt : undefined;
  return { pack, brief, context, challenge, revisions, question, createdAt };
}
