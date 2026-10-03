//#region functions/fact-card-status-sync/legacy.ts
/** Start the current definition while retaining the old instance and its complete audit history. */
async function restartLegacyRejection(client, engine, instanceId) {
	const instance = await client.getDocument(instanceId);
	if (!instance || instance.currentStage !== "generating" || instance.definitionSnapshot.includes("regenerate-post")) return;
	const subject = instance.fields.find((field) => field.name === "subject");
	const note = instance.fields.find((field) => field.name === "revisionNote");
	if (!subject || note?.type !== "string" || !note.value) return;
	await engine.abortInstance({
		instanceId,
		reason: "Continuing rejected card in the automatic regeneration workflow"
	});
	return (await engine.startInstance({
		definition: "post-workflow",
		perspective: "drafts",
		initialFields: [subject, note]
	})).instance._id;
}
//#endregion
export { restartLegacyRejection };

//# sourceMappingURL=index7.js.map