import { jsonError, jsonOk } from "@/lib/api/respond";
import {
  getCompanyOverview,
  getSessionSnapshot,
  getStockInfoForSymbol,
} from "@/lib/bitget/session";
import { normalizeRTokenSymbol, underlyingFromPair } from "@/lib/bitget/symbols";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const symbol = url.searchParams.get("symbol") ?? undefined;
    const includeCompany = url.searchParams.get("company") === "true";
    const sessionResult = await getSessionSnapshot();
    let stock = null;
    let stockProvenance = null;
    let company = null;
    let companyProvenance = null;
    let pair: string | undefined;
    if (symbol) {
      pair = normalizeRTokenSymbol(symbol);
      const stockResult = await getStockInfoForSymbol(pair);
      stock = stockResult.stock;
      stockProvenance = stockResult.provenance;
      if (includeCompany) {
        const code = stock?.underlyingCode ?? underlyingFromPair(pair);
        const companyResult = await getCompanyOverview(code);
        company = companyResult.company;
        companyProvenance = companyResult.provenance;
      }
    }
    return jsonOk({
      symbol: pair,
      session: sessionResult.session,
      states: sessionResult.states,
      calendar: sessionResult.calendar,
      stock,
      company,
      provenance: {
        ...sessionResult.provenance,
        stock: stockProvenance,
        company: companyProvenance,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
