# Fact Card Workflow

One Git repository contains both apps and the automatic workflow runtime:

- `studio/`: Sanity Studio, post schema, and editorial workflow.
- `web/`: Next.js app.
- `functions/`: automatic workflow status synchronization.
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

The event filter responds only when unclaimed queued work increases, so claiming
and completing jobs does not create a recursive trigger loop. Previously queued
jobs do not produce a new event just because the Function is deployed; the manual
`studio` command `npm run workflows:drain` remains available for backlog recovery
with a server-only `SANITY_AUTH_TOKEN`. This setup has no scheduled recovery sweep;
an interrupted job whose claim expires can be retried with the manual drainer.

See [workflow setup and demo scope](studio/workflows/README.md).
