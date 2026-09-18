import { NextResponse } from "next/server";
import { jsonOk } from "@/lib/api/respond";
import { getDemoSnapshot, SUPPORTED_DEMO_SYMBOLS } from "@/lib/fixtures";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ symbol: string }> },
) {
  try {
    const { symbol } = await context.params;
    const snapshot = getDemoSnapshot(symbol);
    if (!snapshot) {
      return NextResponse.json(
        {
          error: "DEMO_FIXTURE_NOT_FOUND",
          message: `Symbol '${symbol}' is not available in demo fixture mode. Supported demo fixtures: ${SUPPORTED_DEMO_SYMBOLS.join(", ")}. Demo mode does not fall back to live data.`,
          supportedSymbols: SUPPORTED_DEMO_SYMBOLS,
        },
        { status: 404 },
      );
    }
    return jsonOk(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error reading demo fixture";
    return NextResponse.json({ error: "DEMO_FIXTURE_ERROR", message }, { status: 500 });
  }
}
