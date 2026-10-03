import { createClient } from "next-sanity";
import { generatePost } from "@/lib/generate-post";
import { renderCard } from "../../../../../shared/render-card";

export const runtime = "nodejs";
export const maxDuration = 180;
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
  });
  let user: { id: string };
  try {
    user = await client.request({ url: "/users/me" });
    const member = await client.request<{ id?: string }>({
      url: `/projects/ta2gi825/users/${encodeURIComponent(user.id)}`,
    });
    if (!member.id) throw new Error("Project membership required");
  } catch {
    return reply(
      request,
      { error: "Your Sanity account cannot access this project." },
      403,
    );
  }
  if (!user?.id)
    return reply(request, { error: "Sanity authentication failed." }, 403);
  if (
    active.has(user.id) ||
    Date.now() - (lastRequest.get(user.id) || 0) < 10000
  )
    return reply(
      request,
      {
        error:
          "A generation is already running, or was just requested. Please wait.",
      },
      429,
    );
  const openaiKey = process.env.OPENAI_API_KEY;
  const exaKey = process.env.EXA_API_KEY;
  if (!openaiKey || !exaKey)
    return reply(
      request,
      {
        error:
          "Add OPENAI_API_KEY and EXA_API_KEY to the web app’s server environment, then restart it.",
      },
      503,
    );
  let topic: string;
  try {
    const body = await request.json();
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
  active.add(user.id);
  lastRequest.set(user.id, Date.now());
  try {
    const post = await generatePost(topic, {
        openaiKey,
        exaKey,
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      });
    const png = await renderCard(post.factText);
    return reply(request, {...post, cardPng: png.toString('base64')}, 200);
  } catch (error) {
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
