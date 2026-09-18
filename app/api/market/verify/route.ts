import { jsonError, jsonOk } from "@/lib/api/respond";
import { BitgetError } from "@/lib/bitget/errors";
import { runBitgetVerification } from "@/lib/bitget/verify";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const rawSymbol = url.searchParams.get("symbol") ?? "rAAPL";
    if (rawSymbol.length > 32) {
      return jsonError(new Error("Symbol parameter exceeds maximum allowed length of 32 characters."));
    }
    const symbol = rawSymbol.slice(0, 32);
    const report = await runBitgetVerification(symbol);
    return jsonOk(report);
  } catch (error) {
    if (error instanceof BitgetError) {
      return jsonError(error);
    }
    return jsonError(error);
  }
}
