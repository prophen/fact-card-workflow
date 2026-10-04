import {useRef, useState} from 'react'
import type {Finding} from '../../shared/generate-post'
import {GeneratorPage} from './GeneratePostStyles'
import {useClient} from 'sanity'
import {IntentLink} from 'sanity/router'
import {refDataset} from '@sanity/workflow-engine'
import {defaultCoreTopics} from '../../shared/core-topics'
import {createPostEngineFromClient} from '../workflows/runtime'

type GeneratedPost = {
  factText: string
  caption: string
  source: {citation: string; url: string}
  verification?: {originalClaim: string; findings: Finding[]}
  cardPng: string
}
const template = 'defaultFactCard'
const apiUrl = `${(process.env.SANITY_STUDIO_GENERATION_API_URL || 'http://localhost:3000').replace(/\/$/, '')}/api/post-generation`

export function GeneratePostTool() {
  const client = useClient({apiVersion: '2026-10-03'}).withConfig({
    useCdn: false,
    perspective: 'raw',
  })
  const [topic, setTopic] = useState('')
  const [coreTopics, setCoreTopics] = useState(defaultCoreTopics)
  const [ideas, setIdeas] = useState<string[]>([])
  const [ideasBusy, setIdeasBusy] = useState(false)
  const [ideasError, setIdeasError] = useState('')
  const [selectedClaim, setSelectedClaim] = useState<string | undefined>()
  const [result, setResult] = useState<GeneratedPost | null>(null)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [findings, setFindings] = useState<Finding[]>([])
  const [sourceContext, setSourceContext] = useState<string | undefined>()
  const [correction, setCorrection] = useState<string | null>(null)
  const [retryClaim, setRetryClaim] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const draftId = useRef<string | null>(null)
  const instanceId = useRef<string | null>(null)
  const assetId = useRef<string | null>(null)

  async function save(post: GeneratedPost) {
    setBusy(true)
    setError('')
    try {
      setProgress('Creating the draft and workflow…')
      if (!draftId.current) {
        const draft = await client.create({
          _id: `drafts.${crypto.randomUUID()}`,
          _type: 'post',
          topic,
          factText: post.factText,
          source: {_type: 'source', ...post.source},
          caption: post.caption,
          renderTemplate: template,
          status: 'generating',
        })
        draftId.current = draft._id
      }
      const engine = createPostEngineFromClient(client)
      if (!instanceId.current) {
        const started = await engine.startInstance({
          definition: 'post-workflow',
          perspective: 'drafts',
          initialFields: [
            {
              type: 'subject',
              name: 'subject',
              value: refDataset({
                projectId: 'ta2gi825',
                dataset: 'production',
                documentId: draftId.current.replace(/^drafts\./, ''),
                type: 'post',
              }),
            },
          ],
        })
        instanceId.current = started.instance._id
      }
      setProgress('Uploading the rendered card PNG…')
      if (!assetId.current) {
        const png = new Blob([Uint8Array.from(atob(post.cardPng), (c) => c.charCodeAt(0))], {
          type: 'image/png',
        })
        const asset = await client.assets.upload('image', png, {
          filename: 'cbs-fact-card.png',
          contentType: 'image/png',
        })
        assetId.current = asset._id
      }
      await client
        .patch(draftId.current)
        .set({image: {_type: 'image', asset: {_type: 'reference', _ref: assetId.current}}})
        .commit()
      setProgress('Submitting the completed card for your review…')
      await engine.fireAction({
        instanceId: instanceId.current,
        activity: 'generate',
        action: 'submit',
        idempotencyKey: `generation-submit-${instanceId.current}`,
      })
      setSubmitted(true)
      setProgress('Ready for review. Open the post to approve or reject it.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Saving the generated post failed.')
      setProgress('')
    } finally {
      setBusy(false)
    }
  }

  async function suggestIdeas() {
    setIdeasBusy(true)
    setIdeasError('')
    try {
      const token = client.config().token
      if (!token) throw new Error('Sign in to Studio to generate topic ideas.')
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`},
        body: JSON.stringify({mode: 'ideas', topic: coreTopics}),
        signal: AbortSignal.timeout(90000),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not generate topic ideas.')
      if (
        !Array.isArray(data.claims) ||
        !data.claims.length ||
        data.claims.some((claim: unknown) => typeof claim !== 'string')
      )
        throw new Error('No usable topic ideas were returned.')
      setIdeas(data.claims)
    } catch (cause) {
      setIdeasError(
        cause instanceof Error ? cause.message : 'Could not reach the generation server.',
      )
    } finally {
      setIdeasBusy(false)
    }
  }

  async function generate(retrySources = false, correctedClaim?: string) {
    const candidateClaim =
      correctedClaim || (retrySources ? retryClaim || undefined : selectedClaim)
    setRetryClaim(null)
    setFindings([])
    setCorrection(null)
    setBusy(true)
    setError('')
    setSubmitted(false)
    setResult(null)
    draftId.current = null
    instanceId.current = null
    assetId.current = null
    setProgress(
      retrySources
        ? 'Adding more sources while keeping the earlier evidence…'
        : 'Finding sources, auditing each part of the claim, and preparing the caption…',
    )
    try {
      const token = client.config().token
      if (!token)
        throw new Error('Sign in to Studio with a token-backed Sanity session to generate posts.')
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`},
        body: JSON.stringify({
          topic,
          candidateClaim,
          retrySources,
          sourceContext: candidateClaim ? sourceContext : undefined,
        }),
        signal: AbortSignal.timeout(180000),
      })
      const data = await response.json()
      if (!response.ok) {
        if (response.status === 400) setSourceContext(undefined)
        if (data.code === 'SOURCE_VERIFICATION_FAILED' && typeof data.candidateClaim === 'string') {
          setRetryClaim(data.candidateClaim)
          setSourceContext(typeof data.sourceContext === 'string' ? data.sourceContext : undefined)
          setFindings(Array.isArray(data.findings) ? data.findings : [])
          setCorrection(
            typeof data.suggestedCorrection === 'string' ? data.suggestedCorrection : null,
          )
        }
        throw new Error(data.error || 'Generation failed.')
      }
      if (
        typeof data.cardPng !== 'string' ||
        typeof data.factText !== 'string' ||
        typeof data.caption !== 'string' ||
        typeof data.source?.citation !== 'string' ||
        typeof data.source?.url !== 'string'
      )
        throw new Error('The generator returned incomplete content.')
      setResult(data)
      await save(data)
    } catch (cause) {
      if (retrySources && candidateClaim) setRetryClaim(candidateClaim)
      setError(cause instanceof Error ? cause.message : 'Could not reach the generation server.')
      setProgress('')
      setBusy(false)
    }
  }

  return (
    <GeneratorPage>
      <header className="page-header">
        <span className="eyebrow">California Black Stories · Create</span>
        <h1>
          Find a story.
          <br />
          Make it worth sharing.
        </h1>
        <p>Choose one fact, check the evidence, and create a card for your review.</p>
        <div className="workflow-strip" aria-label="Post workflow">
          <span className="active">Generate</span>
          <span>Review</span>
          <span>Approve</span>
          <span>Publish</span>
        </div>
      </header>
      <div className="steps">
        <section className="step-panel" aria-labelledby="topic-ideas-heading">
          <span className="eyebrow">Step 01 · Explore</span>
          <h2 id="topic-ideas-heading">Find a story idea</h2>
          <p>
            Start with broad categories and get five specific ideas. Ideas still need source
            checking.
          </p>
          <label htmlFor="core-topics">Core topics (comma separated)</label>
          <textarea
            id="core-topics"
            rows={3}
            maxLength={500}
            value={coreTopics}
            onChange={(event) => setCoreTopics(event.target.value)}
            disabled={busy || ideasBusy || Boolean(result && !submitted)}
          />
          <button
            type="button"
            onClick={() => void suggestIdeas()}
            disabled={busy || ideasBusy || !coreTopics.trim() || Boolean(result && !submitted)}
          >
            {ideasBusy ? 'Finding ideas…' : 'Suggest five ideas'}
          </button>
          <p role="status" aria-live="polite">
            {ideasBusy ? 'Generating unverified claim ideas…' : ''}
          </p>
          {ideasError && (
            <p className="error-panel" role="alert">
              {' '}
              {ideasError}
            </p>
          )}
          {ideas.length > 0 && (
            <ul className="ideas-list">
              {ideas.map((claim) => (
                <li key={claim} data-selected={selectedClaim === claim}>
                  <p>{claim}</p>
                  <button
                    type="button"
                    disabled={busy || ideasBusy || Boolean(result && !submitted)}
                    onClick={() => {
                      setRetryClaim(null)
                      setFindings([])
                      setSourceContext(undefined)
                      setCorrection(null)
                      setTopic(claim)
                      setSelectedClaim(claim)
                      setError('')
                      setProgress(
                        'Idea selected. Generate the post to check its source and render the card.',
                      )
                    }}
                    aria-pressed={selectedClaim === claim}
                  >
                    {selectedClaim === claim ? 'Selected' : 'Use this idea'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="step-panel" aria-labelledby="generate-heading">
          <span className="eyebrow">Step 02 · Create</span>
          <h2 id="generate-heading">Verify & generate</h2>
          <p>
            Use an idea from the list, or enter a topic of your own. Only a supported fact moves to
            review.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void generate()
            }}
          >
            <label htmlFor="generation-topic">
              {selectedClaim !== undefined ? 'Claim to verify' : 'Topic or core topics'}
            </label>
            <textarea
              id="generation-topic"
              rows={3}
              maxLength={selectedClaim !== undefined ? 400 : 500}
              value={topic}
              onChange={(event) => {
                setRetryClaim(null)
                setFindings([])
                setSourceContext(undefined)
                setCorrection(null)
                setError('')
                setTopic(event.target.value)
                setSelectedClaim(selectedClaim !== undefined ? event.target.value : undefined)
              }}
              disabled={busy || ideasBusy || Boolean(result && !submitted)}
              placeholder="For example: Black communities in Oakland"
              required
            />
            <button
              type="submit"
              disabled={busy || ideasBusy || !topic.trim() || Boolean(result && !submitted)}
            >
              Generate post
            </button>
          </form>
        </section>
      </div>
      <p className="progress" role="status" aria-live="polite">
        {progress}
      </p>
      {error && (
        <div className="error-panel" role="alert">
          <p>{error}</p>
          {findings.length > 0 && (
            <ul className="audit-list">
              {findings.map((finding) => (
                <li key={`${finding.part}-${finding.status}-${finding.quote || finding.detail}`}>
                  <strong>
                    {finding.status}: {finding.part}
                  </strong>
                  <p>{finding.detail}</p>
                  {finding.quote && <blockquote>{finding.quote}</blockquote>}
                </li>
              ))}
            </ul>
          )}
          {correction !== null && !result && (
            <div className="correction-panel">
              <label htmlFor="corrected-claim">Suggested correction · edit before checking</label>
              <textarea
                id="corrected-claim"
                rows={3}
                maxLength={280}
                value={correction}
                onChange={(event) => setCorrection(event.target.value)}
                disabled={busy || ideasBusy}
              />
              <button
                disabled={busy || ideasBusy || !correction?.trim()}
                onClick={() => {
                  const revised = correction?.trim()
                  if (!revised) return
                  setTopic(revised)
                  setSelectedClaim(revised)
                  void generate(false, revised)
                }}
              >
                Apply correction & recheck
              </button>
              <p>
                The revision is checked against the same source excerpts before a card is created.
              </p>
            </div>
          )}
          {retryClaim && !result && (
            <div>
              <p>
                <strong>Claim to recheck:</strong> {retryClaim}
              </p>
              <button disabled={busy || ideasBusy} onClick={() => void generate(true)}>
                Retry source checking
              </button>
              <p>
                This adds sources to the earlier evidence. The claim still needs support and your
                approval.
              </p>
            </div>
          )}
          {result && !submitted && (
            <button disabled={busy} onClick={() => void save(result)}>
              Retry saving this card
            </button>
          )}
        </div>
      )}
      {draftId.current && (
        <p>
          <IntentLink
            intent="edit"
            params={{id: draftId.current.replace(/^drafts\./, ''), type: 'post'}}
          >
            Open post in Studio
          </IntentLink>
        </p>
      )}
      {result && (
        <div className="result-panel">
          <div className="card-preview">
            <img
              src={`data:image/png;base64,${result.cardPng}`}
              alt={result.factText}
              width={540}
              height={540}
            />
            <p>Template-rendered PNG · 1080 × 1080</p>
          </div>
          <div className="result-copy">
            <span className="eyebrow">Verified · Ready for your review</span>
            {result.verification && (
              <details>
                <summary>View claim audit</summary>
                <ul className="audit-list">
                  {result.verification.findings.map((finding) => (
                    <li
                      key={`${finding.part}-${finding.status}-${finding.quote || finding.detail}`}
                    >
                      <strong>{finding.part}</strong>
                      <p>{finding.detail}</p>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <h2>Facebook caption</h2>
            <p>{result.caption}</p>
            <h2>Source</h2>
            <p>{result.source.citation}</p>
            <a href={result.source.url} target="_blank" rel="noreferrer">
              Read the source
            </a>
          </div>
        </div>
      )}
    </GeneratorPage>
  )
}
