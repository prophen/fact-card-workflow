import {expect, test, vi} from 'vitest'
import {generatePost} from '../../web/src/lib/generate-post'

const settings = {openaiKey: 'test-only', exaKey: 'test-only', model: 'test-model'}
const quote = 'In 1900 a Black community established a school in California.'
const checked = {
  verdict: 'supported',
  sourceIndex: 0,
  quote,
  factText: quote,
  caption: 'This community created a school. What would you like to learn?',
}
function mockFetch(result: Record<string, unknown>) {
  const responses = [
    {choices: [{message: {content: JSON.stringify({claim: quote})}}]},
    {
      results: [
        {title: 'Historical archive', url: 'https://example.org/archive', highlights: [quote]},
      ],
    },
    {choices: [{message: {content: JSON.stringify(result)}}]},
  ]
  return vi.fn(async () => Response.json(responses.shift())) as unknown as typeof fetch
}
test('uses the actual Exa source and appends a caption question', async () => {
  const fetch = mockFetch(checked)
  const result = await generatePost('California schools', settings, fetch)
  expect(result.source.url).toBe('https://example.org/archive')
  expect(result.source.citation).toContain(quote)
  expect(result.caption.endsWith('?')).toBe(true)
  expect(fetch).toHaveBeenCalledTimes(3)
})
test('does not accept an unsupported fact', async () => {
  await expect(
    generatePost('schools', settings, mockFetch({verdict: 'unsupported'})),
  ).rejects.toThrow('could not be supported')
})
test('does not accept a fabricated quote or source index', async () => {
  await expect(
    generatePost('schools', settings, mockFetch({...checked, quote: 'Invented evidence'})),
  ).rejects.toThrow('could not be supported')
  await expect(
    generatePost('schools', settings, mockFetch({...checked, sourceIndex: 20})),
  ).rejects.toThrow('could not be supported')
})
test('rejects captions without an engagement question and oversized card facts', async () => {
  await expect(
    generatePost('schools', settings, mockFetch({...checked, caption: 'No question.'})),
  ).rejects.toThrow('could not be supported')
  await expect(
    generatePost('schools', settings, mockFetch({...checked, factText: 'x'.repeat(281)})),
  ).rejects.toThrow('could not be supported')
})
test('surfaces provider failure instead of substituting placeholder content', async () => {
  const fetch = vi.fn(
    async () => new Response(null, {status: 429}),
  ) as unknown as typeof globalThis.fetch
  await expect(generatePost('schools', settings, fetch)).rejects.toThrow('429')
})

test('passes revision feedback to both drafting and evidence checking', async () => {
  const fetch = mockFetch(checked)
  const revision = {note: 'Use a primary source and a shorter caption', previousFact: quote}
  await generatePost('California schools', settings, fetch, revision)
  const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls
  const draft = JSON.parse(calls[0][1].body)
  const verification = JSON.parse(calls[2][1].body)
  expect(JSON.parse(draft.messages[1].content).revision).toEqual(revision)
  expect(JSON.parse(verification.messages[1].content).revision).toEqual(revision)
})

test('verifies the selected idea without replacing it with another generated candidate', async () => {
  const responses = [
    {
      results: [
        {title: 'Historical archive', url: 'https://example.org/archive', highlights: [quote]},
      ],
    },
    {choices: [{message: {content: JSON.stringify(checked)}}]},
  ]
  const request = vi.fn(async () => Response.json(responses.shift()))
  const result = await generatePost('California schools', settings, request, undefined, quote)
  expect(request).toHaveBeenCalledTimes(2)
  const calls = request.mock.calls as unknown as [string, RequestInit][]
  expect(calls[0][0]).toBe('https://api.exa.ai/search')
  expect(JSON.parse(calls[0][1].body as string).query).toBe(quote)
  expect(JSON.parse(JSON.parse(calls[1][1].body as string).messages[1].content).candidate).toBe(
    quote,
  )
  expect(result.source.citation).toContain(quote)
})
test('selected ideas still require supporting source evidence', async () => {
  const responses = [
    {results: [{title: 'Archive', url: 'https://example.org', highlights: [quote]}]},
    {choices: [{message: {content: '{"verdict":"unsupported"}'}}]},
  ]
  await expect(
    generatePost(
      'history',
      settings,
      async () => Response.json(responses.shift()),
      undefined,
      'An unverified idea.',
    ),
  ).rejects.toThrow('could not be supported')
})

test('failed verification returns the exact candidate for retry', async () => {
  const {SourceVerificationError} = await import('../../shared/generate-post')
  try {
    await generatePost('schools', settings, mockFetch({verdict: 'unsupported'}))
    throw new Error('Expected verification failure')
  } catch (error) {
    expect(error).toBeInstanceOf(SourceVerificationError)
    expect((error as InstanceType<typeof SourceVerificationError>).candidateClaim).toBe(quote)
  }
})

test('source retry preserves the claim and verifies against longer retrieved source text', async () => {
  const responses = [
    {
      results: [
        {
          title: 'Archive',
          url: 'https://example.org/archive',
          text: `Historical context. ${quote} Further context.`,
        },
      ],
    },
    {choices: [{message: {content: JSON.stringify(checked)}}]},
  ]
  const request = vi.fn(async () => Response.json(responses.shift()))
  const result = await generatePost('schools', settings, request, undefined, quote, true)
  const calls = request.mock.calls as unknown as [string, RequestInit][]
  const search = JSON.parse(calls[0][1].body as string)
  expect(search).toMatchObject({
    query: quote,
    numResults: 10,
    contents: {text: {maxCharacters: 8000}},
  })
  expect(request).toHaveBeenCalledTimes(2)
  expect(result.source.citation).toContain(quote)
})

test('broader source retries still reject invented evidence', async () => {
  const responses = [
    {results: [{title: 'Archive', url: 'https://example.org/archive', text: quote}]},
    {choices: [{message: {content: JSON.stringify({...checked, quote: 'Invented evidence'})}}]},
  ]
  await expect(
    generatePost(
      'schools',
      settings,
      async () => Response.json(responses.shift()),
      undefined,
      quote,
      true,
    ),
  ).rejects.toThrow('could not be supported')
})
