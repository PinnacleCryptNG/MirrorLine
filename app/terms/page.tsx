import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms and Conditions · Mirrorline",
  description: "Terms of use, non-advisory disclaimer, and limitations for Mirrorline.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] px-4 py-12 md:px-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-[var(--accent)] hover:underline mb-6"
        >
          ← Back to Mirrorline Workspace
        </Link>
        <p className="font-mono text-xs uppercase tracking-wider text-[var(--accent)]">Legal & Transparency</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Terms and Conditions</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Effective Date: September 18, 2026</p>
      </div>

      <div className="space-y-8 text-sm leading-relaxed text-[var(--text-secondary)]">
        <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">1. Non-Advisory and Educational Disclaimer</h2>
          <div className="rounded-lg border border-[var(--accent-border)] bg-[var(--accent-light)] p-4 text-[var(--accent-text)] mb-4">
            <p className="font-semibold">CORE DISCLAIMER:</p>
            <p className="mt-1">
              Mirrorline is an informational and research software tool designed to audit market evidence. It does NOT provide financial, investment, legal, tax, or trading advice. It never issues buy, sell, or hold recommendations, and cannot guarantee any outcome or return.
            </p>
          </div>
          <p>
            You agree and acknowledge that all assessments, classifications (FACT, INFERENCE, ASSUMPTION, UNKNOWN), tensions, and thesis challenges are algorithmic evaluations based on available market snapshots. You remain solely responsible for your own financial evaluations and trading decisions.
          </p>
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">2. No Trade Execution or Brokerage Services</h2>
          <p>
            Mirrorline is neither a broker, financial institution, exchange, nor an order-routing facility.
            The software:
          </p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Does not accept deposits or custody funds in any form.</li>
            <li>Does not connect to private trading keys, execute orders, or manage user positions.</li>
            <li>Does not rank instruments or endorse any specific asset.</li>
          </ul>
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">3. Nature of Market Data and Demo Fixtures</h2>
          <div className="space-y-3">
            <p>
              <strong>Live Market Data:</strong> Live context is retrieved via public Bitget APIs. Market data can be delayed, subject to network jitter, or temporarily stale. Mirrorline transparently marks stale or unavailable data, but makes no warranties regarding upstream exchange API uptime or completeness.
            </p>
            <p>
              <strong>Demo Fixtures:</strong> Demo scenarios utilize frozen, deterministic sample data for educational and hackathon evaluation purposes. Demo data does not represent live market prices and must never be used for real trading.
            </p>
            <p>
              <strong>No Underlying Tape Fabrication:</strong> As documented in our architecture, Bitget rTokens track real-world assets, but Bitget does not provide direct US National Best Bid and Offer (NBBO) tape data. Mirrorline classifies such references as explicit UNKNOWNS rather than fabricating external data.
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">4. Permitted and Acceptable Use</h2>
          <p>You agree to use Mirrorline strictly in compliance with all applicable laws and regulations. You must not:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Attempt to reverse-engineer, disrupt, or launch denial-of-service attacks against the application endpoints.</li>
            <li>Submit malicious payloads, injection attempts, or exploit automated query interfaces.</li>
            <li>Misrepresent Mirrorline reports as licensed financial advice or guaranteed investment analysis.</li>
          </ul>
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">5. Disclaimer of Warranties & Limitation of Liability</h2>
          <p>
            THE SERVICE IS PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. TO THE MAXIMUM EXTENT PERMITTED UNDER APPLICABLE LAW, THE AUTHORS AND CONTRIBUTORS SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES, INCLUDING BUT NOT LIMITED TO FINANCIAL LOSSES OR TRADING LOSSES ARISING FROM THE USE OF OR INABILITY TO USE THE SERVICE.
          </p>
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">6. Hackathon & Open Source Notice</h2>
          <p>
            Mirrorline was developed as a research prototype for the Bitget AI Hackathon Genesis Season 2. Code, documentation, and architecture specifications are made available under their respective open-source licensing terms.
          </p>
        </section>
      </div>
    </main>
  );
}
