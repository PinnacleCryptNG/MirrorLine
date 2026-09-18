import { NextResponse } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/respond";
import { parseReportFormat } from "@/lib/report";
import {
  assembleComparisonReport,
  parseComparisonInput,
  serializeComparisonReportHtml,
  serializeComparisonReportJson,
  serializeComparisonReportMarkdown,
} from "@/lib/compare";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const format = parseReportFormat(new URL(request.url).searchParams.get("format"));
    const input = parseComparisonInput(await request.json());
    const report = assembleComparisonReport(input);
    if (format === "markdown") {
      return new NextResponse(serializeComparisonReportMarkdown(report), {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="mirrorline-comparison.md"`,
        },
      });
    }
    if (format === "html") {
      return new NextResponse(serializeComparisonReportHtml(report), {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `inline; filename="mirrorline-comparison.html"`,
        },
      });
    }
    return jsonOk(JSON.parse(serializeComparisonReportJson(report)));
  } catch (error) {
    if (
      error instanceof Error &&
      /comparison|structured claim|required|duplicate|rTokens|malformed|format must be|unknown kind|permitted/i.test(
        error.message,
      )
    ) {
      return NextResponse.json({ error: "INVALID_INPUT", message: error.message }, { status: 400 });
    }
    return jsonError(error);
  }
}
