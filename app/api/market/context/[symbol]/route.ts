import { jsonError, jsonOk } from "@/lib/api/respond";
import { getMarketContext } from "@/lib/market/context";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ symbol: string }> },
) {
  try {
    const { symbol } = await context.params;
    const marketContext = await getMarketContext(symbol);
    return jsonOk(marketContext);
  } catch (error) {
    return jsonError(error);
  }
}
