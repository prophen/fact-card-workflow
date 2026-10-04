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

Implementation problems worth discussing in the write-up:

- Workflow deployment alone did not execute pending effects. It needed a runtime.
- The initial native image renderer caused deployment trouble; WebAssembly rendering replaced it.
- Historical workflow instances retained older definition snapshots. Compatibility handling preserved their existing histories.
- Local builds encountered a Turbopack environment restriction. Webpack builds provided validation; that is separate from confirming the Vercel deployment.

The article should describe these as observed build events. Do not present this file as a full agent session or invent a prompt that was never used.
