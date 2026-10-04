# Selected build prompts and course corrections

These are selected user requests from the Codex build conversation, not an exported agent-session transcript. They document the iteration without including credentials or tool logs.

| Actual request | What it changed |
|---|---|
| “Use Sanity's official Editorial Workflows feature” | The editorial process became a workflow definition with agent submission, human approval, rejection, and terminal publication. |
| “can we handle it automatically instead” | Replaced routine manual effect draining with an event-driven Sanity Function. |
| “Can you bring in the topic generation feature from cbs-post-generator? I'm having a hard time generating posts” | Added five candidate claim suggestions from the original core categories, followed by verification of the selected idea. |
| “I want to generate the posts within the app.” | Added a custom Studio tool and a server-side generation endpoint. |
| “okay the template has a problem. It has the source text rendered at the bottom. I want to remove that” | Removed the source footer from the PNG while preserving the citation in structured content and the frontend. |
| “how do we automatically generate a replacement?” | Connected rejection notes to background regeneration and resubmission. |
| “can we build a frontend that shows the post data and allows downloading the post image” | Added the post library, detail page, caption copy, and original image download. |
| “All posts, including drafts (Recommended)” | Made the library useful for editorial work across workflow stages. This was the selected answer to an interface-scope question. |
| “let's remove the fact card schema” | Removed the older factCard model and routes; retained the post workflow model. |
| “is it possible to mark published automatically in the workflow if I hit publish on a draft?” | Connected Sanity publication to workflow completion, with an approval-aware Publish button. |
| “can you create a favicon and og metadata for this app” | Added the CBS identity and social sharing assets. |
| “There was a step for revising the post if claims didn't check out” | Restored the claim-audit and suggested-correction flow from the earlier generator. |
| “can we just accept the suggested rewrite instead of checking again with a new search? Since the rewrite is based on what is already supported?” | Applying a suggested correction reuses the existing findings instead of running another search or audit. Edited corrections still require verification. |
| “the source is very long and in markdown” | Shortened newly saved citations to source titles and URLs, then added formatted source previews and expandable notes. |
| “it shows an automated step didn't finish but it reloads a couple of times and then resolves” | Traced the temporary warning to the Workflows UI labeling a claimed background step as unfinished while it was still running. Distinguished this from an actual regeneration failure. |

## Problems encountered and changes made

- Workflow deployment alone did not execute pending effects. It needed a runtime.
- The initial native image renderer caused deployment trouble; WebAssembly rendering replaced it.
- Historical workflow instances retained older definition snapshots. Compatibility handling preserved their existing histories.
- Local builds encountered a Turbopack environment restriction. Webpack builds provided validation; that is separate from confirming the Vercel deployment.
- The adapted verification flow added restrictive prompts and extra audit checks that changed the earlier app’s behavior. Restoring the original idea, audit, and correction prompts helped preserve relevant supported details.
- Caption feedback that also said to keep the fact and source unchanged could be misclassified as a factual rewrite. Revision routing now distinguishes preservation instructions from requested changes.
- Background status writes could change the document revision during generation. Replacement saves now tolerate status-only changes while protecting reviewer edits.
- Source text was displayed as raw text. Markdown rendering was added to the post detail page and Studio previews.
