import { generatePost } from "./index3.js";
import { renderCard } from "./index5.js";
import { extractDocumentId } from "@sanity/workflow-engine";
//#region functions/fact-card-status-sync/regenerate.ts
function regenerationHandler(client) {
	return async (params, ctx) => {
		if (typeof params.subject !== "string" || typeof params.revisionNote !== "string") throw new Error("Replacement generation needs a post and editorial feedback.");
		const id = extractDocumentId(params.subject).replace(/^drafts\./, "");
		const draftId = `drafts.${id}`;
		const isCurrent = () => client.fetch("*[_id == $id][0].currentStage == \"generating\" && count(*[_id == $id][0].pendingEffects[_key == $key]) == 1", {
			id: ctx.instanceId,
			key: ctx.effectKey
		}, { perspective: "raw" });
		if (!await isCurrent()) throw new Error("Replacement generation is no longer current.");
		let post = await client.getDocument(draftId);
		if (!post) {
			const published = await client.getDocument(id);
			if (!published) throw new Error("The post no longer exists.");
			const { _rev, ...content } = published;
			post = await client.createIfNotExists({
				...content,
				_id: draftId
			});
		}
		if (post.regenerationKey === ctx.effectKey) return;
		try {
			const openaiKey = process.env.OPENAI_API_KEY;
			const exaKey = process.env.EXA_API_KEY;
			if (!openaiKey || !exaKey) throw new Error("The background Function needs its OpenAI and Exa keys configured.");
			if (!post.topic) throw new Error("Add a topic to this post before retrying generation.");
			await client.patch(draftId).set({ status: "generating" }).unset(["generationError"]).commit();
			post = await client.getDocument(draftId);
			const generated = await generatePost(post.topic, {
				openaiKey,
				exaKey,
				model: process.env.OPENAI_MODEL || "gpt-4o-mini"
			}, fetch, {
				note: params.revisionNote,
				previousFact: post.factText || ""
			});
			if (generated.factText.trim() === post.factText?.trim()) throw new Error("The replacement repeated the original fact. Try again with more specific feedback.");
			const png = await renderCard(generated.factText, post.renderTemplate || "defaultFactCard");
			if (!await isCurrent()) throw new Error("The workflow changed while generating the replacement.");
			const asset = await client.assets.upload("image", png, {
				filename: "cbs-fact-card.png",
				contentType: "image/png"
			});
			await client.patch(draftId).ifRevisionId(post._rev).set({
				...generated,
				source: {
					_type: "source",
					...generated.source
				},
				renderTemplate: post.renderTemplate || "defaultFactCard",
				image: {
					_type: "image",
					asset: {
						_type: "reference",
						_ref: asset._id
					}
				},
				regenerationKey: ctx.effectKey
			}).unset(["generationError"]).commit();
		} catch (error) {
			if (await isCurrent()) await client.patch(draftId).set({ generationError: error instanceof Error ? error.message : "Replacement generation failed." }).commit();
			throw error;
		}
	};
}
//#endregion
export { regenerationHandler };

//# sourceMappingURL=index6.js.map