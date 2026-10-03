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
