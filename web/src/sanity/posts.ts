import 'server-only'
import { createClient, defineQuery } from 'next-sanity'

export type PostStatus = 'generating' | 'inReview' | 'approved' | 'published'
export type Post = {
  _id: string
  _updatedAt: string
  topic: string | null
  factText: string | null
  caption: string | null
  source: { citation?: string; url?: string } | null
  status: PostStatus | null
  renderTemplate: string | null
  generationError: string | null
  image: { url: string; mimeType: string; width: number; height: number } | null
}
const fields = `_id, _updatedAt, topic, factText, caption, source{citation, url}, status, renderTemplate, generationError,
  "image": image.asset->{url, mimeType, "width": metadata.dimensions.width, "height": metadata.dimensions.height}`
const postsQuery = defineQuery(`*[_type == "post"] | order(_updatedAt desc){${fields}}`)
const postQuery = defineQuery(`*[_type == "post" && _id == $id][0]{${fields}}`)
function postClient() {
  if (!process.env.SANITY_API_READ_TOKEN)
    throw new Error('Configure the server-only SANITY_API_READ_TOKEN to read the post library.')
  return createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
    apiVersion: '2026-10-03',
    useCdn: false,
    perspective: 'drafts',
    token: process.env.SANITY_API_READ_TOKEN,
  })
}
export async function getPosts() {
  return postClient().fetch<Post[]>(postsQuery, {}, { cache: 'no-store' })
}
export async function getPost(id: string) {
  if (!/^[a-zA-Z0-9_.-]{1,128}$/.test(id)) return null
  return postClient().fetch<Post | null>(postQuery, { id }, { cache: 'no-store' })
}
