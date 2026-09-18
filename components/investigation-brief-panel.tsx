import type { EvidenceClass } from "@/lib/market/fields";
import type {
  BriefParagraph,
  BriefSection,
  CitedEvidence,
  InvestigationBrief,
  InvestigationTension,
} from "@/lib/brief/types";

function classBadge(classification: EvidenceClass) {
  if (classification === "FACT")
    return "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info)]";
  if (classification === "INFERENCE")
    return "border-[var(--accent-border)] bg-[var(--accent-light)] text-[var(--accent-text)] dark:text-[#86C495]";
  if (classification === "ASSUMPTION")
    return "border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning)]";
  return "border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]";
}

function Citations({
  ids,
  citations,
}: {
  ids: string[];
  citations: Record<string, CitedEvidence>;
}) {
  if (ids.length === 0) {
    return null;
  }
  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      {ids.map((id) => {
        const cited = citations[id];
        return (
          <a
            key={id}
            href={`#ev-${id}`}
            className={`rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase transition-opacity hover:opacity-80 ${
              cited ? classBadge(cited.classification) : "border-[var(--border)] text-[var(--text-muted)]"
            }`}
            title={cited ? `${cited.classification}: ${cited.claim}` : id}
          >
            {cited ? `${cited.classification} · ${id}` : id}
          </a>
        );
      })}
    </div>
  );
}

function Paragraphs({
  paragraphs,
  citations,
}: {
  paragraphs: BriefParagraph[];
  citations: Record<string, CitedEvidence>;
}) {
  if (paragraphs.length === 0) {
    return <p className="px-4 py-3 text-xs text-[var(--text-muted)]">No items in this section.</p>;
  }
  return (
    <div className="divide-y divide-[var(--border-subtle)]">
      {paragraphs.map((paragraph) => (
        <div key={paragraph.id} className="px-4 py-3">
          <p className="text-xs md:text-sm text-[var(--text-primary)] leading-relaxed">{paragraph.text}</p>
          <Citations ids={paragraph.evidenceIds} citations={citations} />
          {paragraph.evidenceIds.map((id) => {
            const cited = citations[id];
            const source = cited?.sources[0];
            if (!cited || !source) {
              return null;
            }
            return (
              <p key={`${paragraph.id}-${id}-src`} className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">
                {id}: {source.provider}
                {source.endpoint ? ` · ${source.endpoint}` : ""} · {source.field}
                {source.observedAt ? ` · observed ${source.observedAt}` : ""}
                {source.freshnessSeconds !== undefined && source.freshnessSeconds !== null
                  ? ` · age ${source.freshnessSeconds}s`
                  : ""}
                {cited.status !== "ok" ? ` · ${cited.status}` : ""}
              </p>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Section({
  section,
  citations,
}: {
  section: BriefSection;
  citations: Record<string, CitedEvidence>;
}) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
      <div className="border-b border-[var(--border-subtle)] px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] font-mono">{section.title}</h3>
        <p className="mt-1 text-xs text-[var(--text-muted)] leading-relaxed">{section.intro}</p>
      </div>
      <Paragraphs paragraphs={section.paragraphs} citations={citations} />
    </section>
  );
}

function TensionCard({
  tension,
  citations,
}: {
  tension: InvestigationTension;
  citations: Record<string, CitedEvidence>;
}) {
  const isContradiction = tension.severity === "contradiction";
  const borderTone = isContradiction
    ? "border-[var(--negative-border)] bg-[var(--negative-bg)]"
    : "border-[var(--warning-border)] bg-[var(--warning-bg)]";
  const badgeTone = isContradiction
    ? "text-[var(--negative)] bg-[var(--negative-bg)] border-[var(--negative-border)]"
    : "text-[var(--warning)] bg-[var(--warning-bg)] border-[var(--warning-border)]";

  // Split into plain English headline / first sentence, followed by technical explanation
  const sentences = tension.explanation.split(". ");
  const firstSentence = sentences[0] ? `${sentences[0]}.` : tension.explanation;
  const remainingExplanation = sentences.length > 1 ? sentences.slice(1).join(". ") : null;

  return (
    <article className={`rounded-xl border p-4.5 shadow-2xs ${borderTone}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase font-bold tracking-wider ${badgeTone}`}>
          {isContradiction ? "Direct Mismatch" : "Evidence Gap"}
        </span>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{tension.title}</h3>
      </div>

      {/* 1. Plain English sentence first */}
      <p className="mt-2 text-xs md:text-sm font-medium text-[var(--text-primary)] leading-relaxed">
        {firstSentence}
      </p>

      {/* 2. Then technical details if available */}
      {remainingExplanation && (
        <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
          {remainingExplanation}
        </p>
      )}

      {/* 3. Relevant technical citations and source provenance */}
      <Citations ids={tension.evidenceIds} citations={citations} />
      
      <div className="mt-2.5 pt-2 border-t border-[var(--border-subtle)] flex flex-col gap-1">
        {tension.evidenceIds.map((id) => {
          const cited = citations[id];
          const source = cited?.sources[0];
          if (!cited || !source) return null;
          return (
            <p key={`tension-${tension.id}-${id}`} className="font-mono text-[10px] text-[var(--text-muted)]">
              <strong>{id}</strong> ({cited.classification}): {source.provider} {source.endpoint ? `· ${source.endpoint}` : ""} {source.observedAt ? `· observed ${source.observedAt}` : ""}
            </p>
          );
        })}
      </div>
    </article>
  );
}

export function InvestigationBriefPanel({
  brief,
  hideHeader = false,
}: {
  brief: InvestigationBrief | null;
  hideHeader?: boolean;
}) {
  if (!brief) {
    return (
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-6 text-xs text-[var(--text-muted)]">
        An investigation brief has not been generated yet. Load live or demo data to turn the evidence pack into an everyday brief.
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {!hideHeader && (
        <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] dark:text-[#86C495]">
            Investigation Brief · Non-Advisory Research
          </p>
          <h2 className="mt-1 text-base md:text-lg font-semibold text-[var(--text-primary)]">
            What does the data show for {brief.tokenSymbol}?
          </h2>
          <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">
            {brief.tokenSymbol} · {brief.pair} · retrieved {brief.retrievedAt}
          </p>
        </section>
      )}

      {/* Contradictions and key structural tensions first: Plain English Title */}
      {brief.tensions.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              What Doesn’t Fully Match (Mismatches & Evidence Gaps)
            </h3>
            <span className="font-mono text-xs text-[var(--text-muted)]">
              {brief.tensions.length} item{brief.tensions.length === 1 ? "" : "s"} found
            </span>
          </div>
          {brief.tensions.map((tension) => (
            <TensionCard key={tension.id} tension={tension} citations={brief.citations} />
          ))}
        </section>
      )}

      {/* Executive Summary */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-xs">
        <div className="border-b border-[var(--border-subtle)] px-4 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] font-mono">Executive Summary</h3>
        </div>
        <Paragraphs paragraphs={brief.executiveSummary} citations={brief.citations} />
      </section>

      {/* Detailed brief sections organized under clean progressive disclosure */}
      <details className="group rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden shadow-xs">
        <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold text-[var(--accent)] dark:text-[#86C495]">DETAILED EVIDENCE BREAKDOWN</span>
            <span>Facts, Inferences, Assumptions & Unknowns</span>
          </div>
          <span className="font-mono text-[11px] text-[var(--accent)] dark:text-[#86C495] group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="border-t border-[var(--border)] p-4 flex flex-col gap-4">
          <Section section={brief.marketAndSession} citations={brief.citations} />
          <Section section={brief.observedFacts} citations={brief.citations} />
          <Section section={brief.derivedInferences} citations={brief.citations} />
          <Section section={brief.assumptions} citations={brief.citations} />
          <Section section={brief.unknowns} citations={brief.citations} />
        </div>
      </details>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-xs">
        <div className="border-b border-[var(--border-subtle)] px-4 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] font-mono">What the evidence does not establish</h3>
        </div>
        <Paragraphs paragraphs={brief.doesNotEstablish} citations={brief.citations} />
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-xs">
        <div className="border-b border-[var(--border-subtle)] px-4 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] font-mono">Questions to investigate next</h3>
        </div>
        <Paragraphs paragraphs={brief.nextQuestions} citations={brief.citations} />
      </section>
    </div>
  );
}
