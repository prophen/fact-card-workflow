import { createClient } from "next-sanity";
import {readRevisionContext, signSourceContext} from "../../../../../shared/source-context";
import { SourceVerificationError, type Evidence, type GeneratedPost } from "../../../../../shared/generate-post";
import { generatePost } from "@/lib/generate-post";
import { generateIdeas } from "../../../../../shared/generate-ideas";
import { renderCard } from "../../../../../shared/render-card";

export const runtime = "nodejs";
export const maxDuration = 240;
const active = new Set<string>();
const lastRequest = new Map<string, number>();
const origins = () =>
  (
    process.env.SANITY_STUDIO_ORIGINS ||
    "http://localhost:3333,http://127.0.0.1:3333"
  )
    .split(",")
    .map((s) => s.trim());
function headers(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  return origin && origins().includes(origin)
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        Vary: "Origin",
      }
    : { Vary: "Origin" };
}
function reply(request: Request, body: unknown, status: number) {
  return Response.json(body, { status, headers: headers(request) });
}
export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: origins().includes(request.headers.get("origin") || "") ? 204 : 403,
    headers: headers(request),
  });
}
export async function POST(request: Request) {
  const startedAt = Date.now();
  console.info("[post-generation] request received");
  const origin = request.headers.get("origin");
  if (origin && !origins().includes(origin))
    return reply(request, { error: "Studio origin is not allowed." }, 403);
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer "))
    return reply(
      request,
      { error: "Sign in to Sanity Studio to generate a post." },
      401,
    );
  const client = createClient({
    projectId: "ta2gi825",
    dataset: "production",
    apiVersion: "2026-10-03",
    useCdn: false,
    token: authorization.slice(7),
    timeout: 10000,
    maxRetries: 0,
  });
  let user: { id: string };
  try {
    console.info("[post-generation] checking Studio access");
    user = await client.request({ url: "/users/me" });
    const member = await client.request<{ id?: string }>({
      url: `/projects/ta2gi825/users/${encodeURIComponent(user.id)}`,
    });
    if (!member.id) throw new Error("Project membership required");
  } catch {
    console.warn("[post-generation] Studio access check failed", {
      elapsedMs: Date.now() - startedAt,
    });
    return reply(
      request,
      { error: "Your Sanity account cannot access this project." },
      403,
    );
  }
  console.info("[post-generation] Studio access confirmed", {
    elapsedMs: Date.now() - startedAt,
  });
  if (!user?.id)
    return reply(request, { error: "Sanity authentication failed." }, 403);
  const openaiKey = process.env.OPENAI_API_KEY;
  const exaKey = process.env.EXA_API_KEY;
  let topic: string;
  let mode: "ideas" | "post" = "post";
  let candidateClaim: string | undefined;
  let retrySources = false;
  let sourceEvidence: Evidence[] = [];
  let preparedRewrite: GeneratedPost | undefined;
  let acceptRewrite = false;
  try {
    const body = await request.json();
    if (
      body.mode !== undefined &&
      body.mode !== "ideas" &&
      body.mode !== "post"
    )
      return reply(request, { error: "Invalid generation mode." }, 400);
    mode = body.mode || "post";
    if (
      body.candidateClaim !== undefined &&
      (typeof body.candidateClaim !== "string" ||
        !body.candidateClaim.trim() ||
        body.candidateClaim.length > 400)
    )
      return reply(
        request,
        { error: "Choose a claim idea of 1–400 characters." },
        400,
      );
    candidateClaim = body.candidateClaim?.trim();
    if (body.sourceContext !== undefined) {
      if (!openaiKey || !candidateClaim) return reply(request, {error: "Choose a claim before reusing its sources."}, 400);
      try { const context = readRevisionContext(body.sourceContext, user.id, openaiKey); sourceEvidence = context.sources; preparedRewrite = context.preparedRewrite; }
      catch (error) { return reply(request, {error: error instanceof Error ? error.message : "Invalid source context."}, 400); }
    }
    if (
      body.retrySources !== undefined &&
      typeof body.retrySources !== "boolean"
    )
      return reply(request, { error: "Invalid source retry request." }, 400);
    retrySources = body.retrySources === true;
    if (body.acceptRewrite !== undefined && typeof body.acceptRewrite !== "boolean") return reply(request, {error: "Invalid rewrite request."}, 400);
    acceptRewrite = body.acceptRewrite === true;
    if (acceptRewrite && (retrySources || !preparedRewrite || candidateClaim !== preparedRewrite.factText)) return reply(request, {error: "This rewrite changed or expired. Check the edited claim before creating a card."}, 400);
    if (retrySources && !candidateClaim)
      return reply(
        request,
        { error: "Choose a claim before retrying its sources." },
        400,
      );
    if (
      typeof body.topic !== "string" ||
      !body.topic.trim() ||
      body.topic.length > 500
    )
      return reply(
        request,
        { error: "Enter a topic of 1–500 characters." },
        400,
      );
    topic = body.topic.trim();
  } catch {
    return reply(request, { error: "Invalid generation request." }, 400);
  }
  if (!openaiKey || (mode === "post" && !exaKey))
    return reply(
      request,
      {
        error:
          mode === "ideas"
            ? "Add OPENAI_API_KEY to the web app’s server environment, then restart or redeploy it."
            : "Add OPENAI_API_KEY and EXA_API_KEY to the web app’s server environment, then restart or redeploy it.",
      },
      503,
    );
  const requestKey = `${user.id}:${retrySources ? "source-retry" : sourceEvidence.length ? "correction" : mode}`;
  if (
    active.has(user.id) ||
    Date.now() - (lastRequest.get(requestKey) || 0) < 10000
  )
    return reply(
      request,
      {
        error:
          "A generation is already running, or was just requested. Please wait.",
      },
      429,
    );
  active.add(user.id);
  lastRequest.set(requestKey, Date.now());
  try {
    console.info("[post-generation] provider request started", { mode });
    if (mode === "ideas") {
      const claims = await generateIdeas(topic, {
        openaiKey,
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      });
      console.info("[post-generation] ideas ready", {
        count: claims.length,
        elapsedMs: Date.now() - startedAt,
      });
      return reply(request, { claims }, 200);
    }
    const previousFacts = await client.fetch<string[]>(
      '*[_type == "post" && status in ["approved", "published"] && !(_id in path("versions.**"))] | order(_updatedAt desc)[0...100].factText',
      {}, {perspective: 'drafts'},
    );
    const post = acceptRewrite ? preparedRewrite! : await generatePost(
      topic,
      {
        openaiKey,
        exaKey: exaKey!,
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      },
      fetch,
      undefined,
      candidateClaim,
      retrySources,
      previousFacts,
      sourceEvidence,
    );
    const png = await renderCard(post.factText);
    return reply(request, { ...post, cardPng: png.toString("base64") }, 200);
  } catch (error) {
    if (error instanceof SourceVerificationError)
      return reply(
        request,
        {
          error: error.message,
          code: error.code,
          candidateClaim: error.candidateClaim,
          findings: error.findings,
          suggestedCorrection: error.suggestedCorrection,
          rewriteReady: Boolean(error.preparedRewrite),
          sources: error.sources,
          ...(error.sources.length && openaiKey ? {sourceContext: signSourceContext(error.sources, user.id, openaiKey, Date.now(), error.preparedRewrite)} : {}),
        },
        422,
      );
    console.error("[post-generation] provider request failed", {
      mode,
      elapsedMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return reply(
      request,
      {
        error:
          error instanceof Error ? error.message : "Post generation failed.",
      },
      502,
    );
  } finally {
    active.delete(user.id);
    if (lastRequest.size > 1000) lastRequest.clear();
  }
}
