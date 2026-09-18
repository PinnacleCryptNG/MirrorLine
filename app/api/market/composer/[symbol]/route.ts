import { jsonError, jsonOk } from "@/lib/api/respond";
import { NextResponse } from "next/server";
import { getComposerChallenge } from "@/lib/composer/get-challenge";
import { parseComposerInput } from "@/lib/composer/validate";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ symbol: string }> },
) {
  try {
    const { symbol } = await context.params;
    const body = await request.json();
    const input = parseComposerInput(body);
    const question = new URL(request.url).searchParams.get("question") ?? undefined;
    const challenge = await getComposerChallenge(symbol, input, { question });
    return jsonOk(challenge);
  } catch (error) {
    if (
      error instanceof Error &&
      /composer|structured claim|required|permitted|unknown kind|free-text|limited to/i.test(error.message)
    ) {
      return NextResponse.json({ error: "INVALID_INPUT", message: error.message }, { status: 400 });
    }
    return jsonError(error);
  }
}
