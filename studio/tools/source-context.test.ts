import {expect, test} from 'vitest'
import {readSourceContext, signSourceContext} from '../../shared/source-context'
const evidence = [
  {title: 'Archive', url: 'https://example.org', highlights: ['Retrieved excerpt.']},
]
const key = 'test-only-signing-key'
test('source evidence survives a signed round trip for the same Studio user', () => {
  const token = signSourceContext(evidence, 'reviewer', key, 1000)
  expect(readSourceContext(token, 'reviewer', key, 2000)).toEqual(evidence)
  expect(token).not.toContain(key)
})
test('Studio cannot substitute invented source evidence', () => {
  const token = signSourceContext(evidence, 'reviewer', key, 1000)
  const [payload, signature] = token.split('.')
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
  data.sources[0].highlights = ['Invented quote.']
  const changed = Buffer.from(JSON.stringify(data)).toString('base64url')
  expect(() => readSourceContext(`${changed}.${signature}`, 'reviewer', key, 2000)).toThrow(
    'Invalid source context',
  )
})
test('evidence contexts expire and cannot be transferred between users', () => {
  const token = signSourceContext(evidence, 'reviewer', key, 1000)
  expect(() => readSourceContext(token, 'another-user', key, 2000)).toThrow('expired')
  expect(() => readSourceContext(token, 'reviewer', key, 1000 + 30 * 60_000)).toThrow('expired')
})
