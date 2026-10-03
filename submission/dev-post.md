---
title: "California Black Stories: an AI fact-card workflow with a human approval gate"
published: false
tags: devchallenge, sanitychallenge, sanity, ai
---

*This is a submission for the [Sanity Challenge, Path Two: Vibe-Code Something Strange](https://dev.to/challenges/sanity-2026-09-16).*

## What I Built

California Black Stories is an editorial app for preparing fact-card posts for a California Black history Facebook page. It takes a topic, drafts one fact, checks it against source excerpts, writes a short caption, and renders a downloadable card. The post then waits for a person to review it.

I run the California Black Stories Facebook page because I’m interested in the history of my home state. Much of the content currently on the page is AI-generated. My goal is to grow the page and qualify for Facebook monetization, and I wanted a repeatable way to prepare posts while keeping the source and my review decision attached to each one.

The core feature is a four-stage Sanity workflow:

```text
generating → inReview → approved → published
               ↓
           generating
        (reject with feedback)
```

I can approve a card or reject it with a note. A rejection queues a replacement using that feedback, returns the revised card to review, and requires approval again. The generator cannot approve its own work.

The Next.js post library shows the card image, caption, citation, source link, and workflow status. It includes drafts, supports search and status filters, and lets me copy a caption or download the original PNG.

## Demo

<!-- REQUIRED_BEFORE_PUBLISH: Add the walkthrough URL and upload the screenshots to DEV. -->

- **Post library:** [fact-card-workflow.nikema.dev](https://fact-card-workflow.nikema.dev/)
- **Workflow walkthrough:** [DEMO_VIDEO_URL]

<!-- Upload assets/post-library.jpg and assets/post-detail.jpg to DEV and insert the returned image URLs here. Local paths will not work in a published DEV post. -->

**How to test:** In the post library, search for a topic, filter by workflow status, open a post, copy its caption, and download its image. The library includes works in progress, so these are editorial drafts rather than a feed of approved historical claims.

Generation, approval, rejection, and publication take place in Studio and require an authorized Sanity account. The linked walkthrough demonstrates that authenticated workflow, including generation, rejection with feedback, replacement generation, approval, and publication. Judges can use the live post library directly; no Studio test account is supplied.

After approving a draft in Studio, I click **Publish**. Sanity publishes the document, and a background Function completes the same workflow and updates its status. No separate “mark published” click is needed. This demo publishes to Sanity; it does not post to Facebook.

## Code

[GitHub repository](https://github.com/prophen/fact-card-workflow)

The repository contains the Studio, Next.js frontend, shared generation and rendering code, and the Sanity Function runtime. The [README](https://github.com/prophen/fact-card-workflow#readme) explains how to run them and configure the integrations.

The verification and rendering approach builds on my earlier [CBS Post Generator](https://github.com/prophen/cbs-post-generator). I adapted it into an editorial process with structured content, stored assets, and review history.

## My Build Process

I built this with the Codex desktop app. I started with a specific schema and workflow request, then changed the app through small prompts as I tested the result.

### Start with the process and the schema

My initial request specified one `post` document with a topic, fact text, a nested citation and source URL, a Facebook caption, a template ID, an uploaded image, and a status. It also specified the four workflow stages and a rejection path back to generation.

Keeping these as separate fields matters. The source remains available to the reviewer even though it is not printed on the card. The image is a stored Sanity asset, and the template ID records how it was rendered. The workflow is stored alongside the content rather than being an informal agreement about what a status label means.

The definition lives in `studio/workflows/postWorkflow.ts`, and the schema uses Sanity's `defineType` and `defineField` APIs. I removed an earlier generic `factCard` schema once the new `post` model powered the app.

### A deployed definition is not a running pipeline

The first workflow deployment warned that no generated runtime was present. That was a useful distinction: deploying the workflow described the process, but something still had to execute the queued effects.

I initially had a manual drain command. I asked, “can we handle it automatically instead,” and the app gained a Sanity Function that responds to newly queued effects. It synchronizes the post's status and performs replacement generation after rejection. Normal transitions no longer depend on a terminal command or an open browser.

### Move generation into the app

Next I asked, “I want to generate the posts within the app.” We added a custom **Generate post** tool in Studio, backed by a server endpoint in the web app.

OpenAI produces a candidate claim. Exa provides source excerpts. A second model pass checks the claim against those excerpts, and the code rejects a source quote that does not match the retrieved evidence. Supported output becomes a fact, citation, source URL, and caption ending in a question.

That screening step can still miss historical nuance. The human review gate is part of the design, not an optional cleanup step.

### Refine the actual card, not just the prompt

I noticed that the card template printed the source text at the bottom and asked to remove it. We kept the citation in Sanity and on the detail page, while simplifying the image to the fact and the California Black Stories branding.

The images are template-rendered, not AI-generated artwork. Satori lays out the text, and WebAssembly Resvg produces a 1080 × 1080 PNG. A native renderer caused deployment trouble, so we moved to the WebAssembly version and shared that renderer between initial generation and replacements.

### Make rejection useful

A reject button alone leaves me with another task. I asked how to generate a replacement automatically, and we connected rejection feedback to the generation process.

The background job uses the topic, previous fact, and revision note. Failed generation leaves an error and a retry action. Revision checks help prevent a long-running replacement from overwriting edits made while it was running. Existing workflow instances retain their definition snapshots and review history.

### Finish the handoff

The frontend came from another practical request: “can we build a frontend that shows the post data and allows downloading the post image.” I chose to include drafts so it works as a working library. The implementation uses server-side GROQ reads with a Viewer token; the token stays out of browser code.

Finally, I wanted Studio's **Publish** button to complete the workflow automatically. The button checks the current workflow's approval, and a background Function advances the approved workflow after a published document exists.

The latest local checks passed 16 tests, Studio and web builds, and the changed-file lint checks. Tests exercise approval restrictions, rejection and retries, rendering, and publication synchronization. I also checked search, filtering, caption copying, mobile layouts, and an actual 1080 × 1080 image download in the browser. The deployed library also loaded successfully, and search, status filtering, caption copying, and image download worked there. The full authenticated workflow still needs its recorded walkthrough and final hosted smoke test.

### What I would improve next

The web library is a server-rendered interface with refresh-based updates; it is not a custom real-time App SDK app. Workflows are the Sanity feature I explored deeply for this submission.

Interrupted effect jobs currently have a manual recovery path rather than a scheduled sweep. Content Lake write permissions also remain the boundary for direct API edits; the workflow and Studio button coordinate the intended editorial process.

The demo is deliberately limited to fact cards. Production uses Buffer to publish to Facebook and Instagram, but there is no Buffer integration or reels workflow in this entry.

My biggest learning was that a content workflow needs more than a status dropdown. Sanity Workflows let me model who can move a post forward, what happens after rejection, and where human approval belongs. I also learned that deploying a workflow definition does not automatically run its effects; that needs a runtime.

Customizing Studio showed me that I could put the generation tool inside the same place where I review the content. I didn’t need to keep switching between a generator and a CMS. Prompting helped me build the pieces, but testing the actual generation, rejection, approval, and publication loop is what made the app useful.

## Sanity Project Details

- **Project ID:** `ta2gi825`
- **Dataset:** `production`
- **Document type:** `post`
- **Workflow:** `post-workflow`, deployment tag `production`
- **Runtime:** Sanity Function `fact-card-status-sync`

## Agent Session

I used Codex throughout the build. The repository includes [selected prompt notes](https://github.com/prophen/fact-card-workflow/blob/main/submission/prompt-notes.md) explaining the requests and course corrections behind the app.

<!-- OPTIONAL: If you export a real Codex transcript, review it for keys and personal information, upload it at https://dev.to/agent_sessions/new, choose Make Public, and replace this comment with the DEV embed. The prompt notes are not a full session transcript. Remove this comment if you do not upload a session. -->
