import type { EvidenceClass } from "@/lib/market/fields";
import type {
  BriefParagraph,
  BriefSection,
  CitedEvidence,
  InvestigationBrief,
  InvestigationTension,
} from "@/lib/brief/types";

function classColor(classification: EvidenceClass) {
  if (classification === "FACT") return "border-[#5EA7FF]/30 bg-[#5EA7FF]/10 text-[#5EA7FF]";
  if (classification === "INFERENCE") return "border-[#8B7CFF]/30 bg-[#8B7CFF]/10 text-[#8B7CFF]";
  if (classification === "ASSUMPTION") return "border-[#F4C95D]/30 bg-[#F4C95D]/10 text-[#F4C95D]";
  return "border-[#626B7A]/40 bg-[#171B24] text-[#9BA3B2]";
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
    <p className="mt-2 flex flex-wrap gap-1">
      {ids.map((id) => {
        const cited = citations[id];
        return (
          <a
            key={id}
            href={`#ev-${id}`}
            className={`rounded-full border px-2 py-0.5 font-data text-[10px] uppercase ${
              cited ? classColor(cited.classification) : "border-[#252B36] text-[#9BA3B2]"
            }`}
          >
            {cited ? `${cited.classification} · ${id}` : id}
          </a>
        );
      })}
    </p>
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
    return <p className="px-4 py-3 text-sm text-[#9BA3B2]">No items in this section.</p>;
  }
  return (
    <div className="divide-y divide-[#252B36]">
      {paragraphs.map((paragraph) => (
        <div key={paragraph.id} className="px-4 py-3">
          <p className="text-sm text-[#F5F7FA]">{paragraph.text}</p>
          <Citations ids={paragraph.evidenceIds} citations={citations} />
          {paragraph.evidenceIds.map((id) => {
            const cited = citations[id];
            const source = cited?.sources[0];
            if (!cited || !source) {
              return null;
            }
            return (
              <p key={`${paragraph.id}-${id}-src`} className="mt-1 font-data text-[11px] text-[#626B7A]">
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
    <section className="rounded-xl border border-[#252B36] bg-[#10131A]">
      <div className="border-b border-[#252B36] px-4 py-3">
        <h3 className="text-sm font-medium">{section.title}</h3>
        <p className="mt-1 text-xs text-[#9BA3B2]">{section.intro}</p>
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
  const tone =
    tension.severity === "contradiction"
      ? "border-[#FF6B7A]/40 bg-[#FF6B7A]/10"
      : "border-[#F4C95D]/40 bg-[#F4C95D]/10";
  return (
    <article className={`rounded-xl border px-4 py-3 ${tone}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-data text-[10px] uppercase tracking-wide">
          {tension.severity}
        </span>
        <h3 className="text-sm font-medium text-[#F5F7FA]">{tension.title}</h3>
      </div>
      <p className="mt-2 text-sm text-[#F5F7FA]">{tension.explanation}</p>
      <Citations ids={tension.evidenceIds} citations={citations} />
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
      <section className="rounded-xl border border-[#252B36] bg-[#10131A] px-4 py-6 text-sm text-[#9BA3B2]">
        An investigation brief has not been generated yet. Verify live data to turn the evidence pack into a
        non-advisory brief.
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!hideHeader && (
        <section className="rounded-xl border border-[#252B36] bg-[#10131A] px-4 py-4">
          <p className="font-data text-xs tracking-[0.24em] text-[#8B7CFF]">INVESTIGATION BRIEF · NON-ADVISORY</p>
          <h2 className="mt-2 text-lg font-medium">{brief.question}</h2>
          <p className="mt-1 font-data text-xs text-[#626B7A]">
            {brief.tokenSymbol} · {brief.pair} · retrieved {brief.retrievedAt}
          </p>
        </section>
      )}

      {/* Contradictions and key structural tensions first */}
      {brief.tensions.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-[#F5F7FA]">Key Structural Tensions & Contradictions</h3>
          {brief.tensions.map((tension) => (
            <TensionCard key={tension.id} tension={tension} citations={brief.citations} />
          ))}
        </section>
      )}

      <section className="rounded-xl border border-[#252B36] bg-[#10131A]">
        <div className="border-b border-[#252B36] px-4 py-3">
          <h3 className="text-sm font-medium">Executive summary</h3>
        </div>
        <Paragraphs paragraphs={brief.executiveSummary} citations={brief.citations} />
      </section>

      {/* Detailed brief sections organized under clean disclosure */}
      <details className="group rounded-xl border border-[#252B36] bg-[#10131A] overflow-hidden">
        <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-xs font-medium text-[#9BA3B2] hover:bg-[#171B24] transition-colors">
          <span className="font-data text-xs text-[#8B7CFF]">EXPLORE DETAILED BRIEF SECTIONS (Facts, Inferences, Assumptions, Unknowns)</span>
          <span className="font-data text-[11px] text-[#8B7CFF] group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="border-t border-[#252B36] p-4 flex flex-col gap-4">
          <Section section={brief.marketAndSession} citations={brief.citations} />
          <Section section={brief.observedFacts} citations={brief.citations} />
          <Section section={brief.derivedInferences} citations={brief.citations} />
          <Section section={brief.assumptions} citations={brief.citations} />
          <Section section={brief.unknowns} citations={brief.citations} />
        </div>
      </details>

      <section className="rounded-xl border border-[#252B36] bg-[#10131A]">
        <div className="border-b border-[#252B36] px-4 py-3">
          <h3 className="text-sm font-medium">What the evidence does not establish</h3>
        </div>
        <Paragraphs paragraphs={brief.doesNotEstablish} citations={brief.citations} />
      </section>

      <section className="rounded-xl border border-[#252B36] bg-[#10131A]">
        <div className="border-b border-[#252B36] px-4 py-3">
          <h3 className="text-sm font-medium">Questions to investigate next</h3>
        </div>
        <Paragraphs paragraphs={brief.nextQuestions} citations={brief.citations} />
      </section>
    </div>
  );
}
