import { jsonError, jsonOk } from "@/lib/api/respond";
import { getTicker } from "@/lib/bitget/market";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ symbol: string }> },
) {
  try {
    const { symbol } = await context.params;
    const result = await getTicker(symbol);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
