import { jsonError, jsonOk } from "@/lib/api/respond";
import { discoverRealityInstruments } from "@/lib/bitget/assets";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("query") ?? undefined;
    const status = url.searchParams.get("status") ?? "online";
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : 40;
    const result = await discoverRealityInstruments(undefined, {
      query,
      status: status === "all" ? undefined : status,
      limit: Number.isFinite(limit) ? limit : 40,
    });
    return jsonOk({
      total: result.total,
      returned: result.instruments.length,
      instruments: result.instruments,
      provenance: result.provenance,
    });
  } catch (error) {
    return jsonError(error);
  }
}
