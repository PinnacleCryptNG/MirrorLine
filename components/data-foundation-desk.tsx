"use client";

import { useMemo, useState } from "react";

export type CheckStatus = "pass" | "fail" | "skipped";

export interface VerificationReport {
  symbol: string;
  startedAt: string;
  finishedAt: string;
  credentialsConfigured: boolean;
  summary: { passed: number; failed: number; skipped: number; total: number };
  checks: Array<{
    id: string;
    title: string;
    endpoint: string;
    access: string;
    status: CheckStatus;
    detail: string;
    sample?: unknown;
  }>;
  notes: string[];
}

export interface InstrumentRow {
  symbol: string;
  tokenSymbol: string;
  underlyingSymbol: string;
  displayName: string | null;
  status: string;
  weekendTradable: boolean | null;
}

const DEMO_SYMBOLS = ["rAAPL", "rNVDA", "rTSLA", "rMSFT", "rCOIN"];

function statusColor(status: CheckStatus) {
  if (status === "pass") return "text-[#36D399] border-[#36D399]/30 bg-[#36D399]/10";
  if (status === "fail") return "text-[#FF6B7A] border-[#FF6B7A]/30 bg-[#FF6B7A]/10";
  return "text-[#F4C95D] border-[#F4C95D]/30 bg-[#F4C95D]/10";
}

export function DataFoundationDesk({
  initialSymbol,
  initialReport,
  initialInstruments,
  initialInstrumentTotal,
  initialSnapshot,
  initialError,
}: {
  initialSymbol: string;
  initialReport: VerificationReport | null;
  initialInstruments: InstrumentRow[];
  initialInstrumentTotal: number | null;
  initialSnapshot: Record<string, unknown> | null;
  initialError: string | null;
}) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [query, setQuery] = useState("");
  const [report, setReport] = useState<VerificationReport | null>(initialReport);
  const [instruments, setInstruments] = useState<InstrumentRow[]>(initialInstruments);
  const [instrumentTotal, setInstrumentTotal] = useState<number | null>(initialInstrumentTotal);
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | null>(initialSnapshot);
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);

  const load = async (nextSymbol: string, nextQuery = query) => {
    setLoading(true);
    setError(null);
    try {
      const [verifyRes, instrumentsRes, snapshotRes] = await Promise.all([
        fetch(`/api/market/verify?symbol=${encodeURIComponent(nextSymbol)}`, { cache: "no-store" }),
        fetch(
          `/api/market/instruments?limit=12&query=${encodeURIComponent(nextQuery)}`,
          { cache: "no-store" },
        ),
        fetch(`/api/market/snapshot/${encodeURIComponent(nextSymbol)}`, { cache: "no-store" }),
      ]);

      const verifyJson = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyJson.message ?? "Verification request failed");
      }
      setReport(verifyJson);

      const instrumentsJson = await instrumentsRes.json();
      if (!instrumentsRes.ok) {
        throw new Error(instrumentsJson.message ?? "Instrument discovery failed");
      }
      setInstruments(instrumentsJson.instruments ?? []);
      setInstrumentTotal(instrumentsJson.total ?? null);

      const snapshotJson = await snapshotRes.json();
      if (!snapshotRes.ok) {
        setSnapshot(null);
        setError(snapshotJson.message ?? "Snapshot request failed");
      } else {
        setSnapshot(snapshotJson);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load Bitget data");
    } finally {
      setLoading(false);
    }
  };

  const ticker = snapshot && typeof snapshot.ticker === "object" ? (snapshot.ticker as Record<string, unknown>) : null;
  const session =
    snapshot && typeof snapshot.session === "object" ? (snapshot.session as Record<string, unknown>) : null;

  const change = ticker?.change24hPercentNumber;
  const changeNumber = typeof change === "number" ? change : undefined;

  const lastPrice = typeof ticker?.lastPrice === "string" ? ticker.lastPrice : "—";
  const summary = useMemo(() => report?.summary, [report]);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-8 md:px-8">
      <header className="flex flex-col gap-4 border-b border-[#252B36] pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-data text-xs tracking-[0.24em] text-[#8B7CFF]">MIRRORLINE · MILESTONE 1</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Bitget Data Foundation</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#9BA3B2]">
            Server-side Reality rToken market data for the Bitget AI × Crypto Hackathon. This screen verifies live
            Bitget responses. It does not trade, and it does not invent prices, depth, or market status.
          </p>
        </div>
        <form
          className="flex w-full flex-col gap-2 md:w-auto md:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            void load(symbol, query);
          }}
        >
          <input
            value={symbol}
            onChange={(event) => setSymbol(event.target.value)}
            className="h-10 rounded-md border border-[#252B36] bg-[#10131A] px-3 font-data text-sm outline-none focus:border-[#8B7CFF]"
            placeholder="rAAPL or RAAPLUSDT"
            aria-label="rToken symbol"
          />
          <button
            type="submit"
            className="h-10 rounded-md bg-[#8B7CFF] px-4 text-sm font-medium text-[#080A0F] disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Reading Bitget…" : "Verify live data"}
          </button>
        </form>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        <Stat label="Discovered rTokens" value={instrumentTotal === null ? "—" : String(instrumentTotal)} />
        <Stat label="Last price" value={lastPrice} mono />
        <Stat
          label="24h change"
          value={
            changeNumber === undefined ? "—" : `${(changeNumber * 100).toFixed(2)}%`
          }
          tone={changeNumber === undefined ? "muted" : changeNumber >= 0 ? "positive" : "negative"}
        />
        <Stat
          label="US session"
          value={typeof session?.marketSession === "string" ? session.marketSession : "UNKNOWN"}
        />
      </section>

      {error ? (
        <div className="rounded-lg border border-[#FF6B7A]/40 bg-[#FF6B7A]/10 px-4 py-3 text-sm text-[#FF6B7A]">
          Market data unavailable. {error}
        </div>
      ) : null}

      <section className="flex flex-wrap gap-2">
        {DEMO_SYMBOLS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setSymbol(item);
              void load(item, query);
            }}
            className={`rounded-full border px-3 py-1 font-data text-xs ${
              symbol.toUpperCase().includes(item.slice(1).toUpperCase())
                ? "border-[#8B7CFF] text-[#8B7CFF]"
                : "border-[#252B36] text-[#9BA3B2]"
            }`}
          >
            {item}
          </button>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border border-[#252B36] bg-[#10131A]">
          <div className="flex items-center justify-between border-b border-[#252B36] px-4 py-3">
            <h2 className="text-sm font-medium">Verification checks</h2>
            {summary ? (
              <p className="font-data text-xs text-[#9BA3B2]">
                {summary.passed} passed · {summary.failed} failed · {summary.skipped} skipped
              </p>
            ) : (
              <p className="text-xs text-[#626B7A]">Waiting for Bitget…</p>
            )}
          </div>
          <div className="divide-y divide-[#252B36]">
            {report?.checks.map((check) => (
              <article key={check.id} className="px-4 py-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-sm">{check.title}</h3>
                    <p className="mt-1 font-data text-[11px] text-[#626B7A]">{check.endpoint}</p>
                  </div>
                  <span className={`w-fit rounded-full border px-2 py-0.5 font-data text-[11px] uppercase ${statusColor(check.status)}`}>
                    {check.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[#9BA3B2]">{check.detail}</p>
              </article>
            ))}
            {loading && !report ? (
              <p className="px-4 py-6 text-sm text-[#9BA3B2]">Reading market conditions from Bitget.</p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-[#252B36] bg-[#10131A]">
            <div className="border-b border-[#252B36] px-4 py-3">
              <h2 className="text-sm font-medium">Discovered instruments</h2>
              <form
                className="mt-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void load(symbol, query);
                }}
              >
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="h-9 w-full rounded-md border border-[#252B36] bg-[#080A0F] px-3 text-sm outline-none focus:border-[#8B7CFF]"
                  placeholder="Filter by rNVDA, AAPL, Tesla…"
                  aria-label="Filter instruments"
                />
              </form>
            </div>
            <ul className="max-h-80 overflow-auto">
              {instruments.length === 0 ? (
                <li className="px-4 py-6 text-sm text-[#9BA3B2]">No Reality instruments matched that filter.</li>
              ) : (
                instruments.map((item) => (
                  <li key={item.symbol}>
                    <button
                      type="button"
                      onClick={() => {
                        setSymbol(item.tokenSymbol);
                        void load(item.tokenSymbol, query);
                      }}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-[#171B24]"
                    >
                      <span>
                        <span className="font-data text-sm">{item.tokenSymbol}</span>
                        <span className="ml-2 text-xs text-[#626B7A]">
                          {item.displayName ?? item.underlyingSymbol}
                        </span>
                      </span>
                      <span className="font-data text-[11px] text-[#9BA3B2]">{item.status}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-[#252B36] bg-[#10131A] px-4 py-3 text-sm text-[#9BA3B2]">
            <h2 className="mb-2 text-sm font-medium text-[#F5F7FA]">Known limits</h2>
            <ul className="space-y-2">
              {(report?.notes ?? [
                "Verification has not completed yet.",
              ]).map((note) => (
                <li key={note}>• {note}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  mono,
  tone = "muted",
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "muted" | "positive" | "negative";
}) {
  const color =
    tone === "positive" ? "text-[#36D399]" : tone === "negative" ? "text-[#FF6B7A]" : "text-[#F5F7FA]";
  return (
    <div className="rounded-xl border border-[#252B36] bg-[#10131A] px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-[#626B7A]">{label}</p>
      <p className={`mt-1 text-xl ${mono ? "font-data" : ""} ${color}`}>{value}</p>
    </div>
  );
}
