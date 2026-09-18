import { DataFoundationDesk, type InstrumentRow } from "@/components/data-foundation-desk";
import { discoverRealityInstruments } from "@/lib/bitget/assets";

export const dynamic = "force-dynamic";

export default async function Page() {
  let instruments: InstrumentRow[] = [];
  let instrumentTotal: number | null = null;

  try {
    const discovery = await discoverRealityInstruments(undefined, { status: "online", query: "", limit: 12 });
    instruments = discovery.instruments;
    instrumentTotal = discovery.total;
  } catch {
    // Graceful fallback if Bitget discovery is temporarily unreachable on cold start
    instruments = [];
    instrumentTotal = null;
  }

  return (
    <DataFoundationDesk
      initialSymbol="rAAPL"
      initialReport={null}
      initialInstruments={instruments}
      initialInstrumentTotal={instrumentTotal}
      initialSnapshot={null}
      initialError={null}
    />
  );
}
