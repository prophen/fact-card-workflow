import {createClient} from '@sanity/client'
import {documentEventHandler} from '@sanity/functions'
import {ENGINE_API_VERSION} from '@sanity/workflow-engine'
import {createPostEngineFromClient} from '../../studio/workflows/runtime'
import {regenerationHandler} from './regenerate'
import {restartLegacyRejection} from './legacy'

export const handler = documentEventHandler<{_id: string}>(async ({context, event}) => {
  const {projectId, dataset} = context.clientOptions
  if (projectId !== 'ta2gi825' || dataset !== 'production') {
    throw new Error('Unexpected fact card workflow resource')
  }
  const client = createClient({
    ...context.clientOptions,
    apiVersion: ENGINE_API_VERSION,
    perspective: 'raw',
    useCdn: false,
  })
  const engine = createPostEngineFromClient(client, {
    'regenerate-post': regenerationHandler(client),
    'retry-regenerate-post': regenerationHandler(client),
  }, async (_params, ctx) => {
    // Existing instances retain their original definition snapshot. Support their rejection
    // effect without rewriting the snapshot or erasing the previous review history.
    const replacementId = await restartLegacyRejection(client, engine, ctx.instanceId)
    if (replacementId) {
      for (let pass = 0; pass < 4; pass++) await engine.drainEffects({instanceId: replacementId})
    }
  })
  // Completing generation may enqueue a status update. Drain that work in this invocation too.
  for (let pass = 0; pass < 4; pass++) {
    await engine.drainEffects({instanceId: event.data._id})
    const remaining = await client.fetch<number>(
      'count(*[_id == $id][0].pendingEffects[!defined(claim)])', {id: event.data._id},
    )
    if (!remaining) break
  }
})
