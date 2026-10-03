import {createPostEngineFromClient} from './runtime'
import {regenerationHandler} from '../../functions/fact-card-status-sync/regenerate'
import {createClient} from '@sanity/client'
import {ENGINE_API_VERSION} from '@sanity/workflow-engine'
import process from 'node:process'

async function drain() {
  const token = process.env.SANITY_AUTH_TOKEN
  if (!token)
    throw new Error('Set the server-only SANITY_AUTH_TOKEN before draining workflow effects.')
  const client = createClient({
    projectId: 'ta2gi825',
    dataset: 'production',
    apiVersion: ENGINE_API_VERSION,
    token,
    useCdn: false,
  })
  const ids = await client.fetch<string[]>(
    '*[_type == "sanity.workflow.instance" && tag == "production" && definition == "post-workflow" && count(pendingEffects) > 0]._id',
    {},
    {perspective: 'raw'},
  )
  const engine = createPostEngineFromClient(client, {
    'regenerate-post': regenerationHandler(client),
    'retry-regenerate-post': regenerationHandler(client),
  })
  for (const instanceId of ids) {
    for (let pass = 0; pass < 4; pass++) await engine.drainEffects({instanceId})
  }
  console.log('Fact-card workflow effects drained.')
}

drain().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
