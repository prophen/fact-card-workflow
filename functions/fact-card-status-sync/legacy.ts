import type {SanityClient} from '@sanity/client'
import {extractDocumentId, refDataset, type Engine} from '@sanity/workflow-engine'

/** Start the current definition while retaining the old instance and its complete audit history. */
export async function restartLegacyRejection(client: SanityClient, engine: Engine, instanceId: string) {
  const instance = await client.getDocument<{
    currentStage: string; definitionSnapshot: string;
    fields: {name: string; _type: string; value: unknown}[];
  }>(instanceId)
  if (!instance || instance.currentStage !== 'generating' || instance.definitionSnapshot.includes('regenerate-post')) return
  const subject = instance.fields.find((field) => field.name === 'subject')
  const note = instance.fields.find((field) => field.name === 'revisionNote')
  if (!subject || typeof note?.value !== 'string' || !note.value) return
  const subjectValue = subject.value as {id?: string} | undefined
  if (typeof subjectValue?.id !== 'string') throw new Error('Older workflow has no usable post reference.')
  await engine.abortInstance({instanceId, reason: 'Continuing rejected card in the automatic regeneration workflow'})
  const started = await engine.startInstance({
    definition: 'post-workflow', perspective: 'drafts',
    initialFields: [
      {type: 'subject', name: 'subject', value: refDataset({
        projectId: 'ta2gi825', dataset: 'production',
        documentId: extractDocumentId(subjectValue.id).replace(/^drafts\./, ''), type: 'post',
      })},
      {type: 'string', name: 'revisionNote', value: note.value},
    ],
  })
  return started.instance._id
}
