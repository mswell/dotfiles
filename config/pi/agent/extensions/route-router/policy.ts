import { providerForRole, supportsRouteBase, SUPPORTED_ROUTE_BASE_DESCRIPTION } from "./model-catalog";
import { extractSignals, type PromptSignals } from "./signals";
import type { EffectiveRouteMode, ModelRole, RouteDecision, RouteInput, ThinkingLevel } from "./types";

interface RouteChoice {
	role: ModelRole;
	thinking: ThinkingLevel;
	confidence: number;
	reason: string;
	escalation?: string;
	explicit?: boolean;
}

function dormant(input: RouteInput, reason: string): RouteDecision {
	return {
		active: false,
		apply: false,
		mode: input.mode,
		confidence: 1,
		signals: [],
		reason,
		dormantReason: reason,
	};
}

function choiceToDecision(input: RouteInput, effectiveMode: EffectiveRouteMode, choice: RouteChoice, signals: string[]): RouteDecision {
	const manual = input.mode === "manual";
	return {
		active: true,
		apply: !manual,
		mode: input.mode,
		effectiveMode,
		targetRole: choice.role,
		targetProvider: providerForRole(choice.role),
		thinking: choice.thinking,
		confidence: choice.confidence,
		signals,
		reason: choice.reason,
		escalation: choice.escalation,
		explicit: choice.explicit,
	};
}

function simpleThinking(s: { isAck: boolean; isSimple: boolean; length: number }): ThinkingLevel {
	if (s.isAck || s.length < 30) return "low";
	if (s.isSimple || s.length < 120) return "low";
	return "medium";
}

function heavyThinking(s: { critical: boolean; explicitMaxReasoning: boolean }, mode: EffectiveRouteMode): ThinkingLevel {
	if (s.explicitMaxReasoning) return "xhigh";
	if (s.critical && mode === "max") return "xhigh";
	return "high";
}

function explicitChoice(s: PromptSignals, mode: EffectiveRouteMode): RouteChoice | undefined {
	if (s.explicitMaxReasoning) {
		return {
			role: "copilotOracle",
			thinking: "xhigh",
			confidence: 0.99,
			reason: "explicit maximum reasoning request routes to Copilot oracle",
			explicit: true,
		};
	}

	if (s.explicitCodex) {
		return {
			role: s.implementation || s.debug || s.pocOrScript ? "copilotWork" : "copilotOracle",
			thinking: s.critical || s.debug || s.architecture ? "high" : "medium",
			confidence: 0.99,
			reason: "explicit GPT/Codex request resolved inside GitHub Copilot provider",
			explicit: true,
		};
	}

	if (s.explicitGeminiFlash || (s.explicitGemini && !s.explicitGeminiPro)) {
		return {
			role: s.hasImages ? "copilotVision" : "copilotScout",
			thinking: s.securityHeavy || s.debug ? "medium" : simpleThinking(s),
			confidence: 0.96,
			reason: "explicit Gemini/Flash request resolved inside GitHub Copilot provider",
			explicit: true,
		};
	}

	if (s.explicitGeminiPro) {
		return {
			role: "copilotOracle",
			thinking: heavyThinking(s, mode),
			confidence: 0.98,
			reason: "explicit Gemini Pro request mapped to Copilot oracle because Gemini 3.1 Pro is disabled",
			explicit: true,
		};
	}

	if (s.explicitOpenCode) {
		return {
			role: s.explicitOpenCodeFast ? "copilotFast" : s.debug ? "copilotDebug" : "copilotWork",
			thinking: s.critical || s.debug || s.securityHeavy ? "high" : "medium",
			confidence: 0.98,
			reason: "explicit executor/OpenCode-style request resolved inside GitHub Copilot provider",
			explicit: true,
		};
	}

	return undefined;
}

function chooseCheap(input: RouteInput): RouteChoice {
	const s = extractSignals(input.prompt, input);
	const explicit = explicitChoice(s, "cheap");
	if (explicit) return explicit;

	if (s.hasImages) {
		return {
			role: "copilotVision",
			thinking: "medium",
			confidence: 0.94,
			reason: "cheap mode uses Copilot vision fallback when images are attached",
		};
	}

	return {
		role: s.largeContext || s.summarization || s.security ? "copilotScout" : "copilotFast",
		thinking: s.critical || s.securityHeavy || s.debug ? "medium" : simpleThinking(s),
		confidence: s.implementation || s.debug || s.securityHeavy ? 0.74 : 0.9,
		reason: "cheap mode stays inside GitHub Copilot lightweight/scout models",
		escalation: "Use dev/max or ask for GPT/Copilot oracle explicitly when planning or final validation matters.",
	};
}

function chooseDev(input: RouteInput): RouteChoice {
	const s = extractSignals(input.prompt, input);
	const explicit = explicitChoice(s, "dev");
	if (explicit) return explicit;

	if (s.hasImages) {
		return {
			role: "copilotVision",
			thinking: s.securityHeavy ? "high" : "medium",
			confidence: 0.92,
			reason: "image-bearing context routes to Copilot vision fallback",
		};
	}

	if (s.debug) {
		return {
			role: "copilotDebug",
			thinking: s.critical || s.securityHeavy ? "high" : "medium",
			confidence: s.hasCodeBlocks || s.hasFilePaths || input.recentToolCalls ? 0.94 : 0.9,
			reason: "debug/test-failure/regression work routes to Copilot debug models",
			escalation: "Use Copilot oracle for architectural root-cause review if the patch loop stalls.",
		};
	}

	if (s.implementation || s.pocOrScript || s.report || (input.recentToolCalls ?? 0) >= 6) {
		return {
			role: s.report ? "copilotReview" : "copilotWork",
			thinking: s.critical || s.architecture || s.securityHeavy ? "high" : "medium",
			confidence: s.hasCodeBlocks || s.hasFilePaths || (input.recentToolCalls ?? 0) >= 6 ? 0.94 : 0.9,
			reason: "implementation/tool-heavy execution routes to Copilot executor models",
			escalation: "Use Copilot oracle explicitly for frontier planning or final adversarial review.",
		};
	}

	if (s.architecture || s.critical || s.securityHeavy) {
		return {
			role: "copilotOracle",
			thinking: heavyThinking(s, "dev"),
			confidence: 0.93,
			reason: "architecture/deep/security-heavy reasoning routes to Copilot oracle models",
			escalation: "Route to Copilot work/debug when the plan turns into concrete edits/tests.",
		};
	}

	if (s.largeContext || s.summarization || s.security) {
		return {
			role: "copilotScout",
			thinking: s.security ? "medium" : simpleThinking(s),
			confidence: s.largeContext ? 0.92 : 0.84,
			reason: "context building, summarization, and broad triage routes to Copilot scout models",
		};
	}

	return {
		role: "copilotFast",
		thinking: simpleThinking(s),
		confidence: 0.84,
		reason: "default dev route uses GitHub Copilot lightweight models for low-friction work",
		escalation: "Planning escalates to Copilot oracle; implementation escalates to Copilot work/debug when code signals appear.",
	};
}

function chooseBugbounty(input: RouteInput): RouteChoice {
	const s = extractSignals(input.prompt, input);
	const explicit = explicitChoice(s, "bugbounty");
	if (explicit) return explicit;

	if (s.hasImages) {
		return {
			role: "copilotVision",
			thinking: s.security ? "medium" : simpleThinking(s),
			confidence: 0.9,
			reason: "image-bearing security context routes to Copilot vision fallback",
		};
	}

	if (s.pocOrScript || s.implementation || s.debug || s.report) {
		return {
			role: s.debug ? "copilotDebug" : s.report ? "copilotReview" : "copilotWork",
			thinking: s.securityHeavy || s.critical || s.debug ? "high" : "medium",
			confidence: 0.92,
			reason: "security PoC/script/code/report execution routes to Copilot executor/review models",
			escalation: "Use Copilot oracle for strategic exploitability review or final adversarial validation.",
		};
	}

	if (s.securityHeavy || s.critical || s.architecture) {
		return {
			role: "copilotOracle",
			thinking: heavyThinking(s, "bugbounty"),
			confidence: 0.92,
			reason: "heavy exploitability/authz/business-logic reasoning routes to Copilot oracle",
			escalation: "Use Copilot work/debug when the next step is PoC code, patching, or report drafting.",
		};
	}

	if (s.security || s.bugbounty || s.largeContext || s.summarization) {
		return {
			role: "copilotScout",
			thinking: s.security ? "medium" : simpleThinking(s),
			confidence: s.bugbounty || s.largeContext ? 0.9 : 0.8,
			reason: "bug bounty mode uses Copilot scout models for broad security context and triage",
			escalation: "Escalate to Copilot oracle for deeper exploitability reasoning or Copilot work for PoC/code.",
		};
	}

	return {
		role: "copilotFast",
		thinking: simpleThinking(s),
		confidence: 0.8,
		reason: "bug bounty profile default stays on Copilot lightweight models until security/code signals appear",
	};
}

function chooseMax(input: RouteInput): RouteChoice {
	const s = extractSignals(input.prompt, input);
	const explicit = explicitChoice(s, "max");
	if (explicit) return explicit;

	if (s.hasImages) {
		return {
			role: "copilotVision",
			thinking: "medium",
			confidence: 0.95,
			reason: "image-bearing max-mode prompt uses Copilot vision fallback",
		};
	}

	if (s.architecture || s.critical || s.securityHeavy) {
		return {
			role: "copilotOracle",
			thinking: s.critical ? "xhigh" : "high",
			confidence: 0.94,
			reason: "max mode routes frontier planning/review to Copilot oracle models",
		};
	}

	if (s.debug) {
		return {
			role: "copilotDebug",
			thinking: "high",
			confidence: 0.93,
			reason: "max mode routes debugging loops to Copilot debug models",
			escalation: "Ask for Copilot oracle explicitly for final frontier review.",
		};
	}

	if (s.implementation || s.pocOrScript || s.report) {
		return {
			role: s.report ? "copilotReview" : "copilotWork",
			thinking: "high",
			confidence: 0.92,
			reason: "max mode still uses Copilot executor/review models for concrete code loops",
			escalation: "Ask for Copilot oracle explicitly for final frontier review.",
		};
	}

	return {
		role: "copilotOracle",
		thinking: s.isAck || s.isSimple ? "medium" : "high",
		confidence: 0.9,
		reason: "max mode defaults to Copilot oracle planning/review",
	};
}

function chooseForMode(input: RouteInput, mode: EffectiveRouteMode): RouteChoice {
	switch (mode) {
		case "cheap":
			return chooseCheap(input);
		case "dev":
			return chooseDev(input);
		case "bugbounty":
			return chooseBugbounty(input);
		case "max":
			return chooseMax(input);
	}
}

export function decideRoute(input: RouteInput): RouteDecision {
	if (input.mode === "off") {
		return dormant(input, "router mode is off");
	}

	if (!supportsRouteBase(input.currentProvider, input.currentModelId)) {
		return dormant(input, `current model is not ${SUPPORTED_ROUTE_BASE_DESCRIPTION}`);
	}

	const effectiveMode: EffectiveRouteMode = input.mode === "manual" ? "dev" : input.mode;
	const signals = extractSignals(input.prompt, input).labels;
	const choice = chooseForMode(input, effectiveMode);
	return choiceToDecision(input, effectiveMode, choice, signals);
}
