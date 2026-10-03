import { getPosts } from '@/sanity/posts'
import { Header } from '@/components/post-ui'
import { PostLibrary } from '@/components/post-library'
export const dynamic = 'force-dynamic'
export default async function Home() {
  const posts = await getPosts()
  return (
    <>
      <Header />
      <main className="library-main">
        <section className="library-hero">
          <div>
            <p className="eyebrow">HISTORY WORTH SHARING</p>
            <h1>
              One fact.
              <br />
              <span>A lasting story.</span>
            </h1>
            <p className="hero-description">
              Your California Black history collection.
              <br />
              Explore the facts, read the sources, and download your cards.
            </p>
          </div>
          <div className="collection-note">
            <span className="note-symbol" aria-hidden="true">
              ✦
            </span>
            <p>
              Every story starts with a fact.
              <br />
              Every fact deserves a source.
            </p>
            <span className="note-rule" />
            <small>FACT CARDS · CALIFORNIA BLACK STORIES</small>
          </div>
        </section>
        <PostLibrary posts={posts} />
      </main>
      <footer className="site-footer">
        <span>California Black Stories</span>
        <span>History. Community. Conversation.</span>
      </footer>
    </>
  )
}
