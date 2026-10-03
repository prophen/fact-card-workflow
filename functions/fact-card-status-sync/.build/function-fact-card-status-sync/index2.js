import "@sanity/client";
import { createEngine, extractDocumentId } from "@sanity/workflow-engine";
//#region studio/workflows/runtime.ts
function createPostEngineFromClient(client) {
	const syncPostStatus = async (params, ctx) => {
		if (typeof params.subject !== "string") throw new Error("Expected a subject GDR URI");
		const stage = await client.fetch("*[_id == $id][0].currentStage", { id: ctx.instanceId }, { perspective: "raw" });
		if (![
			"generating",
			"inReview",
			"approved",
			"published"
		].includes(stage)) throw new Error("Unexpected workflow stage");
		const baseId = extractDocumentId(params.subject).replace(/^drafts\./, "");
		const target = await client.fetch("coalesce(*[_id == $draft][0]._id, *[_id == $base][0]._id)", {
			draft: `drafts.${baseId}`,
			base: baseId
		}, { perspective: "raw" });
		if (!target) throw new Error("Workflow subject no longer exists");
		await client.patch(target).set({ status: stage }).commit();
	};
	return createEngine({
		client,
		workflowResource: {
			type: "dataset",
			id: "ta2gi825.production"
		},
		tag: "production",
		executionContext: {
			kind: "drainer",
			id: "fact-card-status-sync"
		},
		effects: { handlers: {
			"sync-review-status": syncPostStatus,
			"sync-approved-status": syncPostStatus,
			"sync-rejected-status": syncPostStatus,
			"sync-published-status": syncPostStatus
		} }
	});
}
//#endregion
export { createPostEngineFromClient };

//# sourceMappingURL=index2.js.map