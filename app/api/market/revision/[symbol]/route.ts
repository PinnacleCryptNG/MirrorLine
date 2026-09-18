import { jsonError, jsonOk } from "@/lib/api/respond";
import { NextResponse } from "next/server";
import { buildThesisRevision } from "@/lib/revision/diff";
import { getThesisRevision, parseRevisionRequest } from "@/lib/revision/get-revision";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ symbol: string }> },
) {
  try {
    const { symbol } = await context.params;
    const body = await request.json();
    const parsed = parseRevisionRequest(body);
    if (parsed.current) {
      return jsonOk(
        buildThesisRevision({
          previous: parsed.previous,
          current: parsed.current,
          sequence: parsed.sequence,
        }),
      );
    }
    if (!parsed.input) {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "A revised thesis or a current challenge is required." },
        { status: 400 },
      );
    }
    const question = new URL(request.url).searchParams.get("question") ?? undefined;
    const revision = await getThesisRevision(symbol, {
      previous: parsed.previous,
      input: parsed.input,
      sequence: parsed.sequence,
      question,
    });
    return jsonOk(revision);
  } catch (error) {
    if (error instanceof Error && /thesis|input|previous challenge|character limit/i.test(error.message)) {
      return NextResponse.json({ error: "INVALID_INPUT", message: error.message }, { status: 400 });
    }
    return jsonError(error);
  }
}
