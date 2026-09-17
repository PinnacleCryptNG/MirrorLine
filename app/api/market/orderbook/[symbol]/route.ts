import { jsonError, jsonOk } from "@/lib/api/respond";
import {
  getOptionalPublicOrderBook,
  getOptionalRealityOrderBook,
} from "@/lib/bitget/orderbook";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ symbol: string }> },
) {
  try {
    const { symbol } = await context.params;
    const [publicBook, realityBook] = await Promise.all([
      getOptionalPublicOrderBook(symbol),
      getOptionalRealityOrderBook(symbol),
    ]);
    return jsonOk({
      publicOrderBook: publicBook,
      realityOrderBook: realityBook,
    });
  } catch (error) {
    return jsonError(error);
  }
}
