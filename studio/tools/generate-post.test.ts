import {expect, test, vi} from 'vitest'
import {generatePost, SourceVerificationError} from '../../shared/generate-post'

const settings = {openaiKey: 'test-only', exaKey: 'test-only', model: 'test-model'}
const claim = 'A Black community established a school in California in 1900.'
const sources = {
  results: [{title: 'Archive', url: 'https://example.org/archive', highlights: [claim]}],
}
const supported = {
  findings: [
    {
      part: claim,
      status: 'supported',
      detail: 'The archive supports this.',
      sourceIndex: 0,
      quote: claim,
    },
  ],
}
const caption = {
  caption: 'The community established a school.',
  cta: 'What would you like to learn?',
}
const completion = (content: unknown) => ({
  choices: [{message: {content: JSON.stringify(content)}}],
})
function requestFor(...responses: unknown[]) {
  return vi.fn(async (_url: string | URL | Request, _options?: RequestInit) => {
    if (!responses.length) throw new Error('Unexpected provider call')
    return Response.json(responses.shift())
  })
}

test('drafts, audits and separately captions a supported fact', async () => {
  const request = requestFor(
    completion({claim}),
    sources,
    completion(supported),
    completion(caption),
  )
  const post = await generatePost('schools', settings, request)
  expect(post.factText).toBe(claim)
  expect(post.caption.endsWith('?')).toBe(true)
  expect(post.source.citation).toContain('Archive')
  expect(post.source.url).toBe('https://example.org/archive')
  expect(post.verification?.findings).toEqual(supported.findings)
  expect(request).toHaveBeenCalledTimes(4)
})

test('selected claims skip drafting and preserve the exact audited wording', async () => {
  const request = requestFor(sources, completion(supported), completion(caption))
  const post = await generatePost('schools', settings, request, undefined, claim)
  expect(post.factText).toBe(claim)
  expect(request.mock.calls[0][0]).toBe('https://api.exa.ai/search')
  expect(request).toHaveBeenCalledTimes(3)
})

test('supports a claim with different parts backed by different retrieved sources', async () => {
  const request = requestFor(
    {
      results: [
        {
          title: 'School archive',
          url: 'https://example.org/school',
          highlights: ['A Black community established a school in California.'],
        },
        {
          title: 'Timeline',
          url: 'https://example.org/date',
          highlights: ['The school opened in 1900.'],
        },
      ],
    },
    completion({
      findings: [
        {
          part: 'community established a school',
          status: 'supported',
          detail: 'School archive',
          sourceIndex: 0,
          quote: 'A Black community established a school in California.',
        },
        {
          part: 'in 1900',
          status: 'supported',
          detail: 'Timeline',
          sourceIndex: 1,
          quote: 'The school opened in 1900.',
        },
      ],
    }),
    completion(caption),
  )
  const post = await generatePost('schools', settings, request, undefined, claim)
  expect(post.source.citation).toContain('https://example.org/school')
  expect(post.source.citation).toContain('https://example.org/date')
})

test('mixed claims return findings and a correction without making a card', async () => {
  const candidate = claim + ' It was the first in the state.'
  const request = requestFor(
    sources,
    completion({
      findings: [
        ...supported.findings,
        {
          part: 'It was the first in the state.',
          status: 'unsupported',
          detail: 'No excerpt supports first.',
        },
      ],
    }),
    completion({fact: claim}),
    completion(caption),
  )
  await expect(
    generatePost('schools', settings, request, undefined, candidate),
  ).rejects.toMatchObject({
    code: 'SOURCE_VERIFICATION_FAILED',
    candidateClaim: candidate,
    suggestedCorrection: claim,
    preparedRewrite: expect.objectContaining({factText: claim}),
    findings: expect.arrayContaining([expect.objectContaining({status: 'unsupported'})]),
  })
  expect(request).toHaveBeenCalledTimes(4)
})

test('unsupported findings remain visible even when no correction can be produced', async () => {
  const request = requestFor(
    sources,
    completion({
      findings: [{part: claim, status: 'unsupported', detail: 'Insufficient evidence.'}],
    }),
    completion({fact: ''}),
  )
  await expect(generatePost('schools', settings, request, undefined, claim)).rejects.toMatchObject({
    code: 'SOURCE_VERIFICATION_FAILED',
    findings: [expect.objectContaining({status: 'unsupported'})],
  })
})

test('uses the original audit format with quotes in detail, without a separate quote or index requirement', async () => {
  const finding = {
    part: 'School opening date',
    status: 'supported',
    detail: `The archive says "${claim}"`,
  }
  const request = requestFor(
    sources,
    completion({verdict: 'supported', findings: [finding]}),
    completion(caption),
  )
  const post = await generatePost('schools', settings, request, undefined, claim)
  expect(post.verification?.findings[0]).toMatchObject(finding)
  const body = JSON.parse(request.mock.calls[1][1]!.body as string)
  expect(body.temperature).toBe(0.2)
  expect(body.messages[1].content).toBe(
    `Claim: ${claim}\n\nSource excerpts:\nSource: Archive (https://example.org/archive)\nExcerpt: ${claim}`,
  )
})

test('empty or malformed audits fail closed', async () => {
  for (const audit of [{findings: []}, {}, {findings: [null]}]) {
    const request = requestFor(sources, completion(audit), completion({fact: ''}))
    await expect(
      generatePost('schools', settings, request, undefined, claim),
    ).rejects.toBeInstanceOf(SourceVerificationError)
  }
})

test('longer source retries still use exact quotes', async () => {
  const request = requestFor(
    {
      results: [
        {
          title: 'Archive',
          url: 'https://example.org/archive',
          text: `Context. ${claim} More context.`,
        },
      ],
    },
    completion(supported),
    completion(caption),
  )
  await generatePost('schools', settings, request, undefined, claim, true)
  expect(JSON.parse(request.mock.calls[0][1]!.body as string)).toMatchObject({
    query: claim,
    numResults: 10,
    contents: {text: {maxCharacters: 8000}},
  })
})

test('history contradictions appear as review warnings as in the original app', async () => {
  const conflicts = [{fact: 'The school opened in 1901.', reason: 'Different opening dates.'}]
  const request = requestFor(
    sources,
    completion(supported),
    completion({conflicts}),
    completion(caption),
  )
  const post = await generatePost('schools', settings, request, undefined, claim, false, [
    'The school opened in 1901.',
  ])
  expect(post.verification?.conflicts).toEqual(conflicts)
  expect(post.factText).toBe(claim)
})

test('history wording differences can pass and produce a caption', async () => {
  const request = requestFor(
    sources,
    completion(supported),
    completion({conflicts: []}),
    completion(caption),
  )
  expect(
    (await generatePost('schools', settings, request, undefined, claim, false, [claim])).factText,
  ).toBe(claim)
})

test('editorial feedback reaches drafting and caption without changing the original audit prompt', async () => {
  const revision = {note: 'Use a shorter caption', previousFact: claim}
  const request = requestFor(
    completion({claims: [claim]}),
    sources,
    completion(supported),
    completion(caption),
  )
  await generatePost('schools', settings, request, revision)
  const draft = JSON.parse(request.mock.calls[0][1]!.body as string)
  expect(draft.messages[1].content).toContain(revision.note)
  const captionBody = JSON.parse(request.mock.calls[3][1]!.body as string)
  expect(JSON.parse(captionBody.messages[1].content).revision).toEqual(revision)
})

test('missing sources and provider errors do not substitute placeholder content', async () => {
  await expect(
    generatePost('schools', settings, requestFor({results: []}), undefined, claim),
  ).rejects.toThrow('No source evidence')
  await expect(
    generatePost('schools', settings, async () => new Response(null, {status: 429})),
  ).rejects.toThrow('429')
})

test('caption formatting failures use the verified fact and an engagement question', async () => {
  for (const malformed of [
    {...caption, cta: 'No question.'},
    {},
    {caption: 'x'.repeat(701)},
    {caption: 'x'.repeat(650), cta: 'What would you like to learn about this story?'.repeat(2)},
  ]) {
    const post = await generatePost(
      'schools',
      settings,
      requestFor(sources, completion(supported), completion(malformed)),
      undefined,
      claim,
    )
    expect(post.caption).toBe(`${claim} What would you like to learn about this story?`)
    expect(post.factText).toBe(claim)
  }
})

test('keeps relevant supported wording longer than the old 280-character limit', async () => {
  const longerClaim = claim.repeat(5)
  const post = await generatePost(
    'schools',
    settings,
    requestFor(sources, completion(supported), completion(caption)),
    undefined,
    longerClaim,
  )
  expect(post.factText).toBe(longerClaim)
})

test('retains paraphrased checkable parts from the original audit rather than filtering by substring', async () => {
  const findings = [{part: 'Founding of the school', status: 'supported', detail: claim}]
  const post = await generatePost(
    'schools',
    settings,
    requestFor(sources, completion({findings}), completion(caption)),
    undefined,
    claim,
  )
  expect(post.verification?.findings[0]).toMatchObject(findings[0])
})

test('accepts a complete caption with an embedded question and no separate cta', async () => {
  const complete = 'This community established a school. What would you like to learn?'
  const request = requestFor(sources, completion(supported), completion({caption: complete}))
  const post = await generatePost('schools', settings, request, undefined, claim)
  expect(post.caption).toBe(complete)
  expect(request).toHaveBeenCalledTimes(3)
})
test('does not duplicate a question already included in the caption', async () => {
  const complete = 'This community established a school. What would you like to learn?'
  const post = await generatePost(
    'schools',
    settings,
    requestFor(sources, completion(supported), completion({caption: complete, cta: caption.cta})),
    undefined,
    claim,
  )
  expect(post.caption).toBe(complete)
})

test('correction rechecks the original evidence without replacing it with a new search', async () => {
  const evidence = [
    {title: 'Original archive', url: 'https://example.org/archive', highlights: [claim]},
  ]
  const request = requestFor(completion(supported), completion(caption))
  const post = await generatePost(
    'schools',
    settings,
    request,
    undefined,
    claim,
    false,
    [],
    evidence,
  )
  expect(request).toHaveBeenCalledTimes(2)
  expect(request.mock.calls.every(([url]) => String(url).includes('api.openai.com'))).toBe(true)
  expect(post.source.citation).toContain('Original archive')
  expect(post.verification?.sources).toEqual(evidence)
})

test('broader searches retain earlier evidence even if it is absent from the new results', async () => {
  const previous = [
    {title: 'Original archive', url: 'https://example.org/archive', highlights: [claim]},
  ]
  const request = requestFor(
    {results: [{title: 'New source', url: 'https://example.org/new', text: 'Other context.'}]},
    completion({findings: [{...supported.findings[0], sourceIndex: 1}]}),
    completion(caption),
  )
  const post = await generatePost(
    'schools',
    settings,
    request,
    undefined,
    claim,
    true,
    [],
    previous,
  )
  expect(post.verification?.sources).toHaveLength(2)
  expect(post.source.citation).toContain('Original archive')
})

test('longer text from the same source augments rather than replaces its earlier highlights', async () => {
  const previous = [{title: 'Archive', url: 'https://example.org/archive', highlights: [claim]}]
  const request = requestFor(
    {results: [{title: 'Archive', url: previous[0].url, text: 'Different section of the page.'}]},
    completion(supported),
    completion(caption),
  )
  const post = await generatePost(
    'schools',
    settings,
    request,
    undefined,
    claim,
    true,
    [],
    previous,
  )
  expect(post.verification?.sources[0].highlights).toEqual([
    claim,
    'Different section of the page.',
  ])
})

test('failed audits carry the exact source excerpts used to suggest the revision', async () => {
  const candidate = claim + ' It was the first in the state.'
  const request = requestFor(
    sources,
    completion({
      findings: [
        ...supported.findings,
        {part: 'It was the first in the state.', status: 'unsupported', detail: 'No evidence.'},
      ],
    }),
    completion({fact: claim}),
  )
  await expect(
    generatePost('schools', settings, request, undefined, candidate),
  ).rejects.toMatchObject({
    sources: sources.results.map(({title, url, highlights}) => ({title, url, highlights})),
    suggestedCorrection: claim,
  })
})

test('retains the linked source list and publication dates', async () => {
  const publishedDate = '2020-01-01'
  const post = await generatePost(
    'schools',
    settings,
    requestFor(
      {results: [{...sources.results[0], publishedDate}]},
      completion(supported),
      completion(caption),
    ),
    undefined,
    claim,
  )
  expect(post.verification?.sources[0]).toEqual({...sources.results[0], publishedDate})
})

test('suggested correction uses original findings without a new search or audit and preserves the original audit', async () => {
  const candidate = claim + ' It was the first in the state.'
  const findings = [
    ...supported.findings,
    {
      part: 'First in the state',
      status: 'contradicted',
      detail: 'An earlier school opened in 1880.',
    },
  ]
  const request = requestFor(
    sources,
    completion({verdict: 'contradicted', findings}),
    completion({fact: claim}),
    completion(caption),
  )
  try {
    await generatePost('schools', settings, request, undefined, candidate)
    throw new Error('Expected correction')
  } catch (error) {
    expect(error).toBeInstanceOf(SourceVerificationError)
    const correction = (error as SourceVerificationError).preparedRewrite!
    expect(correction.factText).toBe(claim)
    expect(correction.verification?.originalClaim).toBe(candidate)
    expect(correction.verification?.corrected).toBe(true)
    expect(correction.verification?.findings).toEqual(findings)
  }
  expect(request).toHaveBeenCalledTimes(4)
  const fix = JSON.parse(request.mock.calls[2][1]!.body as string)
  expect(fix.temperature).toBe(0.3)
  expect(fix.messages[0].content).toContain(
    'Keep supported parts as close to the original wording as possible.',
  )
  expect(fix.messages[1].content).toBe(
    `Claim: ${candidate}\n\nFindings:\n${JSON.stringify(findings, null, 2)}`,
  )
})
