import {useEffect, useMemo, useState} from 'react'
import {useClient, type DocumentActionComponent} from 'sanity'
import {getPublishApproval, publicationQuery} from '../workflows/publication'

/** Preserve Sanity's validation, permissions, dialogs, and publish operation. */
export function withWorkflowApproval(
  PublishAction: DocumentActionComponent,
): DocumentActionComponent {
  const WorkflowPublishAction: DocumentActionComponent = (props) => {
    const original = PublishAction(props)
    const sourceClient = useClient({apiVersion: '2026-10-03'})
    const client = useMemo(
      () => sourceClient.withConfig({useCdn: false, perspective: 'raw'}),
      [sourceClient],
    )
    const [approved, setApproved] = useState(false)
    const [checking, setChecking] = useState(false)
    const [error, setError] = useState('')
    useEffect(() => {
      let active = true
      async function refresh() {
        try {
          const instance = await getPublishApproval(client, props.id)
          if (active) setApproved(Boolean(instance))
        } catch {
          if (active) setApproved(false)
        }
      }
      void refresh()
      const {query, params} = publicationQuery(props.id)
      const subscription = client
        .listen(query, params, {includeResult: false, visibility: 'query'})
        .subscribe({
          next: () => {
            void refresh()
          },
          error: () => {
            if (active) setApproved(false)
          },
        })
      return () => {
        active = false
        subscription.unsubscribe()
      }
    }, [client, props.id])
    if (!original) return null
    return {
      ...original,
      disabled: original.disabled || !approved || checking,
      title:
        error ||
        (!approved ? 'Approve this post in its Workflow tab before publishing.' : original.title),
      label: checking ? 'Checking approval…' : original.label,
      onHandle: async () => {
        setChecking(true)
        setError('')
        try {
          if (!(await getPublishApproval(client, props.id))) {
            setApproved(false)
            setError('This post needs workflow approval before publishing.')
            return
          }
          original.onHandle?.()
        } catch {
          setError('Could not check workflow approval. Try again.')
        } finally {
          setChecking(false)
        }
      },
    }
  }
  WorkflowPublishAction.action = 'publish'
  WorkflowPublishAction.displayName = 'WorkflowPublishAction'
  return WorkflowPublishAction
}
