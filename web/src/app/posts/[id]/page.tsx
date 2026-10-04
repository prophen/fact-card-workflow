import { SourceCitation } from "@/components/source-citation";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost } from "@/sanity/posts";
import {
  Header,
  CardImage,
  DownloadLink,
  Status,
  updatedDate,
} from "@/components/post-ui";
import { CopyCaption } from "@/components/copy-caption";
export const dynamic = "force-dynamic";
export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) notFound();
  let sourceUrl: URL | null = null;
  try {
    const parsed = new URL(post.source?.url || "");
    if (["http:", "https:"].includes(parsed.protocol)) sourceUrl = parsed;
  } catch {}
  return (
    <>
      <Header />
      <main className="detail-main">
        <Link className="back-link" href="/">
          ← Back to all posts
        </Link>
        <div className="detail-grid">
          <section className="detail-artwork" aria-label="Rendered fact card">
            <CardImage post={post} priority />
            <div className="download-row">
              <div>
                <strong>Ready to share</strong>
                <p>
                  {post.image
                    ? `${post.image.width || 1080} × ${post.image.height || 1080} · Original card image`
                    : "Your card is being prepared."}
                </p>
              </div>
              <DownloadLink post={post} />
            </div>
          </section>
          <article className="post-details">
            <div className="detail-meta">
              <Status status={post.status} />
              <span>Updated {updatedDate(post._updatedAt)}</span>
            </div>
            <p className="eyebrow">
              {post.topic || "California Black history"}
            </p>
            <h1>{post.factText || "A new story is taking shape."}</h1>
            {post.generationError ? (
              <p className="generation-notice">
                The replacement needs attention. Open this post in Studio to see
                the issue and retry.
              </p>
            ) : post.status === "generating" && post.image ? (
              <p className="generation-notice">
                A replacement is being generated. This is the current saved
                card.
              </p>
            ) : null}
            <section className="detail-section">
              <h2>Facebook caption</h2>
              <p className="caption-text">
                {post.caption ||
                  "The caption will appear when generation is complete."}
              </p>
              {post.caption ? <CopyCaption caption={post.caption} /> : null}
            </section>
            <section className="detail-section">
              <h2>Source</h2>
              {post.source?.citation ? (
                <SourceCitation citation={post.source.citation} />
              ) : (
                <p>The source will appear when generation is complete.</p>
              )}
              {sourceUrl ? (
                <a
                  className="source-link"
                  href={sourceUrl.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  Read the source <span aria-hidden="true">↗</span>
                  <small>{sourceUrl.hostname}</small>
                </a>
              ) : null}
            </section>
          </article>
        </div>
      </main>
    </>
  );
}
