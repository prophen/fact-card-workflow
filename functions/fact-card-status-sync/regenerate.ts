import type {SanityClient} from '@sanity/client'
import {extractDocumentId, type EffectHandler} from '@sanity/workflow-engine'
import {generatePost} from '../../shared/generate-post'
import {renderCard, cardTemplate} from '../../shared/render-card'

type Post = {
  _id: string; _rev: string; _type: string; topic?: string; factText?: string;
  renderTemplate?: string; regenerationKey?: string;
}

export function regenerationHandler(client: SanityClient): EffectHandler {
  return async (params, ctx) => {
    if (typeof params.subject !== 'string' || typeof params.revisionNote !== 'string')
      throw new Error('Replacement generation needs a post and editorial feedback.')
    const id = extractDocumentId(params.subject).replace(/^drafts\./, '')
    const draftId = `drafts.${id}`
    const isCurrent = () => client.fetch<boolean>(
      '*[_id == $id][0].currentStage == "generating" && count(*[_id == $id][0].pendingEffects[_key == $key]) == 1',
      {id: ctx.instanceId, key: ctx.effectKey}, {perspective: 'raw'},
    )
    if (!(await isCurrent())) throw new Error('Replacement generation is no longer current.')
    let post = await client.getDocument<Post>(draftId)
    if (!post) {
      const published = await client.getDocument<Post>(id)
      if (!published) throw new Error('The post no longer exists.')
      const {_rev, ...content} = published
      void _rev
      post = await client.createIfNotExists({...content, _id: draftId}) as Post
    }
    // A replay after writing the complete card resumes workflow completion without paying again.
    if (post.regenerationKey === ctx.effectKey) return
    try {
      const openaiKey = process.env.OPENAI_API_KEY
      const exaKey = process.env.EXA_API_KEY
      if (!openaiKey || !exaKey) throw new Error('The background Function needs its OpenAI and Exa keys configured.')
      if (!post.topic) throw new Error('Add a topic to this post before retrying generation.')
      await client.patch(draftId).set({status: 'generating'}).unset(['generationError']).commit()
      post = (await client.getDocument<Post>(draftId))!
      const generated = await generatePost(post.topic!, {
        openaiKey, exaKey, model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      }, fetch, {note: params.revisionNote, previousFact: post.factText || ''})
      if (generated.factText.trim() === post.factText?.trim())
        throw new Error('The replacement repeated the original fact. Try again with more specific feedback.')
      const png = await renderCard(generated.factText, post.renderTemplate || cardTemplate)
      if (!(await isCurrent())) throw new Error('The workflow changed while generating the replacement.')
      const asset = await client.assets.upload('image', png, {
        filename: 'cbs-fact-card.png', contentType: 'image/png',
      })
      // Do not overwrite edits made by a reviewer while the providers were running.
      await client.patch(draftId).ifRevisionId(post._rev).set({
        ...generated, source: {_type: 'source', ...generated.source},
        renderTemplate: post.renderTemplate || cardTemplate,
        image: {_type: 'image', asset: {_type: 'reference', _ref: asset._id}},
        regenerationKey: ctx.effectKey,
      }).unset(['generationError']).commit()
    } catch (error) {
      if (await isCurrent()) {
        await client.patch(draftId).set({
          generationError: error instanceof Error ? error.message : 'Replacement generation failed.',
        }).commit()
      }
      throw error
    }
  }
}
