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
  await createPostEngineFromClient(client, {
    'regenerate-post': regenerationHandler(client),
    'retry-regenerate-post': regenerationHandler(client),
  }).drainEffects({instanceId: event.data._id})
})
