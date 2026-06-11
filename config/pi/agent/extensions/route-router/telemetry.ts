import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { BlueprintNode, BlueprintNodeKind } from "./blueprint";
import { getModelCapabilities } from "./model-catalog";
import type { ModelRole, RiskTier, RouteDecision, RouteMode } from "./types";

export type RouteTelemetryEventName =
	| "route.decision"
	| "route.apply"
	| "route.fallback.skip"
	| "blueprint.node.start"
	| "blueprint.node.end";

export interface RouteTelemetryEvent {
	event: RouteTelemetryEventName;
	timestamp?: string;
	mode?: RouteMode;
	riskTier?: RiskTier;
	targetRole?: ModelRole;
	model?: string;
	contextTokens?: number;
	safeInputTokens?: number;
	reason?: string;
	applied?: boolean;
	node?: string;
	kind?: BlueprintNodeKind;
	exitCode?: number;
}

export interface TelemetryRecorder {
	enabled: boolean;
	filePath?: string;
	record(event: RouteTelemetryEvent): Promise<void>;
}

const TELEMETRY_FILE = "route-router-events.jsonl";
const RUN_DIR_ENV_KEYS = ["PI_RUN_DIR", "PI_BLUEPRINT_RUN_DIR", "PI_ROUTER_RUN_DIR", "RUN_DIR"];
const MAX_REASON_LENGTH = 240;

export function resolveTelemetryRunDir(env: NodeJS.ProcessEnv = process.env): string | undefined {
	for (const key of RUN_DIR_ENV_KEYS) {
		const value = env[key]?.trim();
		if (value) return value;
	}
	return undefined;
}

export function createTelemetryRecorder(options: { runDir?: string; fileName?: string } = {}): TelemetryRecorder {
	const runDir = options.runDir ?? resolveTelemetryRunDir();
	if (!runDir) {
		return {
			enabled: false,
			record: async () => undefined,
		};
	}

	const filePath = path.join(runDir, options.fileName ?? TELEMETRY_FILE);
	return {
		enabled: true,
		filePath,
		record: async (event) => {
			const normalized = normalizeTelemetryEvent(event);
			try {
				await fs.mkdir(path.dirname(filePath), { recursive: true });
				await fs.appendFile(filePath, `${JSON.stringify(normalized)}\n`, "utf8");
			} catch {
				// Telemetry must never break routing or agent execution.
			}
		},
	};
}

export function normalizeTelemetryEvent(event: RouteTelemetryEvent): RouteTelemetryEvent {
	const normalized: RouteTelemetryEvent = {
		event: event.event,
		timestamp: event.timestamp ?? new Date().toISOString(),
	};
	assignString(normalized, "mode", event.mode);
	assignString(normalized, "riskTier", event.riskTier);
	assignString(normalized, "targetRole", event.targetRole);
	assignString(normalized, "model", event.model);
	assignNumber(normalized, "contextTokens", event.contextTokens);
	assignNumber(normalized, "safeInputTokens", event.safeInputTokens);
	assignString(normalized, "reason", event.reason ? redactTelemetryString(event.reason, MAX_REASON_LENGTH) : undefined);
	if (typeof event.applied === "boolean") normalized.applied = event.applied;
	assignString(normalized, "node", event.node);
	assignString(normalized, "kind", event.kind);
	assignNumber(normalized, "exitCode", event.exitCode);
	return normalized;
}

export function redactTelemetryString(value: string, maxLength = MAX_REASON_LENGTH): string {
	let redacted = value;
	redacted = redacted.replace(/\bAuthorization\s*:\s*[^\s,;]+(?:\s+[^\s,;]+)?/gi, "Authorization: [REDACTED]");
	redacted = redacted.replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]");
	redacted = redacted.replace(/\b(cookie|set-cookie)\s*[:=]\s*[^\n;]+(?:;\s*[^\n;]+)*/gi, "$1=[REDACTED]");
	redacted = redacted.replace(/\b(api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|id[_-]?token|token|password|passwd|pwd|secret)\b\s*[:=]\s*[\"']?[^\s,;\"']+/gi, "$1=[REDACTED]");
	redacted = redacted.replace(/\bgh[pousr]_[A-Za-z0-9_]{20,}/g, "[REDACTED_GITHUB_TOKEN]");
	redacted = redacted.replace(/\bsk-[A-Za-z0-9_-]{20,}/g, "[REDACTED_API_KEY]");
	redacted = redacted.replace(/[A-Za-z0-9+/]{32,}={0,2}/g, "[REDACTED_SECRET]");
	redacted = redacted.replace(/\s+/g, " ").trim();
	if (redacted.length > maxLength) return `${redacted.slice(0, maxLength - 1)}…`;
	return redacted;
}

export function routeDecisionTelemetryEvent(decision: RouteDecision, contextTokens?: number): RouteTelemetryEvent {
	return normalizeTelemetryEvent({
		event: "route.decision",
		mode: decision.mode,
		riskTier: decision.riskTier,
		targetRole: decision.targetRole,
		contextTokens,
		reason: decision.reason,
	});
}

export function routeApplyTelemetryEvent(decision: RouteDecision, contextTokens?: number): RouteTelemetryEvent {
	const model = decision.appliedModel ?? modelNameFromDecision(decision);
	return normalizeTelemetryEvent({
		event: "route.apply",
		mode: decision.mode,
		riskTier: decision.riskTier,
		targetRole: decision.targetRole,
		model,
		contextTokens,
		safeInputTokens: safeInputTokensForModel(model),
		reason: decision.applyNote,
		applied: Boolean(decision.applied),
	});
}

export function routeFallbackSkipTelemetryEvent(input: {
	mode: RouteMode;
	riskTier?: RiskTier;
	targetRole: ModelRole;
	provider: string;
	modelId: string;
	contextTokens?: number;
	reason: string;
}): RouteTelemetryEvent {
	const model = `${input.provider}/${input.modelId}`;
	return normalizeTelemetryEvent({
		event: "route.fallback.skip",
		mode: input.mode,
		riskTier: input.riskTier,
		targetRole: input.targetRole,
		model,
		contextTokens: input.contextTokens,
		safeInputTokens: safeInputTokensForModel(model),
		reason: input.reason,
		applied: false,
	});
}

export function blueprintNodeStartTelemetryEvent(node: BlueprintNode): RouteTelemetryEvent {
	return normalizeTelemetryEvent({
		event: "blueprint.node.start",
		node: node.id,
		kind: node.kind,
		riskTier: node.riskTier,
		targetRole: node.role,
	});
}

export function blueprintNodeEndTelemetryEvent(node: BlueprintNode, exitCode?: number): RouteTelemetryEvent {
	return normalizeTelemetryEvent({
		event: "blueprint.node.end",
		node: node.id,
		kind: node.kind,
		riskTier: node.riskTier,
		targetRole: node.role,
		exitCode,
	});
}

function modelNameFromDecision(decision: RouteDecision): string | undefined {
	if (!decision.resolvedModel || !decision.targetProvider) return undefined;
	return `${decision.targetProvider}/${decision.resolvedModel}`;
}

function safeInputTokensForModel(model: string | undefined): number | undefined {
	if (!model) return undefined;
	const modelId = model.split("/").pop();
	if (!modelId) return undefined;
	return getModelCapabilities(modelId).safeInputTokens;
}

function assignString<T extends keyof RouteTelemetryEvent>(target: RouteTelemetryEvent, key: T, value: RouteTelemetryEvent[T]): void {
	if (typeof value === "string" && value.length > 0) {
		(target as Record<string, unknown>)[key] = value;
	}
}

function assignNumber<T extends keyof RouteTelemetryEvent>(target: RouteTelemetryEvent, key: T, value: RouteTelemetryEvent[T]): void {
	if (typeof value === "number" && Number.isFinite(value)) {
		(target as Record<string, unknown>)[key] = value;
	}
}
