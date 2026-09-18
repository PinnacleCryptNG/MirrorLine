"use client";

import type { CitedEvidence } from "@/lib/brief/types";
import type { ClaimAssessmentStatus } from "@/lib/challenge/types";
import type { EvidenceClass } from "@/lib/market/fields";
import type { ClaimChangeKind, ClaimRevision, StatusChangeAttribution, ThesisRevision } from "@/lib/revision/types";

function statusColor(status: ClaimAssessmentStatus) {
  if (status === "supported")
    return "border-[var(--positive-border)] bg-[var(--positive-bg)] text-[var(--positive)]";
  if (status === "challenged")
    return "border-[var(--negative-border)] bg-[var(--negative-bg)] text-[var(--negative)]";
  if (status === "unsupported")
    return "border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning)]";
  return "border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]";
}

function changeColor(change: ClaimChangeKind) {
  if (change === "added")
    return "border-[var(--positive-border)] bg-[var(--positive-bg)] text-[var(--positive)]";
  if (change === "removed")
    return "border-[var(--negative-border)] bg-[var(--negative-bg)] text-[var(--negative)]";
  if (change === "edited")
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
    <div className="mt-2 flex flex-wrap gap-1">
      {ids.map((id) => {
        const cited = citations[id];
        return (
          <a
            key={id}
            href={`#ev-${id}`}
            className={`rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase transition-opacity hover:opacity-80 ${
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

function attributionCopy(attribution: StatusChangeAttribution): string | null {
  if (attribution === "thesis-edit") {
    return "Status changed with the thesis edit on the same evidence snapshot. That is not a score.";
  }
  if (attribution === "evidence-snapshot") {
    return "Status changed after the evidence snapshot changed. This is not attributed to the thesis edit.";
  }
  if (attribution === "mixed") {
    return "Both the thesis text and the evidence snapshot changed. The status shift is not scored as an improvement.";
  }
  return null;
}

function ClaimDiffCard({
  claim,
  previousCitations,
  currentCitations,
}: {
  claim: ClaimRevision;
  previousCitations: Record<string, CitedEvidence>;
  currentCitations: Record<string, CitedEvidence>;
}) {
  const note = attributionCopy(claim.attribution);
  return (
    <article className="border-b border-[var(--border-subtle)] p-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase font-bold ${changeColor(claim.change)}`}>
          {claim.change}
        </span>
        <span className="font-mono text-[10px] uppercase text-[var(--text-muted)]">{claim.source}</span>
        {claim.reordered ? (
          <span className="rounded-full border border-[var(--accent-border)] bg-[var(--accent-light)] px-2 py-0.5 font-mono text-[10px] uppercase text-[var(--accent)] font-semibold">
            reordered
          </span>
        ) : null}
        {claim.statusChanged ? (
          <span className="rounded-full border border-[var(--warning-border)] bg-[var(--warning-bg)] px-2 py-0.5 font-mono text-[10px] uppercase text-[var(--warning)] font-semibold">
            status changed
          </span>
        ) : null}
        {claim.evidenceRefsChanged ? (
          <span className="rounded-full border border-[var(--info-border)] bg-[var(--info-bg)] px-2 py-0.5 font-mono text-[10px] uppercase text-[var(--info)] font-semibold">
            evidence refs changed
          </span>
        ) : null}
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3">
          <p className="font-mono text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Before</p>
          <p className="mt-1 text-xs text-[var(--text-primary)]">{claim.previousText || "—"}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {claim.previousAssessments.map((slice) => (
              <span
                key={`prev-${slice.id}`}
                className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase ${statusColor(slice.status)}`}
              >
                {slice.status}
                {slice.kind ? ` · ${slice.kind}` : ""}
              </span>
            ))}
          </div>
          <Citations
            ids={[...new Set(claim.previousAssessments.flatMap((slice) => slice.evidenceIds))]}
            citations={previousCitations}
          />
        </div>
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3">
          <p className="font-mono text-[10px] uppercase tracking-wide text-[var(--text-muted)]">After</p>
          <p className="mt-1 text-xs text-[var(--text-primary)]">{claim.currentText || "—"}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {claim.currentAssessments.map((slice) => (
              <span
                key={`curr-${slice.id}`}
                className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase ${statusColor(slice.status)}`}
              >
                {slice.status}
                {slice.kind ? ` · ${slice.kind}` : ""}
              </span>
            ))}
          </div>
          <Citations
            ids={[...new Set(claim.currentAssessments.flatMap((slice) => slice.evidenceIds))]}
            citations={currentCitations}
          />
        </div>
      </div>
      <p className="mt-2 font-mono text-[10px] text-[var(--text-muted)]">Match: {claim.matchReason}</p>
      {note ? <p className="mt-1 text-xs text-[var(--text-secondary)]">{note}</p> : null}
    </article>
  );
}

export function ThesisRevisionPanel({
  history,
  selectedId,
  selectedRevisionId,
  onSelect,
  onSelectRevisionId,
  onRestore,
}: {
  history: ThesisRevision[];
  selectedId?: string | null;
  selectedRevisionId?: string | null;
  onSelect?: (revisionId: string) => void;
  onSelectRevisionId?: (revisionId: string) => void;
  onRestore?: (revision: ThesisRevision) => void;
}) {
  const activeSelectedId = selectedRevisionId ?? selectedId ?? null;
  const handleSelect = onSelectRevisionId ?? onSelect ?? (() => {});

  if (history.length === 0) {
    return (
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 text-xs text-[var(--text-muted)]">
        After testing your initial idea, edit the thesis above and click revise. Mirrorline will track before/after changes directly in your browser session.
      </section>
    );
  }

  const selected = history.find((item) => item.revisionId === activeSelectedId) ?? history[history.length - 1];

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-xs">
        <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] dark:text-[#86C495]">
          Revision Tracking · Non-Advisory
        </p>
        <h3 className="mt-1 text-base font-semibold text-[var(--text-primary)]">Compare Idea Revisions</h3>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Claims are tracked across revisions. A status change is not a grade—it reflects how closely claims match evidence.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {history.map((item) => (
            <button
              key={item.revisionId}
              type="button"
              onClick={() => handleSelect(item.revisionId)}
              className={`rounded-lg border px-3 py-1 font-mono text-xs transition-colors ${
                item.revisionId === selected.revisionId
                  ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)] font-semibold"
                  : "border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:border-[var(--accent)]"
              }`}
            >
              Revision {item.sequence}
              {item.snapshotChanged ? " · snapshot changed" : ""}
            </button>
          ))}
        </div>
      </div>

      {selected.snapshotWarning ? (
        <div className="rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)] p-3 text-xs text-[var(--warning)]">
          {selected.snapshotWarning}
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] p-3 text-xs text-[var(--text-secondary)]">
          Same evidence snapshot ({selected.currentSnapshot.retrievedAt}). Status changes come from your thesis edit.
        </div>
      )}

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {(
          [
            ["Added", selected.summary.added],
            ["Removed", selected.summary.removed],
            ["Edited", selected.summary.edited],
            ["Reordered", selected.summary.reordered],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 shadow-2xs">
            <p className="font-mono text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
            <p className="mt-1 font-mono text-xl font-bold text-[var(--text-primary)]">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-xs">
          <p className="font-mono text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Previous thesis</p>
          <p className="mt-2 text-xs md:text-sm text-[var(--text-primary)]">{selected.originalThesis.thesis || "—"}</p>
          {selected.originalThesis.reason ? (
            <p className="mt-2 text-xs text-[var(--text-secondary)]">Reason: {selected.originalThesis.reason}</p>
          ) : null}
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-xs">
          <p className="font-mono text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Revised thesis</p>
          <p className="mt-2 text-xs md:text-sm text-[var(--text-primary)]">{selected.revisedThesis.thesis || "—"}</p>
          {selected.revisedThesis.reason ? (
            <p className="mt-2 text-xs text-[var(--text-secondary)]">Reason: {selected.revisedThesis.reason}</p>
          ) : null}
          {onRestore ? (
            <button
              type="button"
              className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              onClick={() => onRestore(selected)}
            >
              Load this revision into the editor
            </button>
          ) : null}
        </div>
      </div>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-xs">
        <div className="border-b border-[var(--border-subtle)] px-4 py-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] font-mono">
            Claim-by-claim comparison
          </h4>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {selected.summary.statusChanged} status change(s) · {selected.summary.evidenceRefsChanged} evidence-reference change(s).
          </p>
        </div>
        {selected.claims.length === 0 ? (
          <p className="px-4 py-3 text-xs text-[var(--text-muted)]">No claim units were extracted from either revision.</p>
        ) : (
          selected.claims.map((claim) => (
            <ClaimDiffCard
              key={claim.stableId}
              claim={claim}
              previousCitations={selected.previousChallenge.citations}
              currentCitations={selected.currentChallenge.citations}
            />
          ))
        )}
      </section>
    </section>
  );
}
