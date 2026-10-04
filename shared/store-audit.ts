import type { AuditState } from "./audit-types";
export function storedAudit(audit: AuditState) {
  const findings = (items: AuditState["findings"]) =>
    items.map((item) => ({
      _key: crypto.randomUUID(),
      _type: "claimFinding",
      part: item.part,
      status: item.status,
      detail: item.detail,
    }));
  return {
    _key: crypto.randomUUID(),
    _type: "claimAudit",
    originalClaim: audit.originalClaim,
    findings: findings(audit.findings),
    sources: audit.sources.map((source) => ({
      _key: crypto.randomUUID(),
      _type: "claimSource",
      title: source.title,
      url: source.url,
      highlights: source.highlights,
    })),
    history: audit.history.map((event) => ({
      ...event,
      _key: crypto.randomUUID(),
      _type: "claimAuditEvent",
      findings: findings(event.findings),
    })),
  };
}
