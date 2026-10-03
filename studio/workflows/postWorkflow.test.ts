import {createBench, subjectField} from '@sanity/workflow-engine-test'
import {describe, expect, test} from 'vitest'
import {postWorkflow} from './postWorkflow'

const agent = {kind: 'agent' as const, id: 'p-generation', roles: ['contributor']}
const editor = {kind: 'person' as const, id: 'geditor', roles: ['administrator']}

async function setup(ready = true) {
  const post = {
    _id: 'example-post',
    _type: 'post',
    status: 'generating',
    ...(ready
      ? {
          factText: 'Example fact',
          source: {citation: 'Example source', url: 'https://example.org'},
          caption: 'What would you like to learn?',
          renderTemplate: 'cbs-fact',
          image: {_type: 'image', asset: {_type: 'reference', _ref: 'image-example-png'}},
        }
      : {}),
  }
  const bench = createBench({documents: [post, {...post, _id: 'drafts.example-post'}]})
  await bench.deployDefinitions({expectedMinReaderModel: 10, definitions: [postWorkflow]})
  const {instance} = await bench.startInstance({
    definition: 'post-workflow',
    initialFields: [subjectField(post._id, {type: 'post'})],
  })
  return {bench, id: instance._id}
}

describe('fact card approval workflow', () => {
  test('agent submits; human approves; publication is terminal', async () => {
    const {bench, id} = await setup()
    expect(await bench.currentStage(id)).toBe('generating')
    await bench.fireAction({instanceId: id, activity: 'generate', action: 'submit', actor: agent})
    expect(await bench.currentStage(id)).toBe('inReview')
    await expect(
      bench.fireAction({instanceId: id, activity: 'review', action: 'approve', actor: agent}),
    ).rejects.toThrow()
    await expect(
      bench.fireAction({
        instanceId: id,
        activity: 'publish',
        action: 'mark-published',
        actor: agent,
      }),
    ).rejects.toThrow()
    await bench.fireAction({instanceId: id, activity: 'review', action: 'approve', actor: editor})
    expect(await bench.currentStage(id)).toBe('approved')
    await bench.fireAction({
      instanceId: id,
      activity: 'publish',
      action: 'mark-published',
      actor: agent,
    })
    expect(await bench.currentStage(id)).toBe('published')
    await expect(
      bench.fireAction({
        instanceId: id,
        activity: 'publish',
        action: 'mark-published',
        actor: agent,
      }),
    ).rejects.toThrow()
  })

  test('reject returns to generating and requires a fresh human decision', async () => {
    const {bench, id} = await setup()
    await bench.fireAction({instanceId: id, activity: 'generate', action: 'submit', actor: agent})
    await bench.fireAction({
      instanceId: id,
      activity: 'review',
      action: 'reject',
      actor: editor,
      params: {note: 'Use a better citation'},
    })
    expect(await bench.currentStage(id)).toBe('generating')
    await bench.fireAction({instanceId: id, activity: 'generate', action: 'submit', actor: agent})
    expect(await bench.currentStage(id)).toBe('inReview')
    await expect(
      bench.fireAction({
        instanceId: id,
        activity: 'publish',
        action: 'mark-published',
        actor: agent,
      }),
    ).rejects.toThrow()
  })

  test('an incomplete card cannot be submitted', async () => {
    const {bench, id} = await setup(false)
    await expect(
      bench.fireAction({instanceId: id, activity: 'generate', action: 'submit', actor: agent}),
    ).rejects.toThrow()
    expect(await bench.currentStage(id)).toBe('generating')
  })
})
