import { createHmac, timingSafeEqual } from "node:crypto";
import type { Evidence } from "./generate-post";

// Stateless, user-bound proof that these excerpts came from our server's search.
// Studio cannot supply invented evidence. No API key is included in the token.
export function signSourceContext(
  sources: Evidence[],
  user: string,
  key: string,
  now = Date.now(),
) {
  const payload = Buffer.from(
    JSON.stringify({ sources, user, expires: now + 30 * 60_000 }),
  ).toString("base64url");
  const signature = createHmac("sha256", key)
    .update(`cbs-source-context:${payload}`)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function readSourceContext(
  token: unknown,
  user: string,
  key: string,
  now = Date.now(),
): Evidence[] {
  if (typeof token !== "string" || token.length > 400_000)
    throw new Error("Invalid source context.");
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra)
    throw new Error("Invalid source context.");
  const expected = createHmac("sha256", key)
    .update(`cbs-source-context:${payload}`)
    .digest();
  const received = Buffer.from(signature, "base64url");
  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  )
    throw new Error("Invalid source context.");
  const data = JSON.parse(Buffer.from(payload, "base64url").toString());
  if (
    data.user !== user ||
    typeof data.expires !== "number" ||
    data.expires <= now ||
    !Array.isArray(data.sources)
  ) {
    throw new Error(
      "Your saved sources expired. Choose the claim again to run a fresh source check.",
    );
  }
  return data.sources;
}
