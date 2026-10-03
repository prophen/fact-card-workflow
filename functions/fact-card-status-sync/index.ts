import {createClient} from '@sanity/client'
import {documentEventHandler} from '@sanity/functions'
import {ENGINE_API_VERSION} from '@sanity/workflow-engine'
import {createPostEngineFromClient} from '../../studio/workflows/runtime'
import {regenerationHandler} from './regenerate'

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
  }, async (params, ctx) => {
    // Existing instances retain their original definition snapshot. Support their rejection
    // effect without rewriting the snapshot or erasing the previous review history.
    const instance = await client.getDocument<{definitionSnapshot: string; fields: {name: string; value: unknown}[]}>(ctx.instanceId)
    if (!instance || instance.definitionSnapshot.includes('regenerate-post')) return
    const revisionNote = instance.fields.find((field) => field.name === 'revisionNote')?.value
    await regenerationHandler(client)({...params, revisionNote}, ctx)
    await engine.fireAction({
      instanceId: ctx.instanceId, activity: 'generate', action: 'submit',
      idempotencyKey: `replacement-submit-${ctx.effectKey}`,
    })
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
