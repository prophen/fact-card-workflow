import { getPost } from '@/sanity/posts'
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await getPost(id)
  if (!post?.image?.url)
    return Response.json({ error: 'No card image is available yet.' }, { status: 404 })
  const url = new URL(post.image.url)
  const prefix = `/images/${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}/${process.env.NEXT_PUBLIC_SANITY_DATASET}/`
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'cdn.sanity.io' ||
    !url.pathname.startsWith(prefix)
  )
    return Response.json({ error: 'The card image could not be downloaded.' }, { status: 502 })
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15000) })
  if (!response.ok)
    return Response.json({ error: 'The card image is temporarily unavailable.' }, { status: 502 })
  const mime = response.headers.get('content-type')?.split(';')[0] || post.image.mimeType
  const extensions: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
  }
  if (!extensions[mime])
    return Response.json({ error: 'Unsupported card image format.' }, { status: 502 })
  return new Response(response.body, {
    headers: {
      'Content-Type': mime,
      'Content-Disposition': `attachment; filename="california-black-stories-${post._id}.${extensions[mime]}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
