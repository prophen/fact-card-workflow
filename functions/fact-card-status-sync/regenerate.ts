import type { SanityClient } from "@sanity/client";
import { extractDocumentId, type EffectHandler } from "@sanity/workflow-engine";
import { revisionScope, reviseCaption } from "../../shared/revise-presentation";
import {
  generatePost,
  SourceVerificationError,
} from "../../shared/generate-post";
import { renderCard, cardTemplate } from "../../shared/render-card";

type Post = {
  _id: string;
  _rev: string;
  _type: string;
  topic?: string;
  factText?: string;
  caption?: string;
  source?: { citation?: string; url?: string };
  image?: { asset?: { _ref?: string } };
  renderTemplate?: string;
  regenerationKey?: string;
};

export function regenerationHandler(client: SanityClient): EffectHandler {
  return async (params, ctx) => {
    if (
      typeof params.subject !== "string" ||
      typeof params.revisionNote !== "string"
    )
      throw new Error(
        "Replacement generation needs a post and editorial feedback.",
      );
    const id = extractDocumentId(params.subject).replace(/^drafts\./, "");
    const draftId = `drafts.${id}`;
    const isCurrent = () =>
      client.fetch<boolean>(
        '*[_id == $id][0].currentStage == "generating" && count(*[_id == $id][0].pendingEffects[_key == $key]) == 1',
        { id: ctx.instanceId, key: ctx.effectKey },
        { perspective: "raw" },
      );
    if (!(await isCurrent()))
      throw new Error("Replacement generation is no longer current.");
    let post: Post | undefined = await client.getDocument<Post>(draftId);
    if (!post) {
      const published = await client.getDocument<Post>(id);
      if (!published) throw new Error("The post no longer exists.");
      const { _rev, ...content } = published;
      void _rev;
      post = await client.createIfNotExists({ ...content, _id: draftId });
    }
    // A replay after writing the complete card resumes workflow completion without paying again.
    if (post.regenerationKey === ctx.effectKey) return;
    try {
      const openaiKey = process.env.OPENAI_API_KEY;
      const exaKey = process.env.EXA_API_KEY;
      const scope = revisionScope(params.revisionNote);
      if ((scope !== "image" && !openaiKey) || (scope === "content" && !exaKey))
        throw new Error(
          "The background Function needs its generation provider keys configured.",
        );
      if (scope === "content" && !post.topic)
        throw new Error("Add a topic to this post before retrying generation.");
      await client
        .patch(draftId)
        .set({ status: "generating" })
        .unset(["generationError"])
        .commit();
      post = (await client.getDocument<Post>(draftId))!;
      let content: Record<string, unknown>;
      let png: Buffer | undefined;
      if (scope !== "content") {
        if (
          !post.factText ||
          !post.source?.citation ||
          !post.source.url ||
          !post.caption ||
          !post.image?.asset?._ref
        )
          throw new Error(
            "This post needs its existing fact, source, caption, and card before a presentation-only revision.",
          );
        content = {};
        if (scope === "caption" || scope === "presentation") {
          content.caption = await reviseCaption(
            post.factText,
            post.caption,
            params.revisionNote,
            {
              openaiKey: openaiKey!,
              model: process.env.OPENAI_MODEL || "gpt-4o-mini",
            },
          );
        }
        if (scope === "image" || scope === "presentation")
          png = await renderCard(
            post.factText,
            post.renderTemplate || cardTemplate,
          );
      } else {
        const previousFacts = await client.fetch<string[]>(
          '*[_type == "post" && status in ["approved", "published"] && !(_id in path("versions.**")) && _id != $id] | order(_updatedAt desc)[0...100].factText',
          { id },
          { perspective: "drafts" },
        );
        let generated;
        try {
          generated = await generatePost(
            post.topic!,
            {
              openaiKey: openaiKey!,
              exaKey: exaKey!,
              model: process.env.OPENAI_MODEL || "gpt-4o-mini",
            },
            fetch,
            { note: params.revisionNote, previousFact: post.factText || "" },
            undefined,
            false,
            previousFacts,
          );
        } catch (error) {
          if (
            !(error instanceof SourceVerificationError) ||
            !error.preparedRewrite
          )
            throw error;
          // A checked correction still returns to human review; it never approves itself.
          generated = error.preparedRewrite;
        }
        content = {
          factText: generated.factText,
          caption: generated.caption,
          source: { _type: "source", ...generated.source },
          renderTemplate: post.renderTemplate || cardTemplate,
        };
        png = await renderCard(
          generated.factText,
          post.renderTemplate || cardTemplate,
        );
      }
      if (!(await isCurrent()))
        throw new Error(
          "The workflow changed while generating the replacement.",
        );
      if (png) {
        const asset = await client.assets.upload("image", png, {
          filename: "cbs-fact-card.png",
          contentType: "image/png",
        });
        content.image = {
          _type: "image",
          asset: { _type: "reference", _ref: asset._id },
        };
      }
      // Do not overwrite edits made by a reviewer while the providers were running.
      await client
        .patch(draftId)
        .ifRevisionId(post._rev)
        .set({
          ...content,

          regenerationKey: ctx.effectKey,
        })
        .unset(["generationError"])
        .commit();
    } catch (error) {
      if (await isCurrent()) {
        await client
          .patch(draftId)
          .set({
            generationError:
              error instanceof Error
                ? error.message
                : "Replacement generation failed.",
          })
          .commit();
      }
      throw error;
    }
  };
}
