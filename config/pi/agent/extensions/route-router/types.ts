export const ROUTE_MODES = ["cheap", "dev", "bugbounty", "max", "manual", "off"] as const;

export type RouteMode = (typeof ROUTE_MODES)[number];
export type EffectiveRouteMode = Exclude<RouteMode, "manual" | "off">;
export type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
export type SupportedProvider = "github-copilot";
export type RiskTier = "trivial" | "lite" | "full" | "critical";
export type ModelRole =
	| "copilotFast"
	| "copilotScout"
	| "copilotWork"
	| "copilotDebug"
	| "copilotReview"
	| "copilotOracle"
	| "copilotVision";

export interface RouteConfig {
	mode: RouteMode;
	switchConfidenceThreshold: number;
	familySwitchCooldownPrompts: number;
	showStatus: boolean;
}

export interface LastAppliedRoute {
	provider: SupportedProvider;
	modelId: string;
	role: ModelRole;
	thinking: ThinkingLevel;
	promptIndex: number;
	familySwitched: boolean;
}

export interface RouteInput {
	mode: RouteMode;
	currentProvider?: string;
	currentModelId?: string;
	prompt: string;
	roughContextTokens?: number;
	hasImages?: boolean;
	recentToolCalls?: number;
}

export interface RouteDecision {
	active: boolean;
	apply: boolean;
	mode: RouteMode;
	effectiveMode?: EffectiveRouteMode;
	targetRole?: ModelRole;
	targetProvider?: SupportedProvider;
	thinking?: ThinkingLevel;
	riskTier?: RiskTier;
	confidence: number;
	signals: string[];
	reason: string;
	escalation?: string;
	explicit?: boolean;
	dormantReason?: string;
	antiChurn?: boolean;
	resolvedModel?: string;
	appliedModel?: string;
	appliedThinking?: ThinkingLevel;
	applied?: boolean;
	applyNote?: string;
}

export function isRouteMode(value: string): value is RouteMode {
	return (ROUTE_MODES as readonly string[]).includes(value);
}
