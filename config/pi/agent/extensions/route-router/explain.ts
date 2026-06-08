import { MODEL_CATALOG, shortModel, supportsRouteBase, SUPPORTED_ROUTE_BASE_DESCRIPTION } from "./model-catalog";
import type { RouteConfig, RouteDecision } from "./types";

export interface RuntimeStatusInput {
	config: RouteConfig;
	currentProvider?: string;
	currentModelId?: string;
	currentThinking?: string;
	lastDecision?: RouteDecision;
	recentToolCalls: number;
	promptCounter: number;
	configPath: string;
}

function fmt(value: string | undefined): string {
	return value && value.length > 0 ? value : "—";
}

function targetText(decision: RouteDecision): string {
	if (!decision.targetRole) return "—";
	const catalog = MODEL_CATALOG[decision.targetRole];
	const resolved = decision.resolvedModel ?? decision.appliedModel;
	const modelText = resolved?.includes("/") ? resolved : `${catalog.provider}/${resolved ?? catalog.fallbacks[0]}`;
	return `${modelText} (${catalog.label})`;
}

export function formatStatus(input: RuntimeStatusInput): string {
	const supported = supportsRouteBase(input.currentProvider, input.currentModelId);
	const current = input.currentProvider && input.currentModelId
		? `${input.currentProvider}/${input.currentModelId}`
		: "none";

	let out = "Route Router\n";
	out += `  Mode: ${input.config.mode}\n`;
	out += `  Current: ${current}${supported ? " ✓" : " (dormant)"}\n`;
	out += `  Thinking: ${fmt(input.currentThinking)}\n`;
	out += `  Status: ${input.config.mode === "off" ? "off" : supported ? "active-capable" : "dormant"}\n`;
	out += `  Recent tool calls: ${input.recentToolCalls}\n`;
	out += `  Prompt counter: ${input.promptCounter}\n`;
	out += `  Config: ${input.configPath}\n`;

	if (!supported && input.config.mode !== "off") {
		out += "\n";
		out += `  Dormant reason: current model is not ${SUPPORTED_ROUTE_BASE_DESCRIPTION}\n`;
	}

	if (input.lastDecision) {
		out += "\n";
		out += "  Last decision:\n";
		out += `    Active: ${input.lastDecision.active}\n`;
		out += `    Apply: ${input.lastDecision.apply}\n`;
		out += `    Target: ${targetText(input.lastDecision)}\n`;
		out += `    Thinking: ${fmt(input.lastDecision.thinking)}\n`;
		out += `    Confidence: ${input.lastDecision.confidence.toFixed(2)}\n`;
		out += `    Reason: ${input.lastDecision.reason}\n`;
		if (input.lastDecision.applyNote) out += `    Note: ${input.lastDecision.applyNote}\n`;
	}

	out += "\n";
	out += "  Commands: /route | /route mode [cheap|dev|bugbounty|max|manual|off] | /route why | /route models | /route health";
	return out;
}

export function formatWhy(decision: RouteDecision | undefined, input: RuntimeStatusInput): string {
	if (!decision) {
		if (!supportsRouteBase(input.currentProvider, input.currentModelId)) {
			return `Route Router: dormant\nReason: current model is not ${SUPPORTED_ROUTE_BASE_DESCRIPTION}`;
		}
		return "Route Router: no decision yet in this session.";
	}

	let out = "Route decision\n";
	out += `  Mode: ${decision.mode}`;
	if (decision.effectiveMode && decision.effectiveMode !== decision.mode) out += ` (profile: ${decision.effectiveMode})`;
	out += "\n";
	out += `  Active: ${decision.active}\n`;
	if (decision.dormantReason) out += `  Dormant reason: ${decision.dormantReason}\n`;
	out += `  Apply: ${decision.apply}\n`;
	out += `  Target: ${targetText(decision)}\n`;
	out += `  Thinking: ${fmt(decision.thinking)}\n`;
	out += `  Confidence: ${decision.confidence.toFixed(2)}\n`;
	out += `  Reason: ${decision.reason}\n`;
	if (decision.escalation) out += `  Escalation: ${decision.escalation}\n`;
	if (decision.signals.length > 0) out += `  Signals: ${decision.signals.join(", ")}\n`;
	if (decision.antiChurn) out += "  Anti-churn: stayed on current provider/model; adjusted thinking only.\n";
	if (decision.resolvedModel) out += `  Resolved model: ${decision.targetProvider}/${decision.resolvedModel}\n`;
	if (decision.appliedModel) out += `  Applied model: ${decision.appliedModel}\n`;
	if (decision.appliedThinking) out += `  Applied thinking: ${decision.appliedThinking}\n`;
	if (decision.applyNote) out += `  Note: ${decision.applyNote}\n`;
	return out.trimEnd();
}

export function statusChip(decision: RouteDecision | undefined, currentProvider: string, currentModelId: string): string {
	if (!decision?.targetRole) return "route:auto";
	const role = MODEL_CATALOG[decision.targetRole];
	const model = decision.appliedModel?.split("/").at(-1) ?? decision.resolvedModel ?? currentModelId;
	const short = shortModel(role.provider, model);
	const t = decision.appliedThinking ?? decision.thinking ?? "?";
	return `route→${short}:${t}`;
}
