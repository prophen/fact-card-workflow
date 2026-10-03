# California Black history fact-card demo

The `post` document contains one fact, its verified source, a Facebook caption,
the CBS Post Generator template ID, and an uploaded template-rendered PNG.
The workflow is `generating → inReview → approved → published`. Rejecting a card
returns it to generating with a revision note and queues automatic regeneration. Every card requires human approval.

The workflow applies to `post`. There are no array fields in this schema, so
`defineArrayMember` is not needed.

## Deploy and start

From `studio`, run `npm run typegen`, `npx sanity schemas deploy`, and
`npm run workflows:deploy`. The workflow uses the existing `ta2gi825.production`
dataset and the `production` tag. All Workflows packages are pinned to 0.36.0;
the deployment acknowledges reader model 10. Upgrade any other runtime sharing
this dataset before deployment.

Start Studio with `npm run dev`. New posts created in Studio automatically start
the deployed workflow. Existing posts can start it from the Workflows view.
Agent-created posts must explicitly call `engine.startInstance` with a `subject`
reference; Studio auto-start does not apply to API writes.

## Agent and review integration

`createPostEngine(token)` in `runtime.ts` provides the server-side engine and
the status-sync effect handler. Keep tokens out of Studio/browser code.
Use the official engine's `refDataset` helper for the `post` subject.

The generation agent writes `factText`, `source`, `caption`, and `renderTemplate`,
renders a PNG with the shared CBS template renderer, uploads that PNG with the Sanity
assets API, and writes its asset reference to `image`. It then calls:

```ts
await engine.fireAction({instanceId, activity: 'generate', action: 'submit'})
```

Submission requires the completed fields. Use a contributor token for an external
agent. Studio's Generate post tool now supplies generation, Exa evidence checking,
caption creation, and template rendering through the web app's server endpoint.
See the root README for provider configuration. No AI image generator is used.

In Studio, a person clicks Approve or Reject. Reject requires feedback. Approval
records the acting person. Review actions require the administrator or editor project role. Keep the agent
token at contributor access so it cannot approve. To restrict approval exclusively
to the page owner, pin their account-global user ID in the action filters.

After approval, click Sanity Studio’s **Publish** button. The button checks the
current workflow approval, while retaining Sanity’s normal validation and permissions.
The deployed Function detects the published `post` and fires `publish/mark-published`
on the same workflow automatically. Duplicate events are safe. No extra workflow
click is needed. This publishes to Sanity, not Facebook. `published` has no
activities or outgoing transitions. Scheduled publishing is hidden for this demo
so it cannot bypass the approval check. Direct API writes remain subject to the
project’s Content Lake permissions.

The engine stage is authoritative. `status` is a mirror updated by the
`sync-*-status` effects. The deployed `fact-card-status-sync` Sanity Function drains
new effects automatically after workflow actions, including Studio review actions.
There is no need to run the manual drainer after normal transitions. Keep
`npm run workflows:drain` with the server-only `SANITY_AUTH_TOKEN` for backlog or
interrupted-job recovery. Runtime configuration and deployment commands live at
the repository root; see `../../README.md`.
The helper reads the current stage so queued old updates do not intentionally
restore an earlier status; concurrent raw content edits still require normal
production coordination.

## Submission write-up

This demo showcases an agent-to-editor workflow and a mandatory human approval
gate for California Black history fact cards. Production uses Buffer to publish
approved posts to Facebook and Instagram; Buffer is outside the demo. Reels are
outside scope. Cards are rendered from templates, not generated as AI artwork.

## Verify

`npm test` exercises the real engine in memory: approval, rejection/resubmission,
agent approval denial, missing assets/content, premature publication, and terminal
behavior. `npm run build` checks the Studio bundle. The workflow gate coordinates
cooperative clients; raw Content Lake write permissions remain the enforcement
boundary, as documented by Sanity.

References: [AI pipeline cookbook](https://www.sanity.io/docs/workflows/cookbook-ai-content-pipeline),
[Studio plugin](https://www.sanity.io/docs/workflows/studio-plugin),
[actors and enforcement](https://www.sanity.io/docs/workflows/actors-and-enforcement).
