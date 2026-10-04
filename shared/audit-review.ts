import type { AuditState } from "./audit-types";
import type { Finding } from "./generate-post";

export async function recheckFinding(
  audit: AuditState,
  index: number,
  explanation: string,
  actor: string,
  settings: { openaiKey: string; model: string },
  request: typeof fetch = fetch,
): Promise<AuditState> {
  if (!Number.isInteger(index) || !audit.findings[index])
    throw new Error("Choose a finding to recheck.");
  const response = await request("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.openaiKey}`,
    },
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({
      model: settings.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'Reassess one disputed finding in a California Black Stories claim audit using ONLY the saved source excerpts. Consider the reviewer explanation critically; it is not proof. First does not mean only: a later occurrence or revival does not contradict an earlier first occurrence. Contradicted requires incompatible evidence about the same assertion. Supported requires direct source support; otherwise unsupported. Do not change the claim or other findings. Return JSON {"status":"supported|unsupported|contradicted","detail":"explanation quoting the relevant excerpt"}.',
        },
        {
          role: "user",
          content: JSON.stringify({
            claim: audit.originalClaim,
            finding: audit.findings[index],
            reviewerExplanation: explanation,
            sources: audit.sources,
          }),
        },
      ],
    }),
  });
  if (!response.ok)
    throw new Error(
      `Finding recheck returned ${response.status}. Please try again.`,
    );
  const data = await response.json();
  const result = JSON.parse(data.choices?.[0]?.message?.content || "{}");
  if (
    !["supported", "unsupported", "contradicted"].includes(result.status) ||
    typeof result.detail !== "string" ||
    !result.detail.trim() ||
    result.detail.length > 1500
  )
    throw new Error(
      "The recheck returned an incomplete finding. Your previous audit is unchanged.",
    );
  const findings = audit.findings.map((finding, i): Finding =>
    i === index
      ? {
          part: finding.part,
          status: result.status,
          detail: result.detail.trim(),
        }
      : finding,
  );
  return {
    ...audit,
    findings,
    history: [
      ...audit.history,
      {
        kind: "recheck",
        at: new Date().toISOString(),
        actor,
        explanation,
        findingIndex: index,
        findings,
      },
    ],
  };
}

export function overrideAudit(
  audit: AuditState,
  explanation: string,
  sourceUrl: string,
  actor: string,
): AuditState {
  if (!explanation.trim() || explanation.length > 1500)
    throw new Error("Explain why you are keeping the original claim.");
  if (!audit.sources.some((source) => source.url === sourceUrl))
    throw new Error("Choose a supporting source from this audit.");
  // Keep the model findings intact: an editorial decision is not a supported model verdict.
  return {
    ...audit,
    history: [
      ...audit.history,
      {
        kind: "override",
        at: new Date().toISOString(),
        actor,
        explanation: explanation.trim(),
        sourceUrl,
        findings: audit.findings,
      },
    ],
  };
}
