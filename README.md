# Fact Card Workflow

One Git repository contains both apps and the automatic workflow runtime:

- `studio/`: Sanity Studio, post schema, and editorial workflow.
- `web/`: Next.js app.
- `functions/`: automatic workflow status synchronization and rejected-card regeneration.
- `shared/`: generation and template rendering used by the web app and Functions.
- `sanity.blueprint.ts`: Sanity Function and service-token deployment.

Commit and push from this repository root. The app folders are ordinary folders,
not separate repositories or submodules. Their earlier Git histories are preserved
in the ignored `.git-backups/` directory.

## Install and run

Run `npm install` at the root, `npm install --prefix studio`, and
`npm install --prefix web`. Run `npm run studio:dev` and `npm run web:dev` in
separate terminals.

## Automatic status synchronization

The deployed `fact-card-status-sync` Sanity Function processes status effects
when a workflow queues new work. It updates the draft post's status to match its
current workflow stage. It does not approve cards or publish to social platforms.

From the root, use `npm run runtime:plan`, `npm run runtime:deploy`, and
`npm run runtime:info` to inspect or deploy the runtime. The existing Sanity stack
is `ST-bfxdcjm3x8` in project `ta2gi825`. On a new checkout, connect it once with:

```sh
studio/node_modules/.bin/sanity blueprints init . --project-id ta2gi825 --stack-id ST-bfxdcjm3x8
```

The event filter responds when new unclaimed effect keys are queued, including
status updates queued by generation completion. Claims and ordinary content edits
do not enqueue another generation. Previously queued
jobs do not produce a new event just because the Function is deployed; the manual
`studio` command `npm run workflows:drain` remains available for backlog recovery
with a server-only `SANITY_AUTH_TOKEN`. This setup has no scheduled recovery sweep;
an interrupted job whose claim expires can be retried with the manual drainer.

See [workflow setup and demo scope](studio/workflows/README.md).

## Generate posts inside Studio

Open Studio's **Generate post** tab, enter a California Black history topic, and
click **Generate post**. The tool generates one candidate fact, searches Exa for
source excerpts, checks support, and writes a caption ending in a question. It
renders the CBS black-and-gold template as a 1080 × 1080 PNG, uploads it to Sanity,
creates a draft `post` and its workflow, and submits the card to **In review**.
It never approves or publishes the card automatically.

Add `OPENAI_API_KEY` and `EXA_API_KEY` to `web/.env.local`, keeping its existing
Sanity settings, then restart the web app. See `web/.env.example`. Run both apps
with `npm run web:dev` and `npm run studio:dev` in separate terminals. Provider
keys stay on the web server and deployed Function; Studio authenticates requests with your Sanity login.
No separate CBS rendering service is needed.

For hosting, set `SANITY_STUDIO_GENERATION_API_URL` in the Studio environment to
the web app's HTTPS URL, and `SANITY_STUDIO_ORIGINS` in the web server environment
to the Studio origin (comma-separated if needed). Rebuild Studio after changing
its URL. Never send your Sanity session token to an untrusted generator URL.

The verification and rendering approach is adapted from
[cbs-post-generator](https://github.com/prophen/cbs-post-generator). Source quotes
must match actual Exa excerpts. This is a screening step before human review,
not a guarantee of historical accuracy. An unsupported result stops before
creating a post. If saving fails after generation, use **Retry saving this card**
to reuse the result without another paid generation request. A created draft is
linked from the tool so it can be recovered if you navigate away.

## Automatically replace rejected cards

In the post's Workflow tab, choose **Reject and regenerate** and enter feedback.
The Sanity Function uses the topic, previous fact, and feedback to generate and
verify revised content, renders the same black-and-gold template without a source
footer, uploads its PNG, and updates the same draft. The workflow then returns to
**In review**. Your approval is still required. Studio and the local web app can
be closed while replacements run.

If generation fails, the draft stays in **Generating** with a visible error. Use
**Retry generating replacement** in its Workflow tab. Each attempt checks the
workflow is still current; revision checks prevent it from overwriting edits made
while generation was running. A recorded effect key avoids paying again when a
completed write is replayed. Historical workflow instances keep their definition
snapshots and original review history. Future rejections in older instances are
handled through their existing submit action, without migrating or retiring them.
The retry workflow action is available on posts created with the updated definition.

Deploy workflow definitions with `npm --prefix studio run workflows:deploy` and
the Function with `npm run runtime:deploy`. Then run `npm run runtime:configure`
to copy only `OPENAI_API_KEY`, `EXA_API_KEY`, and optional `OPENAI_MODEL` from
`web/.env.local` into the deployed Function without displaying their values.
Keys are not stored in the Blueprint or committed to Git. Local backlog draining
also needs these provider settings if generation is pending.

`npm run runtime:check` checks Function types. Studio tests cover rejection,
failed replacement retries, repeated review cycles, approval restrictions, and
1080-square PNG output. Both initial cards and replacements share a server
renderer using Satori and WebAssembly Resvg; card images are never AI-generated.

## Post library and downloads

The web app at `http://localhost:3000` shows `post` documents across all workflow
stages, including drafts. Search by topic, fact, caption, or source, filter by
status, and open a post to see its caption and citation. **Copy caption** copies
Facebook-ready text. **Download image** saves the original Sanity card image,
including its full resolution, through the app's download endpoint.

Draft reads use a server-only Viewer token in `web/.env.local` under
`SANITY_API_READ_TOKEN`. This token is never sent to the browser. This is an
internal post library: visitors can see draft content. Studio is accessed separately;
the public library does not link to it.
Missing images show a placeholder and cannot be downloaded. Reload to get current
workflow status and newly generated images. The earlier `factCard` schema and
legacy pages have been removed; the library uses the workflow’s `post` documents.

## Publish an approved draft

Approve the post in its Workflow tab, then click Studio’s **Publish** button.
Publish stays disabled until the workflow has recorded approval. After Sanity
publishes the draft, the deployed Function automatically completes the same
workflow and updates its status to **Published**, even if Studio is closed.
This publishes content in Sanity; Facebook and Buffer are outside the demo.

## Sanity Challenge submission

See [the Path Two submission package](submission/README.md) for the DEV article
draft, demo script, screenshots, prompt notes, and final publishing checklist.
