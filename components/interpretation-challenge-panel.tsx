"use client";

import { useMemo, useState } from "react";
import { buildInterpretationChallenge } from "@/lib/challenge/engine";
import { splitClaimText } from "@/lib/challenge/split";
import { buildThesisRevision } from "@/lib/revision/diff";
import { joinClaimSentences } from "@/lib/revision/claims";
import { buildComposerChallenge } from "@/lib/composer/challenge";
import { StructuredClaimComposer } from "@/components/structured-claim-composer";
import { ThesisRevisionPanel } from "@/components/thesis-revision-panel";
import type {
  AttackPoint,
  ClaimAssessment,
  ClaimAssessmentStatus,
  InterpretationChallenge,
  MissingItem,
  StructuredClaim,
} from "@/lib/challenge/types";
import type { ThesisRevision } from "@/lib/revision/types";
import type { InvestigationBrief, CitedEvidence } from "@/lib/brief/types";
import type { EvidencePack } from "@/lib/evidence/types";
import type { EvidenceClass } from "@/lib/market/fields";

function statusColor(status: ClaimAssessmentStatus) {
  if (status === "supported")
    return "border-[var(--positive-border)] bg-[var(--positive-bg)] text-[var(--positive)]";
  if (status === "challenged")
    return "border-[var(--negative-border)] bg-[var(--negative-bg)] text-[var(--negative)]";
  if (status === "unsupported")
    return "border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning)]";
  return "border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]";
}

function classColor(classification: EvidenceClass) {
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
    <div className="mt-2 flex flex-wrap gap-1.5">
      {ids.map((id) => {
        const cited = citations[id];
        return (
          <a
            key={id}
            href={`#ev-${id}`}
            className={`rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase hover:opacity-80 transition-opacity ${
              cited ? classColor(cited.classification) : "border-[var(--border)] text-[var(--text-muted)]"
            }`}
          >
            {cited ? `${cited.classification} · ${id}` : id}
          </a>
        );
      })}
    </div>
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
    <details className="mt-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] px-3.5 py-2.5">
      <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-wide text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
        Evidence references ({assessment.evidenceIds.length})
      </summary>
      <Citations ids={assessment.evidenceIds} citations={citations} />
      {groups.map((group) => (
        <div key={group.label} className="mt-3">
          <p className="font-mono text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{group.label}</p>
          <ul className="mt-1.5 space-y-2">
            {group.refs.map((ref) => {
              const source = ref.sources[0];
              return (
                <li key={`${group.label}-${ref.evidenceId}`} className="rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2 text-xs text-[var(--text-secondary)]">
                  <p className="font-medium text-[var(--text-primary)]">
                    {ref.evidenceId} · {ref.classification} · {ref.status}
                  </p>
                  <p className="mt-0.5">{ref.claim}</p>
                  {source ? (
                    <p className="mt-0.5 font-mono text-[10px] text-[var(--text-muted)]">
                      {source.provider}
                      {source.endpoint ? ` · ${source.endpoint}` : ""} · {source.field}
                      {ref.observedAt ? ` · observed ${ref.observedAt}` : ""}
                      {ref.freshnessSeconds !== undefined && ref.freshnessSeconds !== null
                        ? ` · age ${ref.freshnessSeconds}s`
                        : ""}
                    </p>
                  ) : null}
                  {ref.caveats.length > 0 ? (
                    <ul className="mt-1 list-disc pl-4 text-[11px] text-[var(--text-muted)]">
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
    <article className="border-b border-[var(--border-subtle)] p-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase font-bold ${statusColor(assessment.status)}`}>
          {assessment.status}
        </span>
        <span className="font-mono text-[10px] uppercase text-[var(--text-muted)]">{assessment.source}</span>
        {assessment.kind ? (
          <span className="font-mono text-[10px] uppercase text-[var(--text-muted)]">{assessment.kind}</span>
        ) : null}
        {assessment.requiresClarification ? (
          <span className="rounded-full border border-[var(--warning-border)] bg-[var(--warning-bg)] px-2 py-0.5 font-mono text-[10px] uppercase text-[var(--warning)] font-semibold">
            needs clarification
          </span>
        ) : null}
        {assessment.structuredClaimId ? (
          <span className="font-mono text-[10px] uppercase text-[var(--text-muted)]">{assessment.structuredClaimId}</span>
        ) : null}
      </div>
      <p className="mt-2 text-sm font-medium text-[var(--text-primary)] leading-snug">{assessment.text}</p>
      <p className="mt-1.5 text-xs text-[var(--text-secondary)] leading-relaxed">{assessment.reasoning}</p>
      {assessment.ruleId ? (
        <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">Rule: {assessment.ruleId}</p>
      ) : null}
      <EvidenceDetails assessment={assessment} citations={citations} />
    </article>
  );
}

function AttackPointCard({ point }: { point: AttackPoint }) {
  return (
    <article className="border-b border-[var(--border-subtle)] p-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[var(--warning-border)] bg-[var(--warning-bg)] px-2.5 py-0.5 font-mono text-[10px] uppercase text-[var(--warning)] font-bold">
          counterargument
        </span>
        <h4 className="text-sm font-semibold text-[var(--text-primary)]">{point.title}</h4>
      </div>
      <p className="mt-1.5 text-xs text-[var(--text-secondary)] leading-relaxed">{point.text}</p>
    </article>
  );
}

function MissingItemCard({ item }: { item: MissingItem }) {
  return (
    <article className="border-b border-[var(--border-subtle)] p-4 last:border-b-0">
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-[var(--border)] bg-[var(--bg-subtle)] px-2 py-0.5 font-mono text-[10px] uppercase text-[var(--text-muted)] font-bold">
          {item.kind}
        </span>
        <h4 className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</h4>
      </div>
      <p className="mt-1.5 text-xs text-[var(--text-secondary)] leading-relaxed">{item.text}</p>
    </article>
  );
}

export function InterpretationChallengePanel({
  symbol,
  pack,
  brief,
  onInvestigationChange,
}: {
  symbol: string;
  pack: EvidencePack | null;
  brief: InvestigationBrief | null;
  onInvestigationChange?: (state: {
    challenge: InterpretationChallenge | null;
    history: ThesisRevision[];
  }) => void;
}) {
  const [structuredClaims, setStructuredClaims] = useState<StructuredClaim[]>([]);
  const [thesis, setThesis] = useState("");
  const [reason, setReason] = useState("");
  const [assumptions, setAssumptions] = useState("");
  const [addClaim, setAddClaim] = useState("");
  const [challenge, setChallenge] = useState<InterpretationChallenge | null>(null);
  const [history, setHistory] = useState<ThesisRevision[]>([]);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sentences = useMemo(() => splitClaimText(thesis), [thesis]);
  const canRun = Boolean(pack && brief);
  const hasInput = structuredClaims.length > 0 || thesis.trim().length > 0;

  const snapshotStale = useMemo(() => {
    if (!challenge || !pack) {
      return false;
    }
    return challenge.retrievedAt !== pack.investigation.retrievedAt;
  }, [challenge, pack]);

  const run = (asRevision = false) => {
    if (!pack || !brief) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next =
        structuredClaims.length > 0
          ? buildComposerChallenge({
              pack,
              brief,
              claims: structuredClaims,
              freeText: thesis.trim() || undefined,
              reason: reason.trim() || undefined,
              assumptions: assumptions
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean),
            })
          : buildInterpretationChallenge({
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
      if (asRevision && challenge) {
        const revision = buildThesisRevision({
          previous: challenge,
          current: next,
          sequence: history.length + 1,
        });
        const nextHistory = [...history, revision];
        setHistory(nextHistory);
        setSelectedRevisionId(revision.revisionId);
        setChallenge(next);
        onInvestigationChange?.({ challenge: next, history: nextHistory });
      } else {
        setChallenge(next);
        onInvestigationChange?.({ challenge: next, history });
      }
    } catch (err) {
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
      { label: "Supported", value: challenge.summary.supported, status: "supported" as const, desc: "Matches available data" },
      { label: "Challenged", value: challenge.summary.challenged, status: "challenged" as const, desc: "Contradicted by data" },
      { label: "Unsupported", value: challenge.summary.unsupported, status: "unsupported" as const, desc: "Lacks evidence" },
      { label: "Unassessed", value: challenge.summary.unassessed, status: "unassessed" as const, desc: "Unmapped input" },
    ];
  }, [challenge]);

  return (
    <section className="flex flex-col gap-6">
      {/* 1. Header & Composer */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-sm">
        <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] dark:text-[#86C495]">
          Test Ideas · Non-Advisory
        </p>
        <h2 className="mt-1 text-base md:text-lg font-semibold text-[var(--text-primary)]">
          Test whether your idea matches {symbol}&apos;s actual market data
        </h2>
        <p className="mt-1 text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed">
          Add specific claims about prices, sessions, or spreads below, then test them directly against the evidence pack. Mirrorline will evaluate where your idea is supported, where it is challenged, and what information is missing.
        </p>

        <form
          className="mt-4 flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            run(Boolean(challenge));
          }}
        >
          <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-[var(--text-secondary)] font-mono">
            Selected rToken
            <input
              value={symbol}
              readOnly
              className="h-9 w-full max-w-xs rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 font-mono text-xs text-[var(--text-primary)]"
            />
          </label>

          {/* Structured Builder */}
          <StructuredClaimComposer claims={structuredClaims} onChange={setStructuredClaims} />

          {/* Free Text Thesis */}
          <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-[var(--text-secondary)] font-mono">
            Optional free-text thoughts or notes
            <textarea
              value={thesis}
              onChange={(event) => setThesis(event.target.value)}
              rows={3}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] p-3 text-xs md:text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              placeholder="Example: The price drop reflects overnight market closure."
              aria-label="Optional free-text thesis"
            />
          </label>

          {challenge ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] p-3.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] font-mono">
                Claim sentences
              </p>
              <ul className="mt-2 space-y-2">
                {sentences.length === 0 ? (
                  <li className="text-xs text-[var(--text-muted)]">
                    {structuredClaims.length > 0
                      ? "Structured claims are edited from the builder above."
                      : "No claim sentences entered."}
                  </li>
                ) : (
                  sentences.map((sentence, index) => (
                    <li key={`claim-row-${index}`} className="flex flex-col gap-2 sm:flex-row">
                      <input
                        value={sentence}
                        onChange={(event) => {
                          const next = [...sentences];
                          next[index] = event.target.value;
                          setThesis(joinClaimSentences(next));
                        }}
                        className="h-9 flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                        aria-label={`Claim ${index + 1}`}
                      />
                      <button
                        type="button"
                        aria-label={`Remove claim sentence ${index + 1}`}
                        className="h-9 rounded-lg border border-[var(--border)] px-3 text-xs text-[var(--negative)] hover:bg-[var(--negative-bg)]"
                        onClick={() => setThesis(joinClaimSentences(sentences.filter((_, item) => item !== index)))}
                      >
                        Remove
                      </button>
                    </li>
                  ))
                )}
              </ul>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  value={addClaim}
                  onChange={(event) => setAddClaim(event.target.value)}
                  className="h-9 flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  placeholder="Add another sentence to test"
                  aria-label="Add a new claim"
                />
                <button
                  type="button"
                  className="h-9 rounded-lg border border-[var(--accent-border)] bg-[var(--accent-light)] px-3 text-xs font-medium text-[var(--accent)] hover:opacity-90"
                  onClick={() => {
                    if (!addClaim.trim()) return;
                    setThesis(joinClaimSentences([...sentences, addClaim.trim()]));
                    setAddClaim("");
                  }}
                >
                  Add claim
                </button>
              </div>
            </div>
          ) : null}

          <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-[var(--text-secondary)] font-mono">
            Optional reason
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={2}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] p-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              placeholder="Why you read the move this way"
              aria-label="Optional reason"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-[var(--text-secondary)] font-mono">
            Optional key assumptions (one per line)
            <textarea
              value={assumptions}
              onChange={(event) => setAssumptions(event.target.value)}
              rows={2}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] p-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              placeholder={"The last print is current.\nThe public book is Reality depth."}
              aria-label="Optional key assumptions"
            />
          </label>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2.5 pt-2">
            <button
              type="submit"
              disabled={!canRun || busy || (!challenge && !hasInput)}
              className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-xs md:text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors shadow-xs"
            >
              {busy
                ? "Testing against data…"
                : challenge
                  ? "Revise & re-test my idea"
                  : "Test my own idea against this data"}
            </button>
            {challenge ? (
              <button
                type="button"
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-2.5 text-xs md:text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                onClick={() => {
                  setChallenge(null);
                  setHistory([]);
                  setSelectedRevisionId(null);
                  setStructuredClaims([]);
                  setError(null);
                  onInvestigationChange?.({ challenge: null, history: [] });
                }}
              >
                Clear and start fresh
              </button>
            ) : null}
          </div>
        </form>

        {snapshotStale ? (
          <p className="mt-3 text-xs text-[var(--warning)]">
            Live evidence was refreshed at {pack?.investigation.retrievedAt}. The next revision will be compared
            across snapshots, and status changes will not be attributed to the thesis edit alone.
          </p>
        ) : null}
        {!pack || !brief ? (
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            Load market data first to test your idea against Bitget evidence.
          </p>
        ) : null}
        {error ? <p className="mt-3 text-xs text-[var(--negative)]">{error}</p> : null}
      </div>

      {/* 2. Challenge Results */}
      {challenge ? (
        <>
          {/* Assessment Summary Badges with Plain-English Definitions */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            {summaryChips.map((chip) => (
              <div key={chip.label} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-xs">
                <p className="font-mono text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{chip.label}</p>
                <p className={`mt-1 font-mono text-2xl font-bold ${statusColor(chip.status).split(" ").pop()}`}>{chip.value}</p>
                <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{chip.desc}</p>
              </div>
            ))}
          </div>

          {challenge.failures.length > 0 ? (
            <div className="rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)] p-4 text-xs text-[var(--warning)]">
              Partial data: {challenge.failures.map((failure) => `${failure.resource} (${failure.message})`).join(" · ")}.
              Available assessments are retained. Missing resources are not treated as proof against the thesis.
            </div>
          ) : null}

          {/* Detailed Assessments */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-xs">
            <div className="border-b border-[var(--border-subtle)] px-4 py-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Claim assessments</h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Supported matches available evidence. Challenged is limited or contradicted by pack items. Unsupported lacks evidence. Unassessed could not be mapped reliably.
              </p>
            </div>
            {challenge.assessments.map((assessment) => (
              <AssessmentCard key={assessment.id} assessment={assessment} citations={challenge.citations} />
            ))}
          </section>

          {/* Missing items */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-xs">
            <div className="border-b border-[var(--border-subtle)] px-4 py-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">What am I missing? (Information Gaps)</h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Key questions that current Bitget market evidence leaves unanswered.
              </p>
            </div>
            {challenge.whatAmIMissing.map((item) => (
              <MissingItemCard key={item.id} item={item} />
            ))}
          </section>

          {/* Counterarguments */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-xs">
            <div className="border-b border-[var(--border-subtle)] px-4 py-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Critical Checks & Counterarguments</h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                How an opposing investigator could challenge this interpretation using the same evidence.
              </p>
            </div>
            {challenge.attackMyThesis.map((point) => (
              <AttackPointCard key={point.id} point={point} />
            ))}
          </section>

          {/* Revision history panel */}
          <ThesisRevisionPanel
            history={history}
            selectedRevisionId={selectedRevisionId}
            onSelectRevisionId={setSelectedRevisionId}
          />
        </>
      ) : null}
    </section>
  );
}
