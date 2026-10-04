# Workflow demo recording

Aim for 3–4 minutes. Record the real app; trim generation waits and say when time has been cut. Use a newly generated demo post so it has the latest workflow definition. Do not use a production post you want to keep unchanged.

| Segment | Show | Suggested narration |
|---|---|---|
| 0:00–0:20 | Post library and one completed card | “This is California Black Stories, an editorial workflow for California Black history fact cards. Each card has one fact, a caption, and a source.” |
| 0:20–0:50 | Studio Generate post tool; suggest five ideas, choose one, and start | “This tool suggests five claim ideas from broad categories. I choose one, then it checks Exa source excerpts, creates the caption, and renders a template PNG. The image is not AI-generated.” |
| 0:50–1:20 | Open the generated post; show fact, citation, image, In review | “The content and source are structured fields in Sanity. The workflow has moved to In review. The generator cannot approve it.” |
| 1:20–1:40 | Publish button disabled before approval; Workflow tab | “Publishing is gated by the actual workflow approval, not just the status label.” |
| 1:40–2:20 | Reject and regenerate; enter a concrete note; return to review | “Rejection sends the post back to generation with my feedback. The Function produces a replacement on the same post. It still needs a new human approval.” |
| 2:20–2:50 | Approve; click Studio Publish; wait for Published workflow | “After approval, I publish the draft in Sanity. A background Function completes the workflow automatically. This does not send a Facebook post.” |
| 2:50–3:20 | Reload frontend; open same post; copy caption; download PNG | “The library carries the caption and source through to the final handoff, and downloads the original 1080-square image.” |
| 3:20–3:40 | Workflow/schema files or diagram | “Sanity stores both the content and its editorial process. Codex helped build the app, but I kept testing and refining the workflow.” |

Use feedback that matches the actual generated card, such as “Use a less generic engagement question while keeping the source-supported fact.” Do not suggest a historical correction unless you have checked it.

Before recording:

- Sign in to Studio yourself; start the recording after authentication.
- Hide developer consoles, environment files, credentials, and unrelated browser tabs.
- Confirm the deployed generator URL and Studio origin allowlist are correct.
- Verify the post reaches review before recording the rejection.
- If a generation fails, show the retry honestly or record a later successful run.
- Never show a secret token or claim a cut wait was instantaneous.

Still images to capture or upload:

1. Library: search/filter and several visible statuses.
2. Detail: card, caption, source, Download image.
3. Workflow: In review with Approve and Reject and regenerate.
4. Approval gate: disabled Publish before approval.
5. Final state: Published after using Studio Publish.

The existing assets/post-library.jpg and assets/post-detail.jpg were captured from the deployed app during packaging. Capture Studio evidence during the recording; it is not included yet.
