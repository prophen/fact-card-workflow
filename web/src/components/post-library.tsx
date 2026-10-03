'use client'
import { useState } from 'react'
import Link from 'next/link'
import type { Post, PostStatus } from '@/sanity/posts'
import { CardImage, DownloadLink, Status, statusLabels, updatedDate } from './post-ui'
const stages: (PostStatus | 'all')[] = ['all', 'generating', 'inReview', 'approved', 'published']
export function PostLibrary({ posts }: { posts: Post[] }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<PostStatus | 'all'>('all')
  const term = search.trim().toLowerCase()
  const visible = posts.filter(
    (post) =>
      (status === 'all' || post.status === status) &&
      (!term ||
        [post.topic, post.factText, post.caption, post.source?.citation].some((value) =>
          value?.toLowerCase().includes(term),
        )),
  )
  return (
    <>
      <section className="library-toolbar" aria-label="Find posts">
        <div className="status-filters" aria-label="Filter by status">
          {stages.map((stage) => (
            <button
              key={stage}
              aria-pressed={status === stage}
              onClick={() => setStatus(stage)}
              className={status === stage ? 'filter active' : 'filter'}
            >
              {stage === 'all' ? 'All posts' : statusLabels[stage]}
              <span>
                {stage === 'all'
                  ? posts.length
                  : posts.filter((post) => post.status === stage).length}
              </span>
            </button>
          ))}
        </div>
        <label className="search">
          <span className="sr-only">Search posts</span>
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="Search topics or facts…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </section>
      <p className="result-count" aria-live="polite">
        {visible.length} {visible.length === 1 ? 'post' : 'posts'}
        {status !== 'all' || term ? ' matching your search' : ' in your collection'}
      </p>
      {visible.length ? (
        <div className="post-grid">
          {visible.map((post) => (
            <article className="post-card" key={post._id}>
              <Link
                className="card-preview-link"
                href={`/posts/${encodeURIComponent(post._id)}`}
                aria-label={`View post: ${post.topic || post.factText || 'Untitled post'}`}
              >
                <CardImage post={post} />
              </Link>
              <div className="post-card-body">
                <div className="card-meta">
                  <Status status={post.status} />
                  <time dateTime={post._updatedAt}>{updatedDate(post._updatedAt)}</time>
                </div>
                <p className="topic">{post.topic || 'California Black history'}</p>
                <h2>{post.factText || 'A new story is taking shape.'}</h2>
                <div className="card-actions">
                  <Link
                    className="button button-light"
                    href={`/posts/${encodeURIComponent(post._id)}`}
                  >
                    View post <span aria-hidden="true">↗</span>
                  </Link>
                  <DownloadLink post={post} />
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="empty-state">
          <span aria-hidden="true">✦</span>
          <h2>{posts.length ? 'No matching stories' : 'Your next story starts here'}</h2>
          <p>
            {posts.length
              ? 'Try another search or choose a different status.'
              : 'Generate your first fact card in Studio. It will appear here, ready to review and download.'}
          </p>
          {posts.length ? (
            <button
              className="button button-dark"
              onClick={() => {
                setSearch('')
                setStatus('all')
              }}
            >
              Clear filters
            </button>
          ) : null}
        </section>
      )}
    </>
  )
}
