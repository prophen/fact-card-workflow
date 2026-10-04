import {expect, test, vi} from 'vitest'
import {overrideAudit, recheckFinding} from '../../shared/audit-review'
import {signSourceContext, readRevisionContext} from '../../shared/source-context'
import {storedAudit} from '../../shared/store-audit'
import type {AuditState} from '../../shared/audit-types'

const findings: AuditState['findings'] = [
  {
    part: 'first Los Angeles CORE chapter',
    status: 'contradicted',
    detail: 'A later chapter existed in the 1950s.',
  },
  {
    part: 'formed in the early 1940s',
    status: 'supported',
    detail: 'The source directly confirms the date.',
  },
]
const audit: AuditState = {
  originalClaim: 'The first Los Angeles CORE chapter formed in the early 1940s.',
  findings,
  sources: [
    {
      title: 'Archive',
      url: 'https://example.org/core',
      highlights: [
        'The first Los Angeles CORE chapter formed in the early 1940s. A new chapter was resurrected in the 1950s.',
      ],
    },
  ],
  history: [{kind: 'initial', at: '2026-10-04T12:00:00Z', findings}],
}
const settings = {openaiKey: 'test-only', model: 'test-model'}

test('a recheck changes only the disputed finding, uses saved evidence, and keeps the original verdict', async () => {
  const request = vi.fn(async (_url: string | URL | Request, _options?: RequestInit) =>
    Response.json({
      choices: [
        {
          message: {
            content: JSON.stringify({
              status: 'supported',
              detail: 'The source explicitly describes this as the first chapter.',
            }),
          },
        },
      ],
    }),
  )
  const reviewed = await recheckFinding(
    audit,
    0,
    'First does not mean only.',
    'reviewer',
    settings,
    request,
  )
  expect(request).toHaveBeenCalledTimes(1)
  expect(request.mock.calls[0][0]).toBe('https://api.openai.com/v1/chat/completions')
  const body = JSON.parse(request.mock.calls[0][1]!.body as string)
  expect(body.messages[0].content).toContain('First does not mean only')
  expect(JSON.parse(body.messages[1].content).sources).toEqual(audit.sources)
  expect(reviewed.findings[0].status).toBe('supported')
  expect(reviewed.findings[1]).toEqual(findings[1])
  expect(reviewed.history[0].findings[0].status).toBe('contradicted')
  expect(reviewed.history[1]).toMatchObject({
    kind: 'recheck',
    actor: 'reviewer',
    explanation: 'First does not mean only.',
    findingIndex: 0,
  })
  expect(audit.history).toHaveLength(1)
})

test('a recheck may keep a finding unsupported and cannot invent a new status', async () => {
  await expect(recheckFinding(audit, 20, 'Why?', 'reviewer', settings, vi.fn())).rejects.toThrow(
    'Choose a finding',
  )
  const request = async () =>
    Response.json({choices: [{message: {content: '{"status":"approved","detail":"Yes"}'}}]})
  await expect(recheckFinding(audit, 0, 'Why?', 'reviewer', settings, request)).rejects.toThrow(
    'incomplete finding',
  )
  expect(audit.history).toHaveLength(1)
})

test('an override records the reviewer and source without relabeling model findings as supported', () => {
  const reviewed = overrideAudit(
    audit,
    'The excerpt explicitly says first; a later revival is compatible.',
    audit.sources[0].url,
    'reviewer',
  )
  expect(reviewed.originalClaim).toBe(audit.originalClaim)
  expect(reviewed.findings).toEqual(findings)
  expect(reviewed.history.at(-1)).toMatchObject({
    kind: 'override',
    actor: 'reviewer',
    sourceUrl: audit.sources[0].url,
  })
  expect(() => overrideAudit(audit, '', audit.sources[0].url, 'reviewer')).toThrow('Explain why')
  expect(() => overrideAudit(audit, 'Reason', 'https://invented.org', 'reviewer')).toThrow(
    'Choose a supporting source',
  )
})

test('signed contexts preserve audit history and bind it to the authenticated reviewer', () => {
  const reviewed = overrideAudit(
    audit,
    'First does not mean only.',
    audit.sources[0].url,
    'reviewer',
  )
  const token = signSourceContext(
    reviewed.sources,
    'reviewer',
    'test-only',
    1000,
    undefined,
    reviewed,
  )
  expect(readRevisionContext(token, 'reviewer', 'test-only', 2000).audit).toEqual(reviewed)
  expect(() => readRevisionContext(token, 'someone-else', 'test-only', 2000)).toThrow()
  expect(() => readRevisionContext(token + 'tampered', 'reviewer', 'test-only', 2000)).toThrow()
  const saved = storedAudit(reviewed)
  expect(saved._key).toBeTruthy()
  expect(saved.history.at(-1)).toMatchObject({
    kind: 'override',
    actor: 'reviewer',
    sourceUrl: audit.sources[0].url,
  })
  expect(saved.history[0].findings[0].status).toBe('contradicted')
  expect(saved.history.every((event) => event._key && event._type === 'claimAuditEvent')).toBe(true)
})
