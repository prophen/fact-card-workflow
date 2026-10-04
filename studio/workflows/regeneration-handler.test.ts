import type {SanityClient} from '@sanity/client'
import type {EffectHandler} from '@sanity/workflow-engine'
import {afterEach, expect, test, vi} from 'vitest'
import {regenerationHandler} from '../../functions/fact-card-status-sync/regenerate'
import {revisionScope} from '../../shared/revise-presentation'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})
function setup() {
  let post: Record<string, unknown> = {
    _id: 'drafts.card',
    _rev: 'original',
    _type: 'post',
    factText: 'An existing verified fact.',
    caption: 'An existing verified fact. What do you think?',
    source: {citation: 'Existing citation.', url: 'https://example.org'},
    image: {asset: {_ref: 'image-original'}},
    renderTemplate: 'defaultFactCard',
  }
  const original = structuredClone(post)
  const fetch = vi.fn(async () => true)
  const upload = vi.fn(async () => ({_id: 'image-revised'}))
  const patch = vi.fn(() => {
    const changes: Record<string, unknown> = {}
    let guard: string | undefined
    const removals: string[] = []
    const builder = {
      set(value: Record<string, unknown>) {
        Object.assign(changes, value)
        return builder
      },
      unset(keys: string[]) {
        removals.push(...keys)
        return builder
      },
      ifRevisionId(rev: string) {
        guard = rev
        return builder
      },
      async commit() {
        if (guard && guard !== post._rev)
          throw Object.assign(Error('Revision conflict'), {statusCode: 409})
        post = {...post, ...changes, _rev: 'updated'}
        for (const key of removals) delete post[key]
        return post
      },
    }
    return builder
  })
  const client = {
    fetch,
    getDocument: vi.fn(async () => post),
    patch,
    assets: {upload},
  } as unknown as SanityClient
  const ctx = {instanceId: 'workflow', effectKey: 'effect-1'} as Parameters<EffectHandler>[1]
  return {
    client,
    ctx,
    original,
    getPost: () => post,
    edit: (changes: Record<string, unknown>) => {
      post = {...post, ...changes, _rev: 'concurrent'}
    },
    upload,
    fetch,
  }
}

test('caption-only feedback preserves the fact, citation, and image without Exa or uploads', async () => {
  const state = setup()
  vi.stubEnv('OPENAI_API_KEY', 'test-only')
  vi.stubEnv('EXA_API_KEY', '')
  const provider = vi.fn(async (_url: string | URL | Request) =>
    Response.json({
      choices: [
        {
          message: {
            content: JSON.stringify({
              caption: 'An existing verified fact. Which detail interests you most?',
            }),
          },
        },
      ],
    }),
  )
  vi.stubGlobal('fetch', provider)
  await regenerationHandler(state.client)(
    {
      subject: 'dataset:ta2gi825:production:card',
      revisionNote:
        'Change the question in the Facebook caption. Keep the fact, source, and card image unchanged.',
    },
    state.ctx,
  )
  expect(provider).toHaveBeenCalledTimes(1)
  expect(String(provider.mock.calls[0]?.[0])).not.toContain('exa')
  expect(state.upload).not.toHaveBeenCalled()
  for (const field of ['factText', 'source', 'image'])
    expect(state.getPost()[field]).toEqual(state.original[field])
  expect(state.getPost().caption).toContain('Which detail')
  expect(state.getPost().regenerationKey).toBe('effect-1')
  expect(state.getPost().generationError).toBeUndefined()
})

test('image-only feedback renders the existing fact without any generation provider', async () => {
  const state = setup()
  vi.stubEnv('OPENAI_API_KEY', '')
  vi.stubEnv('EXA_API_KEY', '')
  const provider = vi.fn(async () => {
    throw Error('Unexpected provider request')
  })
  vi.stubGlobal('fetch', provider)
  await regenerationHandler(state.client)(
    {subject: 'dataset:ta2gi825:production:card', revisionNote: 'Regenerate the image'},
    state.ctx,
  )
  expect(provider).not.toHaveBeenCalled()
  expect(state.upload).toHaveBeenCalledTimes(1)
  for (const field of ['factText', 'source', 'caption'])
    expect(state.getPost()[field]).toEqual(state.original[field])
  expect(state.getPost().image).toMatchObject({asset: {_ref: 'image-revised'}})
})

test('factual, source, and ambiguous feedback uses full verification', () => {
  for (const note of [
    'Correct the year',
    'Change the fact and caption',
    'Use a primary source',
    'Try again',
  ])
    expect(revisionScope(note)).toBe('content')
  expect(revisionScope('Change the caption and image')).toBe('presentation')
})

test('background status changes during generation do not fail the first replacement', async () => {
  const state = setup()
  vi.stubEnv('OPENAI_API_KEY', 'test-only')
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      state.edit({status: 'generating'})
      return Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({caption: 'The same fact. What interests you most?'}),
            },
          },
        ],
      })
    }),
  )
  await regenerationHandler(state.client)(
    {subject: 'dataset:ta2gi825:production:card', revisionNote: 'Change the caption'},
    state.ctx,
  )
  expect(state.getPost().regenerationKey).toBe('effect-1')
  expect(state.getPost().caption).toContain('What interests')
})

test('reviewer edits during generation are preserved and the replacement stops', async () => {
  const state = setup()
  vi.stubEnv('OPENAI_API_KEY', 'test-only')
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      state.edit({caption: 'A reviewer edit. What do you think?'})
      return Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({caption: 'The same fact. What interests you most?'}),
            },
          },
        ],
      })
    }),
  )
  await expect(
    regenerationHandler(state.client)(
      {subject: 'dataset:ta2gi825:production:card', revisionNote: 'Change the caption'},
      state.ctx,
    ),
  ).rejects.toThrow('post was edited')
  expect(state.getPost().caption).toBe('A reviewer edit. What do you think?')
  expect(state.getPost().regenerationKey).toBeUndefined()
})
