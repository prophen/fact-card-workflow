import { createPostEngineFromClient } from "./index2.js";
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
	await createPostEngineFromClient(client).drainEffects({ instanceId: event.data._id });
});
//#endregion
export { handler };

//# sourceMappingURL=index.js.map