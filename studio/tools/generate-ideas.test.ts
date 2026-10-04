import {expect, test, vi} from 'vitest'
import {generateIdeas} from '../../shared/generate-ideas'

const settings = {openaiKey: 'test-only', model: 'test-model'}
test('scopes categories to California and returns a bounded, deduplicated list', async () => {
  const request = vi.fn(async () =>
    Response.json({
      choices: [
        {
          message: {
            content: JSON.stringify({
              claims: [
                'A specific idea.',
                'A specific idea.',
                'Another idea.',
                '',
                123,
                'x'.repeat(401),
                'Third.',
                'Fourth.',
                'Fifth.',
                'Sixth.',
              ],
            }),
          },
        },
      ],
    }),
  )
  expect(await generateIdeas('Black newspapers, California music', settings, request)).toEqual([
    'A specific idea.',
    'Another idea.',
    'Third.',
    'Fourth.',
    'Fifth.',
  ])
  const body = JSON.parse(
    (request.mock.calls[0] as unknown as [string, RequestInit])[1].body as string,
  )
  expect(JSON.parse(body.messages[1].content).coreTopics).toEqual([
    'Black newspapers in California',
    'California music',
  ])
})
test('does not call the provider for empty categories', async () => {
  const request = vi.fn()
  await expect(generateIdeas(' , ', settings, request)).rejects.toThrow('core topics')
  expect(request).not.toHaveBeenCalled()
})
test('surfaces provider and malformed output failures', async () => {
  await expect(
    generateIdeas('history', settings, async () => new Response(null, {status: 429})),
  ).rejects.toThrow('429')
  await expect(
    generateIdeas('history', settings, async () =>
      Response.json({choices: [{message: {content: 'bad json'}}]}),
    ),
  ).rejects.toThrow('usable topic ideas')
  await expect(
    generateIdeas('history', settings, async () =>
      Response.json({choices: [{message: {content: '{"claims":[]}'}}]}),
    ),
  ).rejects.toThrow('No usable')
})
