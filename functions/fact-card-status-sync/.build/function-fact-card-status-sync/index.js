import { createPostEngineFromClient } from "./index2.js";
import { regenerationHandler } from "./index6.js";
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
	}, async (params, ctx) => {
		const instance = await client.getDocument(ctx.instanceId);
		if (!instance || instance.definitionSnapshot.includes("regenerate-post")) return;
		const revisionNote = instance.fields.find((field) => field.name === "revisionNote")?.value;
		await regenerationHandler(client)({
			...params,
			revisionNote
		}, ctx);
		await engine.fireAction({
			instanceId: ctx.instanceId,
			activity: "generate",
			action: "submit",
			idempotencyKey: `replacement-submit-${ctx.effectKey}`
		});
	});
	await engine.drainEffects({ instanceId: event.data._id });
});
//#endregion
export { handler };

//# sourceMappingURL=index.js.map