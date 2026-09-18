import { jsonError, jsonOk } from "@/lib/api/respond";
import { getInterpretationChallenge } from "@/lib/challenge/get-challenge";
import { parseThesisInput } from "@/lib/challenge/engine";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function inputFromRequest(request: Request, body: unknown): ReturnType<typeof parseThesisInput> {
  if (request.method === "GET") {
    const url = new URL(request.url);
    const assumptionsParam = url.searchParams.get("assumptions");
    return parseThesisInput({
      thesis: url.searchParams.get("thesis") ?? "",
      reason: url.searchParams.get("reason") ?? undefined,
      assumptions: assumptionsParam
        ? assumptionsParam.split("|").map((item) => item.trim()).filter(Boolean)
        : undefined,
    });
  }
  return parseThesisInput(body);
}

async function handle(request: Request, symbol: string) {
  try {
    let body: unknown = {};
    if (request.method === "POST") {
      const contentType = request.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        body = await request.json();
      }
    }
    const input = inputFromRequest(request, body);
    const question = new URL(request.url).searchParams.get("question") ?? undefined;
    const challenge = await getInterpretationChallenge(symbol, input, { question });
    return jsonOk(challenge);
  } catch (error) {
    if (error instanceof Error && /thesis|input|character limit/i.test(error.message)) {
      return NextResponse.json({ error: "INVALID_INPUT", message: error.message }, { status: 400 });
    }
    return jsonError(error);
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await context.params;
  return handle(request, symbol);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await context.params;
  return handle(request, symbol);
}
