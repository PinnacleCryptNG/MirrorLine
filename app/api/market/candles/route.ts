import { jsonError, jsonOk } from "@/lib/api/respond";
import { BitgetError } from "@/lib/bitget/errors";
import { getCandles } from "@/lib/bitget/history";
import { REALITY_CANDLE_INTERVALS } from "@/lib/bitget/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const symbol = url.searchParams.get("symbol");
    const interval = url.searchParams.get("interval") ?? "1H";
    const limit = url.searchParams.get("limit");
    const startTime = url.searchParams.get("startTime") ?? undefined;
    const endTime = url.searchParams.get("endTime") ?? undefined;
    const historical = url.searchParams.get("historical") === "true";
    if (!symbol) {
      throw new BitgetError({
        code: "BITGET_VALIDATION",
        message: "Query parameter 'symbol' is required.",
        httpStatus: 400,
      });
    }
    const result = await getCandles({
      symbol,
      interval,
      limit: limit ? Number(limit) : 48,
      startTime,
      endTime,
      historical,
    });
    return jsonOk({
      supportedIntervals: REALITY_CANDLE_INTERVALS,
      ...result,
    });
  } catch (error) {
    return jsonError(error);
  }
}
