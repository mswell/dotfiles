// Helpers for the copilot-blueprints FINAL_JUDGE_DONE bridge (Track B.2).
//
// Kept dependency-free (no pi-coding-agent / typebox imports) so it can be
// unit-tested in isolation. The runtime hook lives in pi-harness/index.ts
// which re-exports these names.

export function extractAssistantText(entry: unknown): string | undefined {
	if (!entry || typeof entry !== "object") return undefined;
	const e = entry as Record<string, unknown>;
	const message = (e.message ?? e) as Record<string, unknown>;
	const role = (e.role ?? message.role) as string | undefined;
	if (role && role !== "assistant") return undefined;
	const content = (message.content ?? e.content) as unknown;
	if (typeof content === "string") return content;
	if (Array.isArray(content)) {
		return content
			.filter((c): c is { type: "text"; text: string } => {
				return !!c && typeof c === "object" && (c as Record<string, unknown>).type === "text" && typeof (c as Record<string, unknown>).text === "string";
			})
			.map((c) => c.text)
			.join("\n");
	}
	return undefined;
}

export function judgeMarkerEntryId(entry: unknown, text: string): string {
	if (!entry || typeof entry !== "object") return text.slice(-160);
	const e = entry as Record<string, unknown>;
	const id = e.id ?? e.entryId ?? e.uuid;
	if (typeof id === "string" || typeof id === "number") return String(id);
	const ts = e.timestamp ?? e.createdAt ?? (e.message as Record<string, unknown> | undefined)?.timestamp;
	if (ts !== undefined) return `ts:${String(ts)}:${text.length}`;
	return text.slice(-160);
}

/**
 * Pure decision helper for the FINAL_JUDGE_DONE bridge.
 * Given a transcript branch and the last processed marker id, returns:
 *   - undefined when no fresh marker is found
 *   - { entryId, text } when a new marker should fire
 */
export function detectJudgeMarker(branch: readonly unknown[], lastProcessedId: string | undefined): { entryId: string; text: string } | undefined {
	if (!Array.isArray(branch) || branch.length === 0) return undefined;
	for (let i = branch.length - 1; i >= 0; i--) {
		const entry = branch[i];
		const text = extractAssistantText(entry);
		if (!text) continue;
		if (!text.includes("FINAL_JUDGE_DONE")) return undefined;
		const id = judgeMarkerEntryId(entry, text);
		if (id === lastProcessedId) return undefined;
		return { entryId: id, text };
	}
	return undefined;
}
