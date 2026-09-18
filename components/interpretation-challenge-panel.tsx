"use client";

import { useMemo, useState } from "react";
import { buildInterpretationChallenge } from "@/lib/challenge/engine";
import type {
  AttackPoint,
  ClaimAssessment,
  ClaimAssessmentStatus,
  InterpretationChallenge,
  MissingItem,
} from "@/lib/challenge/types";
import type { InvestigationBrief, CitedEvidence } from "@/lib/brief/types";
import type { EvidencePack } from "@/lib/evidence/types";
import type { EvidenceClass } from "@/lib/market/fields";

function statusColor(status: ClaimAssessmentStatus) {
  if (status === "supported") return "border-[#36D399]/40 bg-[#36D399]/10 text-[#36D399]";
  if (status === "challenged") return "border-[#FF6B7A]/40 bg-[#FF6B7A]/10 text-[#FF6B7A]";
  if (status === "unsupported") return "border-[#F4C95D]/40 bg-[#F4C95D]/10 text-[#F4C95D]";
  return "border-[#8B7CFF]/40 bg-[#8B7CFF]/10 text-[#8B7CFF]";
}

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

function EvidenceDetails({
  assessment,
  citations,
}: {
  assessment: ClaimAssessment;
  citations: Record<string, CitedEvidence>;
}) {
  const groups = [
    { label: "Supports", refs: assessment.supportingEvidence },
    { label: "Challenges", refs: assessment.challengingEvidence },
    { label: "Limits", refs: assessment.limitingEvidence },
  ].filter((group) => group.refs.length > 0);

  if (groups.length === 0) {
    return <Citations ids={assessment.evidenceIds} citations={citations} />;
  }

  return (
    <details className="mt-2 rounded-md border border-[#252B36] bg-[#080A0F] px-3 py-2">
      <summary className="cursor-pointer font-data text-[11px] uppercase tracking-wide text-[#9BA3B2]">
        Evidence references ({assessment.evidenceIds.length})
      </summary>
      <Citations ids={assessment.evidenceIds} citations={citations} />
      {groups.map((group) => (
        <div key={group.label} className="mt-3">
          <p className="font-data text-[10px] uppercase tracking-wide text-[#626B7A]">{group.label}</p>
          <ul className="mt-1 space-y-2">
            {group.refs.map((ref) => {
              const source = ref.sources[0];
              return (
                <li key={`${group.label}-${ref.evidenceId}`} className="text-xs text-[#9BA3B2]">
                  <p className="text-[#F5F7FA]">
                    {ref.evidenceId} · {ref.classification} · {ref.status}
                  </p>
                  <p className="mt-0.5">{ref.claim}</p>
                  {source ? (
                    <p className="mt-0.5 font-data text-[11px] text-[#626B7A]">
                      {source.provider}
                      {source.endpoint ? ` · ${source.endpoint}` : ""} · {source.field}
                      {ref.observedAt ? ` · observed ${ref.observedAt}` : ""}
                      {ref.freshnessSeconds !== undefined && ref.freshnessSeconds !== null
                        ? ` · age ${ref.freshnessSeconds}s`
                        : ""}
                    </p>
                  ) : null}
                  {ref.caveats.length > 0 ? (
                    <ul className="mt-1 list-disc pl-4">
                      {ref.caveats.map((caveat) => (
                        <li key={caveat}>{caveat}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </details>
  );
}

function AssessmentCard({
  assessment,
  citations,
}: {
  assessment: ClaimAssessment;
  citations: Record<string, CitedEvidence>;
}) {
  return (
    <article className="border-b border-[#252B36] px-4 py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2 py-0.5 font-data text-[10px] uppercase ${statusColor(assessment.status)}`}>
          {assessment.status}
        </span>
        <span className="font-data text-[10px] uppercase text-[#626B7A]">{assessment.source}</span>
        {assessment.kind ? (
          <span className="font-data text-[10px] uppercase text-[#626B7A]">{assessment.kind}</span>
        ) : null}
        {assessment.requiresClarification ? (
          <span className="rounded-full border border-[#8B7CFF]/30 px-2 py-0.5 font-data text-[10px] uppercase text-[#8B7CFF]">
            needs clarification
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-[#F5F7FA]">{assessment.text}</p>
      <p className="mt-2 text-sm text-[#9BA3B2]">{assessment.reasoning}</p>
      {assessment.ruleId ? (
        <p className="mt-1 font-data text-[11px] text-[#626B7A]">Matched by {assessment.ruleId}</p>
      ) : (
        <p className="mt-1 font-data text-[11px] text-[#626B7A]">No matching rule</p>
      )}
      <EvidenceDetails assessment={assessment} citations={citations} />
    </article>
  );
}

function MissingCard({ item, citations }: { item: MissingItem; citations: Record<string, CitedEvidence> }) {
  return (
    <article className="border-b border-[#252B36] px-4 py-3 last:border-b-0">
      <p className="font-data text-[10px] uppercase tracking-wide text-[#F4C95D]">{item.kind}</p>
      <h4 className="mt-1 text-sm font-medium text-[#F5F7FA]">{item.title}</h4>
      <p className="mt-1 text-sm text-[#9BA3B2]">{item.text}</p>
      <Citations ids={item.evidenceIds} citations={citations} />
    </article>
  );
}

function AttackCard({ point, citations }: { point: AttackPoint; citations: Record<string, CitedEvidence> }) {
  return (
    <article className="rounded-xl border border-[#FF6B7A]/30 bg-[#FF6B7A]/5 px-4 py-3">
      <h4 className="text-sm font-medium text-[#F5F7FA]">{point.title}</h4>
      <p className="mt-1 text-sm text-[#9BA3B2]">{point.text}</p>
      <Citations ids={point.evidenceIds} citations={citations} />
    </article>
  );
}

export function InterpretationChallengePanel({
  symbol,
  pack,
  brief,
}: {
  symbol: string;
  pack: EvidencePack | null;
  brief: InvestigationBrief | null;
}) {
  const [thesis, setThesis] = useState(
    `${symbol} rose because of earnings news and is cheap versus the US stock.`,
  );
  const [reason, setReason] = useState("");
  const [assumptions, setAssumptions] = useState("");
  const [challenge, setChallenge] = useState<InterpretationChallenge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canRun = Boolean(pack && brief && thesis.trim());

  const run = () => {
    if (!pack || !brief) {
      setError("Verify live data first so the challenge can use the investigation brief and evidence pack.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next = buildInterpretationChallenge({
        pack,
        brief,
        input: {
          thesis,
          reason: reason.trim() || undefined,
          assumptions: assumptions
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
        },
      });
      setChallenge(next);
    } catch (err) {
      setChallenge(null);
      setError(err instanceof Error ? err.message : "Unable to run the interpretation challenge.");
    } finally {
      setBusy(false);
    }
  };

  const summaryChips = useMemo(() => {
    if (!challenge) {
      return [];
    }
    return [
      { label: "Supported", value: challenge.summary.supported, status: "supported" as const },
      { label: "Challenged", value: challenge.summary.challenged, status: "challenged" as const },
      { label: "Unsupported", value: challenge.summary.unsupported, status: "unsupported" as const },
      { label: "Unassessed", value: challenge.summary.unassessed, status: "unassessed" as const },
    ];
  }, [challenge]);

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-xl border border-[#252B36] bg-[#10131A] px-4 py-4">
        <p className="font-data text-xs tracking-[0.24em] text-[#8B7CFF]">INTERPRETATION CHALLENGE · NON-ADVISORY</p>
        <h2 className="mt-2 text-lg font-medium">Stress-test an initial reading of {symbol}</h2>
        <p className="mt-1 text-sm text-[#9BA3B2]">
          Submit a thesis. The engine matches claims to the existing brief and evidence pack with transparent
          rules. Unmapped language is unassessed, not false. This is not a buy or sell recommendation.
        </p>

        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            run();
          }}
        >
          <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-[#626B7A]">
            Selected rToken
            <input
              value={symbol}
              readOnly
              className="h-10 rounded-md border border-[#252B36] bg-[#080A0F] px-3 font-data text-sm text-[#9BA3B2]"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-[#626B7A]">
            Initial interpretation / thesis
            <textarea
              value={thesis}
              onChange={(event) => setThesis(event.target.value)}
              rows={4}
              className="rounded-md border border-[#252B36] bg-[#080A0F] px-3 py-2 text-sm text-[#F5F7FA] outline-none focus:border-[#8B7CFF]"
              placeholder="rAAPL rose because of earnings and is cheap versus Apple."
              aria-label="Initial interpretation"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-[#626B7A]">
            Optional reason
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={2}
              className="rounded-md border border-[#252B36] bg-[#080A0F] px-3 py-2 text-sm text-[#F5F7FA] outline-none focus:border-[#8B7CFF]"
              placeholder="Why you read the move this way"
              aria-label="Optional reason"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-[#626B7A]">
            Optional key assumptions (one per line)
            <textarea
              value={assumptions}
              onChange={(event) => setAssumptions(event.target.value)}
              rows={3}
              className="rounded-md border border-[#252B36] bg-[#080A0F] px-3 py-2 text-sm text-[#F5F7FA] outline-none focus:border-[#8B7CFF]"
              placeholder={"The last print is current.\nThe public book is Reality depth."}
              aria-label="Optional key assumptions"
            />
          </label>
          <button
            type="submit"
            disabled={!canRun || busy}
            className="h-10 w-fit rounded-md bg-[#8B7CFF] px-4 text-sm font-medium text-[#080A0F] disabled:opacity-60"
          >
            {busy ? "Running challenge…" : "Run challenge"}
          </button>
        </form>

        {!pack || !brief ? (
          <p className="mt-3 text-sm text-[#9BA3B2]">
            Verify live data to load the investigation brief and evidence pack before running a challenge.
          </p>
        ) : null}
        {error ? <p className="mt-3 text-sm text-[#FF6B7A]">{error}</p> : null}
      </div>

      {challenge ? (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            {summaryChips.map((chip) => (
              <div key={chip.label} className="rounded-xl border border-[#252B36] bg-[#10131A] px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-[#626B7A]">{chip.label}</p>
                <p className={`mt-1 font-data text-xl ${statusColor(chip.status).split(" ").pop()}`}>{chip.value}</p>
              </div>
            ))}
          </div>

          {challenge.failures.length > 0 ? (
            <div className="rounded-xl border border-[#F4C95D]/40 bg-[#F4C95D]/10 px-4 py-3 text-sm text-[#F4C95D]">
              Partial data: {challenge.failures.map((failure) => `${failure.resource} (${failure.message})`).join(" · ")}.
              Available assessments are retained. Missing resources are not treated as proof against the thesis.
            </div>
          ) : null}

          <section className="rounded-xl border border-[#252B36] bg-[#10131A]">
            <div className="border-b border-[#252B36] px-4 py-3">
              <h3 className="text-sm font-medium">Claim assessments</h3>
              <p className="mt-1 text-xs text-[#9BA3B2]">
                Supported matches available evidence. Challenged is limited or contradicted by pack items.
                Unsupported lacks evidence. Unassessed could not be mapped reliably.
              </p>
            </div>
            {challenge.assessments.map((assessment) => (
              <AssessmentCard key={assessment.id} assessment={assessment} citations={challenge.citations} />
            ))}
          </section>

          <section className="rounded-xl border border-[#252B36] bg-[#10131A]">
            <div className="border-b border-[#252B36] px-4 py-3">
              <h3 className="text-sm font-medium">What am I missing?</h3>
              <p className="mt-1 text-xs text-[#9BA3B2]">
                Unknowns, caveats, tensions, and partial failures from the investigation brief. UNKNOWN is an
                unanswered question, not a negative finding.
              </p>
            </div>
            {challenge.whatAmIMissing.length === 0 ? (
              <p className="px-4 py-3 text-sm text-[#9BA3B2]">No additional unknowns were attached to this thesis.</p>
            ) : (
              challenge.whatAmIMissing.map((item) => (
                <MissingCard key={item.id} item={item} citations={challenge.citations} />
              ))
            )}
          </section>

          <section className="flex flex-col gap-3">
            <div>
              <h3 className="text-sm font-medium">Attack my thesis</h3>
              <p className="mt-1 text-xs text-[#9BA3B2]">
                Evidence-based counterpoints only. No invented opposing tape, news, or prices. Uncertainty is not
                treated as proof the thesis is false.
              </p>
            </div>
            {challenge.attackMyThesis.length === 0 ? (
              <p className="rounded-xl border border-[#252B36] bg-[#10131A] px-4 py-3 text-sm text-[#9BA3B2]">
                No evidence-based counterpoints were generated from challenged claims or relevant brief tensions.
              </p>
            ) : (
              challenge.attackMyThesis.map((point) => (
                <AttackCard key={point.id} point={point} citations={challenge.citations} />
              ))
            )}
          </section>

          {challenge.traderAssumptions.length > 0 ? (
            <section className="rounded-xl border border-[#252B36] bg-[#10131A] px-4 py-3">
              <h3 className="text-sm font-medium">Assumptions in play</h3>
              <ul className="mt-2 space-y-2 text-sm text-[#9BA3B2]">
                {challenge.traderAssumptions.map((assumption) => (
                  <li key={assumption.id}>
                    <span className="font-data text-[10px] uppercase text-[#F4C95D]">{assumption.origin}</span>
                    <span className="ml-2">{assumption.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
