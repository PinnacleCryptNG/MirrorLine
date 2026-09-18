import { jsonError, jsonOk } from "@/lib/api/respond";
import { discoverRealityInstruments } from "@/lib/bitget/assets";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("query")?.slice(0, 50) ?? undefined;
    const status = url.searchParams.get("status") ?? "online";
    const limitParam = url.searchParams.get("limit");
    const rawLimit = limitParam ? Number(limitParam) : 40;
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(1, rawLimit), 100) : 40;
    const result = await discoverRealityInstruments(undefined, {
      query,
      status: status === "all" ? undefined : status,
      limit,
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
