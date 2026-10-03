import {client} from '@/sanity/client'
import {FACT_CARDS_QUERY} from '@/sanity/queries'
import Link from 'next/link'

const options = {next: {revalidate: 30}}

export default async function Home() {
  const factCards = await client.fetch(FACT_CARDS_QUERY, {}, options)

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Fact Cards</h1>
      {factCards.length === 0 ? (
        <p>No fact cards yet. Add one in the Studio.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {factCards.map((factCard) => {
            const slug = factCard.slug?.current
            if (!slug) return null

            return (
              <li key={factCard._id}>
                <Link
                  className="text-lg font-medium underline underline-offset-4"
                  href={`/${slug}`}
                >
                  {factCard.title}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
