import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy · Mirrorline",
  description: "How Mirrorline processes data, preserves privacy, and respects trader anonymity.",
};

export default function PrivacyPolicyPage() {
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
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Effective Date: September 18, 2026</p>
      </div>

      <div className="space-y-8 text-sm leading-relaxed text-[var(--text-secondary)]">
        <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">1. Executive Summary & Privacy Principles</h2>
          <p>
            Mirrorline is a free, non-advisory market investigation research tool built for the Bitget AI Hackathon Genesis Season 2.
            We operate under a strict data minimization principle:
          </p>
          <ul className="mt-3 list-disc pl-5 space-y-2">
            <li><strong>No User Accounts:</strong> Mirrorline does not offer sign-up, login, passwords, or persistent account profiles.</li>
            <li><strong>No Tracking Cookies:</strong> We do not use third-party advertising cookies, cross-site tracking pixels, or fingerprinting scripts.</li>
            <li><strong>No Persistent Database:</strong> Your structured claims, theses, and revisions are processed in-session and are never stored in a central database or sold to third parties.</li>
            <li><strong>No Trading Credentials:</strong> We never request, process, or store your private exchange trading keys, wallet seeds, or personal financial credentials.</li>
          </ul>
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">2. Information We Process</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-[var(--text-primary)]">A. Technical Investigation Inputs</h3>
              <p className="mt-1">
                When you load an rToken symbol or test an idea, your browser transmits the requested symbol, structured claims, or brief questions to our server endpoints. This data is evaluated in-memory against public market data and returned immediately to your browser. It is discarded after processing.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-[var(--text-primary)]">B. Public Market Data</h3>
              <p className="mt-1">
                Public market information (such as tickers, order books, and candle history) is fetched from Bitget public API endpoints. This data contains no personally identifiable information (PII).
              </p>
            </div>
            <div>
              <h3 className="font-medium text-[var(--text-primary)]">C. Standard Web Server Logs</h3>
              <p className="mt-1">
                Like virtually all web applications, infrastructure providers (e.g., hosting platforms or edge routers) may log transient connection data such as IP address, user-agent, and requested path for security, DDoS mitigation, and uptime diagnostics. These logs are ephemeral and retained solely for operational defense.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">3. Third-Party Services</h2>
          <p>Mirrorline interacts with the following external services:</p>
          <ul className="mt-3 list-disc pl-5 space-y-2">
            <li>
              <strong>Bitget Public API:</strong> Server-side requests are made to Bitget’s public market data endpoints (<code className="font-mono text-xs bg-[var(--bg-subtle)] px-1.5 py-0.5 rounded">https://api.bitget.com</code>) to retrieve public quotes and token statistics.
            </li>
            <li>
              <strong>Hosting & CDN:</strong> The application may be hosted on cloud serverless infrastructure (such as Vercel) which manages TLS termination, DDoS defense, and edge distribution.
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">4. Client-Side Storage</h2>
          <p>
            Mirrorline uses client-side localStorage solely for your personal user experience preferences:
          </p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li><code className="font-mono text-xs bg-[var(--bg-subtle)] px-1.5 py-0.5 rounded">theme</code>: Stores your light/dark mode preference.</li>
          </ul>
          <p className="mt-2">
            This preference remains entirely within your local browser sandbox and is never transmitted to our servers or any third party.
          </p>
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">5. Report Exports & Data Portability</h2>
          <p>
            When you export an investigation report in Markdown, HTML, or JSON format, the file is assembled on-demand from the data currently in your view. No copies are stored on the server. You maintain full ownership and control of any exported files.
          </p>
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">6. Changes to this Policy</h2>
          <p>
            As Mirrorline evolves or introduces new features, this policy may be updated. The revised date at the top will indicate when changes become effective.
          </p>
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">7. Contact & Inquiries</h2>
          <p>
            If you have questions regarding this Privacy Policy or Mirrorline’s open research practices, please refer to our GitHub repository or contact the project maintainers through official hackathon channels.
          </p>
        </section>
      </div>
    </main>
  );
}
