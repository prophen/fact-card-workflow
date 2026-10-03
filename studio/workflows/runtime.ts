import {createClient, type SanityClient} from '@sanity/client'
import {
  createEngine,
  ENGINE_API_VERSION,
  extractDocumentId,
  type EffectHandler,
} from '@sanity/workflow-engine'

/** Server-only: use the agent token for submission/draining, your Studio token for review. */
export function createPostEngine(token: string) {
  const client = createClient({
    projectId: 'ta2gi825',
    dataset: 'production',
    apiVersion: ENGINE_API_VERSION,
    token,
    useCdn: false,
  })
  return createPostEngineFromClient(client)
}

export function createPostEngineFromClient(client: SanityClient, handlers: Record<string, EffectHandler> = {}) {
  const syncPostStatus: EffectHandler = async (params, ctx) => {
    if (typeof params.subject !== 'string') throw new Error('Expected a subject GDR URI')
    // Read the current stage rather than a queued literal: delayed effects cannot restore an old status.
    const stage = await client.fetch<string>(
      '*[_id == $id][0].currentStage',
      {id: ctx.instanceId},
      {perspective: 'raw'},
    )
    if (!['generating', 'inReview', 'approved', 'published'].includes(stage)) {
      throw new Error('Unexpected workflow stage')
    }
    const id = extractDocumentId(params.subject)
    const baseId = id.replace(/^drafts\./, '')
    const target = await client.fetch<string | null>(
      'coalesce(*[_id == $draft][0]._id, *[_id == $base][0]._id)',
      {draft: `drafts.${baseId}`, base: baseId},
      {perspective: 'raw'},
    )
    if (!target) throw new Error('Workflow subject no longer exists')
    await client.patch(target).set({status: stage}).commit()
  }
  return createEngine({
    client,
    workflowResource: {type: 'dataset', id: 'ta2gi825.production'},
    tag: 'production',
    executionContext: {kind: 'drainer', id: 'fact-card-status-sync'},
    effects: {
      handlers: {
        'sync-review-status': syncPostStatus,
        'sync-regenerated-status': syncPostStatus,
        'sync-approved-status': syncPostStatus,
        'sync-rejected-status': syncPostStatus,
        'sync-published-status': syncPostStatus,
        ...handlers,
      },
    },
  })
}
