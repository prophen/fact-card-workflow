import { createPostEngineFromClient } from "./index2.js";
import { regenerationHandler } from "./index6.js";
import { restartLegacyRejection } from "./index7.js";
import { createClient } from "@sanity/client";
import { documentEventHandler } from "@sanity/functions";
import { ENGINE_API_VERSION } from "@sanity/workflow-engine";
//#region functions/fact-card-status-sync/index.ts
var handler = documentEventHandler(async ({ context, event }) => {
	const { projectId, dataset } = context.clientOptions;
	if (projectId !== "ta2gi825" || dataset !== "production") throw new Error("Unexpected fact card workflow resource");
	const client = createClient({
		...context.clientOptions,
		apiVersion: ENGINE_API_VERSION,
		perspective: "raw",
		useCdn: false
	});
	const engine = createPostEngineFromClient(client, {
		"regenerate-post": regenerationHandler(client),
		"retry-regenerate-post": regenerationHandler(client)
	}, async (_params, ctx) => {
		const replacementId = await restartLegacyRejection(client, engine, ctx.instanceId);
		if (replacementId) for (let pass = 0; pass < 4; pass++) await engine.drainEffects({ instanceId: replacementId });
	});
	for (let pass = 0; pass < 4; pass++) {
		await engine.drainEffects({ instanceId: event.data._id });
		if (!await client.fetch("count(*[_id == $id][0].pendingEffects[!defined(claim)])", { id: event.data._id })) break;
	}
});
//#endregion
export { handler };

//# sourceMappingURL=index.js.map