import Link from 'next/link'
import Image from 'next/image'
import type { Post, PostStatus } from '@/sanity/posts'
export const statusLabels: Record<PostStatus, string> = {
  generating: 'Generating',
  inReview: 'In review',
  approved: 'Approved',
  published: 'Published',
}
export function Status({ status }: { status: PostStatus | null }) {
  return (
    <span className={`status status-${status || 'generating'}`}>
      <span aria-hidden="true" />
      {status ? statusLabels[status] || 'Draft' : 'Draft'}
    </span>
  )
}
export function Header() {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <span className="brand-mark" aria-hidden="true">
          CBS
        </span>
        <span>
          California Black Stories<span className="brand-subtitle">POST LIBRARY</span>
        </span>
      </Link>
      <a
        className="studio-link"
        href={process.env.NEXT_PUBLIC_SANITY_STUDIO_URL || 'http://localhost:3333'}
        target="_blank"
        rel="noreferrer"
      >
        Open Studio <span aria-hidden="true">↗</span>
      </a>
    </header>
  )
}
export function CardImage({ post, priority = false }: { post: Post; priority?: boolean }) {
  return (
    <div className="card-image">
      {post.image?.url ? (
        <Image
          src={post.image.url}
          alt={post.factText || 'California Black Stories fact card'}
          width={post.image.width || 1080}
          height={post.image.height || 1080}
          sizes={
            priority
              ? '(max-width: 760px) 100vw, 55vw'
              : '(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw'
          }
          priority={priority}
        />
      ) : (
        <div className="image-placeholder">
          <span className="placeholder-symbol" aria-hidden="true">
            ✦
          </span>
          <span>Card in the making</span>
          <small>The image will appear here when it’s ready.</small>
        </div>
      )}
    </div>
  )
}
export function DownloadLink({ post }: { post: Post }) {
  return post.image?.url ? (
    <a
      className="button button-dark"
      href={`/api/posts/${encodeURIComponent(post._id)}/image`}
      download
    >
      Download image <span aria-hidden="true">↓</span>
    </a>
  ) : (
    <span className="button button-disabled" aria-disabled="true">
      Image not ready
    </span>
  )
}
export function updatedDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Los_Angeles',
  }).format(new Date(value))
}
