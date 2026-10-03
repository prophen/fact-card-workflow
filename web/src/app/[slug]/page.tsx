import {PortableText} from 'next-sanity'
import {notFound} from 'next/navigation'
import {client} from '@/sanity/client'
import {FACT_CARD_QUERY} from '@/sanity/queries'

const options = {next: {revalidate: 30}}

export default async function FactCardPage({
  params,
}: {
  params: Promise<{slug: string}>
}) {
  const {slug} = await params
  const factCard = await client.fetch(FACT_CARD_QUERY, {slug}, options)

  if (!factCard) return notFound()

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{factCard.title}</h1>
      {Array.isArray(factCard.body) && <PortableText value={factCard.body} />}
    </article>
  )
}
