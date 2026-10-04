import type { Evidence, Finding } from "./generate-post";

export type AuditRecord = {
  kind: "initial" | "recheck" | "override";
  at: string;
  actor?: string;
  explanation?: string;
  sourceUrl?: string;
  findingIndex?: number;
  findings: Finding[];
};
export type AuditState = {
  originalClaim: string;
  findings: Finding[];
  sources: Evidence[];
  history: AuditRecord[];
};
