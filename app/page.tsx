import { DataFoundationDesk, type InstrumentRow, type VerificationReport } from "@/components/data-foundation-desk";
import { discoverRealityInstruments } from "@/lib/bitget/assets";
import { isBitgetError } from "@/lib/bitget/errors";
import { getMarketSnapshot } from "@/lib/market/context";
import { runBitgetVerification } from "@/lib/bitget/verify";
import type { MarketSnapshotPayload } from "@/lib/market/types";

export const dynamic = "force-dynamic";

export default async function Page() {
  let report: VerificationReport | null = null;
  let instruments: InstrumentRow[] = [];
  let instrumentTotal: number | null = null;
  let error: string | null = null;
  let snapshot: MarketSnapshotPayload | null = null;

  try {
    const [verification, discovery, marketSnapshot] = await Promise.all([
      runBitgetVerification("rAAPL"),
      discoverRealityInstruments(undefined, { status: "online", query: "", limit: 12 }),
      getMarketSnapshot("rAAPL"),
    ]);
    report = verification;
    instruments = discovery.instruments;
    instrumentTotal = discovery.total;
    snapshot = marketSnapshot;
  } catch (err) {
    error = isBitgetError(err)
      ? err.message
      : err instanceof Error
        ? err.message
        : "Unable to load Bitget data";
  }

  return (
    <DataFoundationDesk
      initialSymbol="rAAPL"
      initialReport={report}
      initialInstruments={instruments}
      initialInstrumentTotal={instrumentTotal}
      initialSnapshot={snapshot}
      initialError={error}
    />
  );
}
