import {defineQuery} from 'next-sanity'

export const FACT_CARDS_QUERY = defineQuery(
  `*[_type == "factCard" && defined(slug.current)] | order(_createdAt desc){ _id, title, slug }`,
)

export const FACT_CARD_QUERY = defineQuery(
  `*[_type == "factCard" && slug.current == $slug][0]{ _id, title, body }`,
)
