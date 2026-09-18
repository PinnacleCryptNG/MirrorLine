import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center shadow-md">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--accent-light)] text-[var(--accent)] font-mono font-bold text-2xl border border-[var(--accent-border)]">
          404
        </div>
        <h1 className="mt-4 text-xl font-bold tracking-tight text-[var(--text-primary)]">
          Page or Investigation Not Found
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          The route you requested does not exist or may have moved. Mirrorline investigations and comparisons are run from the primary trading desk.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-[var(--accent)] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors"
          >
            Return to Trading Desk
          </Link>
          <Link
            href="/privacy"
            className="inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] px-4 py-2.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </main>
  );
}
