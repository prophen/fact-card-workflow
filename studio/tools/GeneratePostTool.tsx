import {plainSourceText} from '../../shared/citation'
import {useRef, useState} from 'react'
import type {Finding, Evidence} from '../../shared/generate-post'
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
  verification?: {
    originalClaim: string
    findings: Finding[]
    sources: Evidence[]
    conflicts?: {fact: string; reason: string}[]
    corrected?: boolean
  }
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
  const [conflicts, setConflicts] = useState<{fact: string; reason: string}[]>([])
  const [sources, setSources] = useState<Evidence[]>([])
  const [readyClaim, setReadyClaim] = useState<string | null>(null)
  const [findings, setFindings] = useState<Finding[]>([])
  const [preparedClaim, setPreparedClaim] = useState<string | null>(null)
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

  async function generate(retrySources = false, correctedClaim?: string, acceptRewrite = false) {
    const candidateClaim =
      correctedClaim || (retrySources ? retryClaim || undefined : selectedClaim)
    setRetryClaim(null)
    setReadyClaim(null)
    if (!acceptRewrite) setFindings([])
    setCorrection(null)
    setBusy(true)
    setError('')
    setSubmitted(false)
    setResult(null)
    draftId.current = null
    instanceId.current = null
    assetId.current = null
    setProgress(
      acceptRewrite
        ? 'Creating a card from the selected fact…'
        : retrySources
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
          mode: acceptRewrite ? 'post' : 'verify',
          topic,
          candidateClaim,
          retrySources,
          acceptRewrite,
          sourceContext: candidateClaim ? sourceContext : undefined,
        }),
        signal: AbortSignal.timeout(240000),
      })
      const data = await response.json()
      if (!response.ok) {
        if (response.status === 400) setSourceContext(undefined)
        if (data.code === 'SOURCE_VERIFICATION_FAILED' && typeof data.candidateClaim === 'string') {
          setSources(Array.isArray(data.sources) ? data.sources : [])
          setPreparedClaim(data.rewriteReady ? data.suggestedCorrection : null)
          setRetryClaim(data.candidateClaim)
          setSourceContext(typeof data.sourceContext === 'string' ? data.sourceContext : undefined)
          setFindings(Array.isArray(data.findings) ? data.findings : [])
          setCorrection(
            typeof data.suggestedCorrection === 'string' ? data.suggestedCorrection : null,
          )
        }
        throw new Error(data.error || 'Generation failed.')
      }
      if (!acceptRewrite) {
        setConflicts(data.verification?.conflicts || [])
        setSources(data.verification?.sources || [])
        setFindings(data.verification?.findings || [])
        setSourceContext(data.sourceContext)
        setReadyClaim(data.factText)
        setProgress('The sources back the claim. Create the card when you are ready.')
        setBusy(false)
        return
      }
      if (
        typeof data.cardPng !== 'string' ||
        typeof data.factText !== 'string' ||
        typeof data.caption !== 'string' ||
        typeof data.source?.citation !== 'string' ||
        typeof data.source?.url !== 'string'
      )
        throw new Error('The generator returned incomplete content.')
      setSources(data.verification?.sources || [])
      setFindings(data.verification?.findings || [])
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
                      setSources([])
                      setReadyClaim(null)
                      setConflicts([])
                      setRetryClaim(null)
                      setFindings([])
                      setSourceContext(undefined)
                      setCorrection(null)
                      setTopic(claim)
                      setSelectedClaim(claim)
                      setError('')
                      setProgress('Idea selected. Verify with Exa to see its audit and sources.')
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
            Use an idea from the list, or enter a topic of your own. Review the findings and
            sources, then apply a correction if needed.
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
                setSources([])
                setConflicts([])
                setReadyClaim(null)
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
              Verify with Exa
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
          {correction !== null && !result && (
            <div className="correction-panel">
              <label htmlFor="corrected-claim">Suggested correction</label>
              <textarea
                id="corrected-claim"
                rows={3}
                maxLength={400}
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
                  if (preparedClaim === revised) {
                    setReadyClaim(revised)
                    setCorrection(null)
                    setError('')
                    setProgress(
                      'Correction applied using the existing findings. Ready to create the card.',
                    )
                  } else void generate(false, revised)
                }}
              >
                {preparedClaim === correction?.trim()
                  ? 'Apply suggested correction'
                  : 'Verify edited correction'}
              </button>
              <p>
                {preparedClaim === correction?.trim()
                  ? 'This correction uses the existing findings and preserves supported parts. Applying it does not run another search or audit.'
                  : 'An edited correction will be checked against the saved sources.'}
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
      {conflicts.length > 0 && (
        <section className="step-panel">
          <h2>Possible conflicts with earlier posts</h2>
          <ul>
            {conflicts.map((conflict, index) => (
              <li key={index}>
                <strong>{conflict.fact}</strong>
                <p>{conflict.reason}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {findings.length > 0 && (
        <section className="step-panel" aria-label="Claim audit">
          <h2>Claim audit</h2>
          <p>
            {findings.some((f) => f.status === 'contradicted')
              ? 'Sources contradict part of the original claim.'
              : findings.some((f) => f.status === 'unsupported')
                ? 'Some parts of the original claim lack source support.'
                : 'The sources back the claim.'}
          </p>
          <ul className="audit-list">
            {findings.map((finding, index) => (
              <li key={index}>
                <span className={`claim-status ${finding.status}`}>{finding.status}</span>
                <strong>{finding.part}</strong>
                <p>{finding.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {sources.length > 0 && (
        <section className="step-panel" aria-label="Exa sources">
          <h2>Exa sources</h2>
          <ul className="sources-list">
            {sources.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.title}
                </a>
                {source.publishedDate && <small> · {source.publishedDate.slice(0, 10)}</small>}
                <p>{plainSourceText(source.highlights[0] || '').slice(0, 280)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {readyClaim && !result && (
        <section className="step-panel">
          <h2>Fact for the card</h2>
          <p>{readyClaim}</p>
          <button
            disabled={busy || ideasBusy}
            onClick={() => void generate(false, readyClaim, true)}
          >
            Create card & submit for review
          </button>
        </section>
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
            <span className="eyebrow">Ready for your review</span>
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
