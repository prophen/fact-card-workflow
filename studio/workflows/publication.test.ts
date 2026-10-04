import type {SanityClient} from '@sanity/client'
import {refDataset} from '@sanity/workflow-engine'
import {createBench} from '@sanity/workflow-engine-test'
import {expect, test} from 'vitest'
import {postWorkflow} from './postWorkflow'
import {getPublishApproval, markPostPublished} from './publication'

async function setup() {
  const post = {
    _id: 'drafts.publication-card',
    _type: 'post',
    status: 'generating',
    factText: 'Verified fact',
    source: {citation: 'Verified source', url: 'https://example.org'},
    caption: 'What do you think?',
    renderTemplate: 'defaultFactCard',
    image: {asset: {_ref: 'image-test'}},
  }
  const bench = createBench({
    tag: 'production',
    workflowResource: {type: 'dataset', id: 'ta2gi825.production'},
    documents: [post],
  })
  await bench.deployDefinitions({definitions: [postWorkflow], expectedMinReaderModel: 10})
  const {instance} = await bench.startInstance({
    definition: 'post-workflow',
    perspective: 'drafts',
    initialFields: [
      {
        type: 'subject',
        name: 'subject',
        value: refDataset({
          projectId: 'ta2gi825',
          dataset: 'production',
          documentId: 'publication-card',
          type: 'post',
        }),
      },
    ],
  })
  const client = bench.client as unknown as SanityClient
  const approve = async () => {
    await bench.fireAction({instanceId: instance._id, activity: 'generate', action: 'submit'})
    await bench.fireAction({
      instanceId: instance._id,
      activity: 'review',
      action: 'approve',
      actor: {kind: 'person', id: 'greviewer', roles: ['administrator']},
    })
    await client.patch(post._id).set({status: 'approved'}).commit()
  }
  const publish = async (status = 'approved') => {
    await client.create({...post, _id: 'publication-card', status})
    await client.delete(post._id)
  }
  return {bench, client, instance, approve, publish}
}

test('only approved posts enable Studio Publish; approval alone does not complete publication', async () => {
  const {bench, client, instance, approve} = await setup()
  expect(await getPublishApproval(client, 'publication-card')).toBeNull()
  await approve()
  expect((await getPublishApproval(client, 'publication-card'))?._id).toBe(instance._id)
  await markPostPublished(client, 'publication-card')
  expect(await bench.currentStage(instance._id)).toBe('approved')
})

test('a successful draft publication completes the same workflow and tolerates duplicate events', async () => {
  const {bench, client, instance, approve, publish} = await setup()
  await approve()
  await publish()
  await markPostPublished(client, 'publication-card')
  expect(await bench.currentStage(instance._id)).toBe('published')
  expect((await client.getDocument('publication-card'))?.status).toBe('published')
  expect(await getPublishApproval(client, 'publication-card')).toBeNull()
  await markPostPublished(client, 'publication-card')
  expect(await bench.currentStage(instance._id)).toBe('published')
})

test('a published document with a forged approved status cannot bypass workflow review', async () => {
  const {bench, client, instance, publish} = await setup()
  await publish()
  await markPostPublished(client, 'publication-card')
  expect(await bench.currentStage(instance._id)).toBe('generating')
})

test('publication works when the mirrored status has not caught up with approval', async () => {
  const {bench, client, instance, approve, publish} = await setup()
  await approve()
  await publish('inReview')
  await markPostPublished(client, 'publication-card')
  expect(await bench.currentStage(instance._id)).toBe('published')
  expect((await client.getDocument('publication-card'))?.status).toBe('published')
})
test('an older published copy cannot complete approval of an unpublished draft', async () => {
  const {bench, client, instance, approve} = await setup()
  await approve()
  await client.create({_id: 'publication-card', _type: 'post', status: 'published'})
  await markPostPublished(client, 'publication-card')
  expect(await bench.currentStage(instance._id)).toBe('approved')
})
