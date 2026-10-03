import type {SanityClient} from '@sanity/client'
import {instancesQuery, refDataset, type WorkflowInstance} from '@sanity/workflow-engine'
import {createPostEngineFromClient} from './runtime'

export function publicationQuery(id: string) {
  return instancesQuery({
    tag: 'production',
    filter: {
      document: refDataset({
        projectId: 'ta2gi825',
        dataset: 'production',
        documentId: id.replace(/^drafts\./, ''),
        type: 'post',
      }).id,
      definition: 'post-workflow',
    },
  })
}

export async function getPublishApproval(client: SanityClient, id: string) {
  const {query, params} = publicationQuery(id)
  const instances = await client.fetch<WorkflowInstance[]>(query, params, {perspective: 'raw'})
  // Fail closed if there is no current workflow or more than one competing workflow.
  return instances.length === 1 &&
    instances[0].currentStage === 'approved' &&
    instances[0].fields.some((field) => field.name === 'approvedBy' && field.value)
    ? instances[0]
    : null
}

/** Called only after the published document exists; safe for duplicate delivery. */
export async function markPostPublished(client: SanityClient, id: string) {
  const baseId = id.replace(/^drafts\./, '')
  const post = await client.getDocument<{_type: string; status?: string}>(baseId)
  if (!post || post._type !== 'post' || post.status !== 'approved') return
  const instance = await getPublishApproval(client, baseId)
  if (!instance) return
  const engine = createPostEngineFromClient(client)
  await engine.fireAction({
    instanceId: instance._id,
    activity: 'publish',
    action: 'mark-published',
    idempotencyKey: `studio-publication-${instance._id}`,
  })
  await engine.drainEffects({instanceId: instance._id})
}
