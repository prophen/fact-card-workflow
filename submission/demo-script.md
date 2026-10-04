# California Black Stories — walkthrough script

Aim for 4–5 minutes. Record the real app and trim provider waits. Add an “Elapsed time cut” label wherever you shorten a wait. Start with a newly generated demo post so it uses the current workflow.

## 0:00–0:25 · Introduce the app

**Show:** The public post library, then a completed card’s detail page.

**Say:**

“This is California Black Stories, my Sanity Challenge Path Two project. I run a Facebook page about Black history in my home state, and I built this app to prepare fact cards with their sources and review decisions attached.

The public library lets me find posts, read their captions and citations, and download the card image. It includes drafts as well as published posts.”

## 0:25–0:55 · Find a claim idea

**Show:** Studio’s **Generate post** tool. Point to the core topics, click **Suggest five ideas**, then **Use this idea**.

**Say:**

“I start with broad topics and ask for five specific claim ideas. These are candidates, not verified facts. I brought back the idea-generation prompt from my original CBS Post Generator because it gave me a better range of relevant stories.

I can choose an idea or enter a topic of my own.”

## 0:55–1:35 · Inspect the fact check

**Show:** Click **Verify with Exa**. After the response, show the **Claim audit** and **Exa sources** containers. Scroll through the findings and open one source link.

**Say:**

“Verification happens before I create a card. Exa finds source excerpts, and the fact checker breaks the claim into checkable parts.

Each part is labeled supported, unsupported, or contradicted. Supported means an excerpt backs it. Unsupported means the supplied excerpts don’t address it. Contradicted means an excerpt conflicts with it.

The linked Exa sources stay visible, with excerpt previews and publication dates when available, so I can inspect the evidence myself.”

**If a previous-post conflict appears:** Point to the warning and say, “The app also flags possible conflicts with earlier approved or published posts for me to review.”

## 1:35–2:00 · Apply a suggested correction

**Show:** A real mixed or contradicted result. Read the affected finding, show the suggested correction, and click **Apply suggested correction**. Point to **Fact for the card**.

**Say:**

“If part of a claim isn’t supported or conflicts with the sources, the app suggests a correction while keeping the supported details.

Applying this suggestion uses the findings already on screen. It doesn’t run another search or audit. I can inspect the corrected fact before creating the card, and it still needs my editorial approval.”

**Recording branch:** If the chosen claim is fully supported, use a separate, previously tested mixed result to demonstrate correction, then continue with the selected fact. Don’t invent a finding or describe a supported result as unsupported.

**Optional, show without clicking:**

“Retry source checking is available when I want more evidence. That adds sources while retaining the earlier excerpts. If I edit a suggested correction, the edited wording needs verification.”

## 2:00–2:30 · Create the card and enter review

**Show:** Click **Create card & submit for review**. Show the card preview, caption, and source. Click **Open post in Studio**, then show the workflow’s **In review** stage.

**Say:**

“Now I create the card and submit it for review. The image is a template-rendered 1080-by-1080 PNG, not AI-generated artwork. The citation stays in the post data rather than being printed at the bottom of the image.

Sanity stores the fact, caption, citation, source URL, template ID, and uploaded image as structured fields. The workflow moves the completed post to In review.”

## 2:30–3:15 · Show the approval gate and rejection loop

**Show:** The disabled **Publish** button before approval. In the Workflow view, click **Reject and regenerate** and enter:

> Change the question in the Facebook caption. Keep the fact, source, and card image unchanged.

Show **Generating**, then the revised caption and return to **In review**.

**Say:**

“Publishing is gated by the workflow’s actual approval. Changing a status label doesn’t approve a post.

If I reject it, I leave feedback and a background Sanity Function handles the revision. Here I’m changing only the engagement question, so it keeps the fact, source, and card image. An image-only request rerenders the existing fact, while a factual change goes through source verification.

The app updates the existing post and sends it back to review. I can then approve it or request another revision.”

**If regeneration fails:** Show the error and **Retry generating replacement**, or record a later successful run. Don’t imply the workflow succeeded while it is still generating.

## 3:15–3:40 · Approve and publish

**Show:** Click **Approve**. Show **Approved** and the enabled Studio **Publish** button. Click **Publish**, then wait for the workflow to reach **Published**.

**Say:**

“Once I’m satisfied, I approve the post. Then I use Studio’s Publish button. A background Function automatically completes the workflow, so I don’t need a second confirmation in the Workflow view.

This publishes the document to Sanity. The demo doesn’t send a post to Facebook or Instagram.”

## 3:40–4:10 · Download the final asset

**Show:** Refresh the public library, find the same post, open it, copy the caption, and download the PNG.

**Say:**

“The library now shows the published post with its caption and source. I can copy the caption and download the original PNG for the final posting handoff.

The demo focuses on fact cards. My production process uses Buffer for Facebook and Instagram, but Buffer and reels are outside this submission.”

## 4:10–4:30 · Close with the learning

**Show:** The four-stage workflow or the repository’s workflow definition.

**Say:**

“My biggest learning was that a content workflow needs more than a status dropdown. Sanity Workflows let me model approval, rejection with feedback, and what happens next. Customizing Studio brought generation and review into the same workspace.

I built this with Codex and refined it by testing real claims and the full editorial loop. AI helps prepare the post; I make the approval decision.”

## Before recording

- Confirm the latest web deployment is ready and refresh Studio to load the updated interface.
- Sign in before recording and close unrelated tabs.
- Choose a fresh demo post and test a real mixed or contradicted claim for the correction segment.
- Confirm generation, caption-only regeneration, approval, and automatic publication completion work.
- Keep environment files, credentials, and developer consoles out of the recording.
- Leave enough time to show the audit, linked sources, and corrected fact clearly.

## Screenshots to capture

1. Topic ideas and the selected claim.
2. Claim audit with status badges and the linked Exa sources.
3. Suggested correction and the selected fact for the card.
4. In review with **Approve** and **Reject and regenerate**.
5. Disabled **Publish** before approval.
6. Published workflow after using Studio **Publish**.
7. Post detail with caption, citation, source link, and image download.

The existing `assets/post-library.jpg` and `assets/post-detail.jpg` show the deployed library. Capture fresh Studio screenshots for the updated verification and correction flow.
