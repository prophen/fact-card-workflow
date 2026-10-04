import { CLAIMS_PROMPT } from "./original-claim-prompts";
/** Adapted from CBS Post Generator's claims endpoint. Ideas are not verified facts. */
export async function generateIdeas(
  topics: string,
  settings: { openaiKey: string; model: string },
  request: typeof fetch = fetch,
): Promise<string[]> {
  const scoped = topics
    .split(",")
    .map((topic) => topic.trim())
    .filter(Boolean)
    .map((topic) =>
      /california/i.test(topic) ? topic : `${topic} in California`,
    );
  if (!scoped.length || topics.length > 500)
    throw new Error("Enter core topics of 1–500 characters.");
  const response = await request("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.openaiKey}`,
    },
    signal: AbortSignal.timeout(60000),
    body: JSON.stringify({
      model: settings.model,
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: CLAIMS_PROMPT,
        },
        {
          role: "user",
          content: `Core topics: ${scoped.join(", ")}
Generate 5 candidate factual claims, one per topic if possible, rotating across the topics.`,
        },
      ],
    }),
  });
  if (!response.ok)
    throw new Error(
      `Topic ideas provider returned ${response.status}. Please try again.`,
    );
  const data = await response.json();
  let claims: unknown;
  try {
    claims = JSON.parse(data.choices?.[0]?.message?.content || "{}").claims;
  } catch {
    throw new Error(
      "The model did not return usable topic ideas. Please try again.",
    );
  }
  const ideas = Array.isArray(claims)
    ? [
        ...new Set(
          claims
            .filter(
              (claim): claim is string =>
                typeof claim === "string" &&
                Boolean(claim.trim()) &&
                claim.length <= 400,
            )
            .map((claim) => claim.trim()),
        ),
      ].slice(0, 5)
    : [];
  if (!ideas.length)
    throw new Error(
      "No usable topic ideas were generated. Try different core topics.",
    );
  return ideas;
}
