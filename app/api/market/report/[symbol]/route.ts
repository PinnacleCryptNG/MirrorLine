import { NextResponse } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/respond";
import {
  assembleInvestigationReport,
  parseReportFormat,
  parseReportInput,
  serializeInvestigationReportHtml,
  serializeInvestigationReportJson,
  serializeInvestigationReportMarkdown,
} from "@/lib/report";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ symbol: string }> },
) {
  try {
    await context.params;
    const format = parseReportFormat(new URL(request.url).searchParams.get("format"));
    const input = parseReportInput(await request.json());
    const report = assembleInvestigationReport(input);
    if (format === "markdown") {
      return new NextResponse(serializeInvestigationReportMarkdown(report), {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="mirrorline-${report.tokenSymbol}-investigation.md"`,
        },
      });
    }
    if (format === "html") {
      return new NextResponse(serializeInvestigationReportHtml(report), {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `inline; filename="mirrorline-${report.tokenSymbol}-investigation.html"`,
        },
      });
    }
    return jsonOk(JSON.parse(serializeInvestigationReportJson(report)));
  } catch (error) {
    if (
      error instanceof Error &&
      /report input|evidence pack|investigation brief|format must be/i.test(error.message)
    ) {
      return NextResponse.json({ error: "INVALID_INPUT", message: error.message }, { status: 400 });
    }
    return jsonError(error);
  }
}
