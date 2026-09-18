import { jsonOk } from "@/lib/api/respond";
import { listDemoScenarios } from "@/lib/fixtures";

export const dynamic = "force-dynamic";

export async function GET() {
  const scenarios = listDemoScenarios();
  return jsonOk({
    total: scenarios.length,
    scenarios,
    disclaimer:
      "DEMO / FIXTURE DATA: These deterministic scenarios are provided for hackathon demonstration. They do not query live Bitget endpoints.",
  });
}
