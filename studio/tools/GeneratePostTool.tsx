import {useRef, useState} from 'react'
import {useClient} from 'sanity'
import {IntentLink} from 'sanity/router'
import {refDataset} from '@sanity/workflow-engine'
import {createPostEngineFromClient} from '../workflows/runtime'

type GeneratedPost = {factText: string; caption: string; source: {citation: string; url: string}; cardPng: string}
const template = 'defaultFactCard'
const apiUrl = `${(process.env.SANITY_STUDIO_GENERATION_API_URL || 'http://localhost:3000').replace(/\/$/, '')}/api/post-generation`

export function GeneratePostTool() {
  const client = useClient({apiVersion: '2026-10-03'}).withConfig({
    useCdn: false,
    perspective: 'raw',
  })
  const [topic, setTopic] = useState('')
  const [result, setResult] = useState<GeneratedPost | null>(null)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
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
        const png = new Blob([Uint8Array.from(atob(post.cardPng), (c) => c.charCodeAt(0))], {type: 'image/png'})
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

  async function generate() {
    setBusy(true)
    setError('')
    setSubmitted(false)
    setResult(null)
    draftId.current = null
    instanceId.current = null
    assetId.current = null
    setProgress('Generating one fact and checking it against Exa source excerpts…')
    try {
      const token = client.config().token
      if (!token)
        throw new Error('Sign in to Studio with a token-backed Sanity session to generate posts.')
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`},
        body: JSON.stringify({topic}),
        signal: AbortSignal.timeout(180000),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Generation failed.')
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
      setError(cause instanceof Error ? cause.message : 'Could not reach the generation server.')
      setProgress('')
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        padding: 32,
        maxWidth: 1200,
        margin: '0 auto',
        overflow: 'auto',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      <h1>Generate a fact card</h1>
      <p>
        Choose a California Black history topic. We’ll generate one fact, check its source, render a
        card, and bring it to you for review.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void generate()
        }}
        style={{display: 'grid', gap: 12, maxWidth: 680}}
      >
        <label htmlFor="generation-topic">Topic or core topics</label>
        <textarea
          id="generation-topic"
          rows={3}
          maxLength={500}
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          disabled={busy || Boolean(result && !submitted)}
          placeholder="For example: Black communities in Oakland"
          required
          style={{padding: 12, font: 'inherit'}}
        />
        <button
          type="submit"
          disabled={busy || !topic.trim() || Boolean(result && !submitted)}
          style={{padding: 12, font: 'inherit', cursor: 'pointer'}}
        >
          Generate post
        </button>
      </form>
      <p role="status" aria-live="polite">
        {progress}
      </p>
      {error && (
        <div role="alert">
          <p>{error}</p>
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
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 32, marginTop: 24}}>
          <div style={{maxWidth: '100%', overflow: 'auto'}}>
            <img
              src={`data:image/png;base64,${result.cardPng}`}
              alt={result.factText}
              width={540}
              height={540}
              style={{maxWidth: '100%', height: 'auto'}}
            />
            <p>Template-rendered PNG · 1080 × 1080</p>
          </div>
          <div style={{maxWidth: 420}}>
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
    </div>
  )
}
