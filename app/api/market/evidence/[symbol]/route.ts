import { jsonError, jsonOk } from "@/lib/api/respond";
import { getEvidencePack } from "@/lib/evidence/get-pack";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ symbol: string }> },
) {
  try {
    const { symbol } = await context.params;
    const question = new URL(request.url).searchParams.get("question") ?? undefined;
    const pack = await getEvidencePack(symbol, { question });
    return jsonOk(pack);
  } catch (error) {
    return jsonError(error);
  }
}
