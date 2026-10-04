# Path Two submission checklist

Deadline: **October 4, 2026, 11:59 PM PDT**.

Sources: [challenge](https://dev.to/challenges/sanity-2026-09-16), [contest rules](https://dev.to/page/sanity-challenge-v26-09-16-contest-rules).

## Required submission content

- [x] Draft follows the official Path Two template.
- [x] Draft identifies Path Two and includes sanitychallenge in its tags.
- [x] Sanity project ID included: ta2gi825, production dataset.
- [x] GitHub source link included: https://github.com/prophen/fact-card-workflow.
- [x] Earlier CBS Post Generator credited.
- [x] Write-up describes actual prompts, runtime and renderer problems, scope, and limitations.
- [x] App URL added: https://fact-card-workflow.nikema.dev/.
- [x] Judge workflow access plan: recorded walkthrough; no Studio test account.
- [x] Live library opened in the browser without a login prompt during packaging.
- [ ] Upload screenshots to DEV and insert its returned media URLs.
- [ ] Record and link the authenticated workflow walkthrough.
- [x] Personal motivation and suggested learnings added; review them in your own voice.
- [x] GitHub repository confirmed public.
- [ ] Confirm the repository and Vercel deployment contain the final commit.
- [ ] If this is a team entry, credit each teammate's DEV handle; otherwise omit team credits.
- [ ] Remove every unresolved bracket marker and editorial comment in dev-post.md.
- [ ] Publish the post on DEV before the deadline. Saving a draft is not submission.

## Deployment smoke test

- [ ] Commit and push the final app assets and submission files from the repository root.
- [ ] Verify Vercel built the intended commit with Root Directory web.
- [ ] Verify required env variables are set on the deployed web app; secrets are server-only.
- [x] Removed the public Open Studio shortcut from the app code.
- [ ] Push and redeploy so the live app no longer shows the shortcut.
- [ ] Set SANITY_STUDIO_ORIGINS to the exact Studio origin(s).
- [ ] Build/deploy Studio with SANITY_STUDIO_GENERATION_API_URL pointing to the hosted app.
- [ ] Confirm the Studio origin is allowed in Sanity's CORS settings.
- [ ] Verify the deployed Function retains its provider keys and publication event filter.
- [x] Live library and detail page loaded; caption copy and original image download worked.
- [x] Live search and Published status filter worked.
- [ ] Open the citation link during the walkthrough.
- [ ] Suggest five ideas, select one, and generate a post from that exact claim.
- [ ] Newly generated post reaches In review.
- [ ] Publish is disabled before approval.
- [ ] Reject with feedback produces a replacement and returns to In review.
- [ ] Approval enables Publish; successful publication completes the workflow automatically.
- [ ] Open a shared link and confirm its favicon and social image URLs use the deployed domain.

Do not assume an authenticated local browser proves judge access. If deployment protection is enabled, document a supported judge-access method. Do not publish a protection bypass token in the article. The frontend deliberately includes drafts; use demo content appropriate for that audience.

## Optional agent session

- [ ] Export the actual Codex session; prompt-notes.md is not an export.
- [ ] Remove keys, credentials, personal information, and unrelated content.
- [ ] Upload a curated session at https://dev.to/agent_sessions/new.
- [ ] Select Make Public and embed it in the article, as the challenge requests for judge access.

## Evidence already gathered locally

- Latest workflow and generation suite: 32 passing tests, including publication synchronization.
- Studio and web production builds passed.
- Changed-file lint and type checks passed.
- Search, filters, caption copying, mobile layouts, and image download tested.
- Downloaded PNG confirmed 1080 × 1080.
- Favicon, SVG icon, Apple icon, and Open Graph image endpoints returned 200 locally.
- Live library loaded without a login prompt; search and Published filter worked; caption copied and image downloaded.

These are local checks, not a substitute for testing the final hosted app. Do not describe the deployed release as verified until the smoke test is complete.
