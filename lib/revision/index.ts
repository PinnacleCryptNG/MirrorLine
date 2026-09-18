export { buildThesisRevision } from "./diff";
export { matchClaimUnits, MATCH_THRESHOLDS } from "./match";
export {
  extractClaimUnits,
  fingerprintClaim,
  joinClaimSentences,
  snapshotFromChallenge,
} from "./claims";
export { getThesisRevision, parseRevisionRequest } from "./get-revision";
export { MATCH_STRATEGY, REVISION_LIMITATIONS } from "./types";
export type { ThesisRevision, ClaimRevision, EvidenceSnapshotRef, ClaimChangeKind } from "./types";
