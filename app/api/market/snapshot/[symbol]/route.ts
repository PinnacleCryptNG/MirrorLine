import { jsonError, jsonOk } from "@/lib/api/respond";
import { getMarketSnapshot } from "@/lib/bitget/snapshot";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ symbol: string }> },
) {
  try {
    const { symbol } = await context.params;
    const snapshot = await getMarketSnapshot(symbol);
    return jsonOk(snapshot);
  } catch (error) {
    return jsonError(error);
  }
}
