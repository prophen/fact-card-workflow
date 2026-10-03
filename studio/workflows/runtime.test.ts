import type {SanityClient} from '@sanity/client'
import {refDataset} from '@sanity/workflow-engine'
import {createBench} from '@sanity/workflow-engine-test'
import {expect, test} from 'vitest'
import {postWorkflow} from './postWorkflow'
import {createPostEngineFromClient} from './runtime'

test('background drainer syncs rejection, approval and terminal publication to the draft', async () => {
  const post = {
    _id: 'card',
    _type: 'post',
    status: 'generating',
    factText: 'A verified fact',
    source: {citation: 'A source', url: 'https://example.org'},
    caption: 'What do you think?',
    renderTemplate: 'cbs-card',
    image: {asset: {_ref: 'image-example-png'}},
  }
  const bench = createBench({
    tag: 'production',
    workflowResource: {type: 'dataset', id: 'ta2gi825.production'},
    documents: [post, {...post, _id: 'drafts.card'}],
  })
  await bench.deployDefinitions({definitions: [postWorkflow], expectedMinReaderModel: 10})
  const {instance} = await bench.startInstance({
    definition: 'post-workflow',
    initialFields: [
      {
        type: 'subject',
        name: 'subject',
        value: refDataset({
          projectId: 'ta2gi825',
          dataset: 'production',
          documentId: 'card',
          type: 'post',
        }),
      },
    ],
  })
  const engine = createPostEngineFromClient(bench.client as unknown as SanityClient)
  const editor = {kind: 'person' as const, id: 'greviewer', roles: ['administrator']}
  async function checkStatus(expected: string) {
    await engine.drainEffects({instanceId: instance._id})
    await engine.drainEffects({instanceId: instance._id})
    expect(bench.snapshot().find((doc) => doc._id === 'drafts.card')?.status).toBe(expected)
    expect(bench.snapshot().find((doc) => doc._id === 'card')?.status).toBe('generating')
  }
  await bench.fireAction({instanceId: instance._id, activity: 'generate', action: 'submit'})
  await checkStatus('inReview')
  await bench.fireAction({
    instanceId: instance._id,
    activity: 'review',
    action: 'reject',
    actor: editor,
    params: {note: 'Revise the source'},
  })
  await checkStatus('generating')
  await bench.fireAction({instanceId: instance._id, activity: 'generate', action: 'submit'})
  await checkStatus('inReview')
  await bench.fireAction({
    instanceId: instance._id,
    activity: 'review',
    action: 'approve',
    actor: editor,
  })
  await checkStatus('approved')
  await bench.fireAction({instanceId: instance._id, activity: 'publish', action: 'mark-published'})
  await checkStatus('published')
})
