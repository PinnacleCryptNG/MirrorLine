import { jsonError, jsonOk } from "@/lib/api/respond";
import { getInvestigationBrief } from "@/lib/brief/get-brief";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ symbol: string }> },
) {
  try {
    const { symbol } = await context.params;
    const question = new URL(request.url).searchParams.get("question") ?? undefined;
    const brief = await getInvestigationBrief(symbol, { question });
    return jsonOk(brief);
  } catch (error) {
    return jsonError(error);
  }
}
