"use client";

import type { CitedEvidence } from "@/lib/brief/types";
import type { ClaimAssessmentStatus } from "@/lib/challenge/types";
import type { EvidenceClass } from "@/lib/market/fields";
import type { ClaimChangeKind, ClaimRevision, StatusChangeAttribution, ThesisRevision } from "@/lib/revision/types";

function statusColor(status: ClaimAssessmentStatus) {
  if (status === "supported") return "border-[#36D399]/40 bg-[#36D399]/10 text-[#36D399]";
  if (status === "challenged") return "border-[#FF6B7A]/40 bg-[#FF6B7A]/10 text-[#FF6B7A]";
  if (status === "unsupported") return "border-[#F4C95D]/40 bg-[#F4C95D]/10 text-[#F4C95D]";
  return "border-[#8B7CFF]/40 bg-[#8B7CFF]/10 text-[#8B7CFF]";
}

function changeColor(change: ClaimChangeKind) {
  if (change === "added") return "border-[#36D399]/40 bg-[#36D399]/10 text-[#36D399]";
  if (change === "removed") return "border-[#FF6B7A]/40 bg-[#FF6B7A]/10 text-[#FF6B7A]";
  if (change === "edited") return "border-[#F4C95D]/40 bg-[#F4C95D]/10 text-[#F4C95D]";
  return "border-[#252B36] bg-[#171B24] text-[#9BA3B2]";
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
    <article className="border-b border-[#252B36] px-4 py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2 py-0.5 font-data text-[10px] uppercase ${changeColor(claim.change)}`}>
          {claim.change}
        </span>
        <span className="font-data text-[10px] uppercase text-[#626B7A]">{claim.source}</span>
        {claim.reordered ? (
          <span className="rounded-full border border-[#8B7CFF]/30 px-2 py-0.5 font-data text-[10px] uppercase text-[#8B7CFF]">
            reordered
          </span>
        ) : null}
        {claim.statusChanged ? (
          <span className="rounded-full border border-[#F4C95D]/30 px-2 py-0.5 font-data text-[10px] uppercase text-[#F4C95D]">
            status changed
          </span>
        ) : null}
        {claim.evidenceRefsChanged ? (
          <span className="rounded-full border border-[#5EA7FF]/30 px-2 py-0.5 font-data text-[10px] uppercase text-[#5EA7FF]">
            evidence refs changed
          </span>
        ) : null}
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <p className="font-data text-[10px] uppercase tracking-wide text-[#626B7A]">Before</p>
          <p className="mt-1 text-sm text-[#F5F7FA]">{claim.previousText || "—"}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {claim.previousAssessments.map((slice) => (
              <span
                key={`prev-${slice.id}`}
                className={`rounded-full border px-2 py-0.5 font-data text-[10px] uppercase ${statusColor(slice.status)}`}
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
        <div>
          <p className="font-data text-[10px] uppercase tracking-wide text-[#626B7A]">After</p>
          <p className="mt-1 text-sm text-[#F5F7FA]">{claim.currentText || "—"}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {claim.currentAssessments.map((slice) => (
              <span
                key={`curr-${slice.id}`}
                className={`rounded-full border px-2 py-0.5 font-data text-[10px] uppercase ${statusColor(slice.status)}`}
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
      <p className="mt-2 font-data text-[11px] text-[#626B7A]">Match: {claim.matchReason}</p>
      {note ? <p className="mt-1 text-xs text-[#9BA3B2]">{note}</p> : null}
    </article>
  );
}

export function ThesisRevisionPanel({
  history,
  selectedId,
  onSelect,
  onRestore,
}: {
  history: ThesisRevision[];
  selectedId: string | null;
  onSelect: (revisionId: string) => void;
  onRestore?: (revision: ThesisRevision) => void;
}) {
  if (history.length === 0) {
    return (
      <section className="rounded-xl border border-[#252B36] bg-[#10131A] px-4 py-6 text-sm text-[#9BA3B2]">
        After the first challenge, edit the thesis and revise it. The desk will keep a before/after history in this
        session. No database is used.
      </section>
    );
  }

  const selected = history.find((item) => item.revisionId === selectedId) ?? history[history.length - 1];

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-xl border border-[#252B36] bg-[#10131A] px-4 py-4">
        <p className="font-data text-xs tracking-[0.24em] text-[#8B7CFF]">THESIS REVISION LOOP · NON-ADVISORY</p>
        <h2 className="mt-2 text-lg font-medium">Compare revisions</h2>
        <p className="mt-1 text-sm text-[#9BA3B2]">
          Identity is preserved across reordering and light edits when fingerprints or token overlap match. A status
          change is not a grade. Refreshing Bitget data marks a new evidence snapshot.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {history.map((item) => (
            <button
              key={item.revisionId}
              type="button"
              onClick={() => onSelect(item.revisionId)}
              className={`rounded-full border px-3 py-1 font-data text-xs ${
                item.revisionId === selected.revisionId
                  ? "border-[#8B7CFF] text-[#8B7CFF]"
                  : "border-[#252B36] text-[#9BA3B2]"
              }`}
            >
              Rev {item.sequence}
              {item.snapshotChanged ? " · snapshot changed" : ""}
            </button>
          ))}
        </div>
      </div>

      {selected.snapshotWarning ? (
        <div className="rounded-xl border border-[#F4C95D]/40 bg-[#F4C95D]/10 px-4 py-3 text-sm text-[#F4C95D]">
          {selected.snapshotWarning}
        </div>
      ) : (
        <div className="rounded-xl border border-[#252B36] bg-[#10131A] px-4 py-3 text-sm text-[#9BA3B2]">
          Same evidence snapshot ({selected.currentSnapshot.retrievedAt}). Status changes come from the thesis edit,
          not from a new tape.
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        {(
          [
            ["Added", selected.summary.added],
            ["Removed", selected.summary.removed],
            ["Edited", selected.summary.edited],
            ["Reordered", selected.summary.reordered],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[#252B36] bg-[#10131A] px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-[#626B7A]">{label}</p>
            <p className="mt-1 font-data text-xl text-[#F5F7FA]">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-[#252B36] bg-[#10131A] px-4 py-3">
          <p className="font-data text-[10px] uppercase tracking-wide text-[#626B7A]">Previous thesis</p>
          <p className="mt-2 text-sm text-[#F5F7FA]">{selected.originalThesis.thesis || "—"}</p>
          {selected.originalThesis.reason ? (
            <p className="mt-2 text-xs text-[#9BA3B2]">Reason: {selected.originalThesis.reason}</p>
          ) : null}
        </div>
        <div className="rounded-xl border border-[#252B36] bg-[#10131A] px-4 py-3">
          <p className="font-data text-[10px] uppercase tracking-wide text-[#626B7A]">Revised thesis</p>
          <p className="mt-2 text-sm text-[#F5F7FA]">{selected.revisedThesis.thesis || "—"}</p>
          {selected.revisedThesis.reason ? (
            <p className="mt-2 text-xs text-[#9BA3B2]">Reason: {selected.revisedThesis.reason}</p>
          ) : null}
          {onRestore ? (
            <button
              type="button"
              className="mt-3 h-9 rounded-md border border-[#252B36] px-3 text-xs text-[#9BA3B2]"
              onClick={() => onRestore(selected)}
            >
              Load this revision into the editor
            </button>
          ) : null}
        </div>
      </div>

      <section className="rounded-xl border border-[#252B36] bg-[#10131A]">
        <div className="border-b border-[#252B36] px-4 py-3">
          <h3 className="text-sm font-medium">Claim-by-claim comparison</h3>
          <p className="mt-1 text-xs text-[#9BA3B2]">
            {selected.summary.statusChanged} status change(s) · {selected.summary.evidenceRefsChanged} evidence-reference
            change(s). None of these are buy/sell advice.
          </p>
        </div>
        {selected.claims.length === 0 ? (
          <p className="px-4 py-3 text-sm text-[#9BA3B2]">No claim units were extracted from either revision.</p>
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
