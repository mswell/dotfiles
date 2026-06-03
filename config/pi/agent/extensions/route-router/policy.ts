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

function cheapContextRole(s: PromptSignals): ModelRole {
	return s.hasImages ? "geminiFlash" : "opencodeFast";
}

function openCodeChoice(s: PromptSignals, reason: string): RouteChoice {
	return {
		role: s.explicitOpenCodeFast && !s.explicitOpenCodeWork ? "opencodeFast" : "opencodeWork",
		thinking: s.critical || s.debug || s.securityHeavy ? "high" : "medium",
		confidence: 0.98,
		reason,
		explicit: true,
	};
}

function chooseCheap(input: RouteInput): RouteChoice {
	const s = extractSignals(input.prompt, input);
	if (s.explicitCodex) {
		return {
			role: "codexPlan",
			thinking: s.critical || s.debug || s.architecture ? "high" : "medium",
			confidence: 0.99,
			reason: "explicit GPT/Codex request in cheap mode",
			explicit: true,
		};
	}
	if (s.explicitOpenCode) {
		return openCodeChoice(s, "explicit OpenCode Go request in cheap mode");
	}
	if (s.explicitGeminiPro || s.explicitMaxReasoning) {
		return {
			role: "geminiPro",
			thinking: heavyThinking(s, "cheap"),
			confidence: 0.98,
			reason: "explicit Gemini Pro/deep reasoning request",
			explicit: true,
		};
	}
	if (s.explicitGeminiFlash || (s.explicitGemini && !s.explicitGeminiPro)) {
		return {
			role: "geminiFlash",
			thinking: s.securityHeavy || s.debug ? "medium" : simpleThinking(s),
			confidence: 0.96,
			reason: "explicit Gemini/Flash request",
			explicit: true,
		};
	}
	return {
		role: cheapContextRole(s),
		thinking: s.critical || s.securityHeavy || s.debug ? "medium" : simpleThinking(s),
		confidence: s.implementation || s.debug || s.securityHeavy ? 0.74 : 0.9,
		reason: s.hasImages
			? "cheap mode uses Gemini Flash when images are attached"
			: "cheap mode uses OpenCode Go fast models for low-cost triage/context",
		escalation: "Use dev/max or ask for GPT-5.5/Codex explicitly when planning or final validation matters.",
	};
}

function chooseDev(input: RouteInput): RouteChoice {
	const s = extractSignals(input.prompt, input);

	if (s.explicitCodex) {
		return {
			role: s.implementation || s.debug || s.pocOrScript ? "codexWork" : "codexPlan",
			thinking: s.critical || s.debug || s.architecture ? "high" : "medium",
			confidence: 0.99,
			reason: "explicit GPT-5.5/Codex request",
			explicit: true,
		};
	}
	if (s.explicitOpenCode) {
		return openCodeChoice(s, "explicit OpenCode Go request");
	}
	if (s.explicitGeminiPro || s.explicitMaxReasoning) {
		return {
			role: "geminiPro",
			thinking: heavyThinking(s, "dev"),
			confidence: 0.98,
			reason: "explicit Gemini Pro/deep reasoning request",
			explicit: true,
		};
	}
	if (s.explicitGeminiFlash || (s.explicitGemini && !s.explicitGeminiPro)) {
		return {
			role: "geminiFlash",
			thinking: s.securityHeavy || s.debug ? "medium" : simpleThinking(s),
			confidence: 0.96,
			reason: "explicit Gemini/Flash request",
			explicit: true,
		};
	}

	if (s.implementation || s.debug || s.pocOrScript || s.report || (input.recentToolCalls ?? 0) >= 6) {
		return {
			role: "opencodeWork",
			thinking: s.critical || s.debug || s.architecture || s.securityHeavy ? "high" : "medium",
			confidence: s.debug || s.hasCodeBlocks || s.hasFilePaths || (input.recentToolCalls ?? 0) >= 6 ? 0.94 : 0.9,
			reason: "implementation/debug/tool-heavy execution is routed to OpenCode Go executor models",
			escalation: "Ask for GPT-5.5/Codex explicitly for frontier planning or final adversarial review.",
		};
	}

	if (s.architecture || s.critical) {
		return {
			role: "codexPlan",
			thinking: heavyThinking(s, "dev"),
			confidence: 0.93,
			reason: "architecture/deep design is routed to GPT-5.5 planning/review",
			escalation: "Route to OpenCode Go when the plan turns into concrete edits/tests.",
		};
	}

	if (s.hasImages) {
		return {
			role: "geminiFlash",
			thinking: s.securityHeavy ? "high" : "medium",
			confidence: 0.92,
			reason: "image-bearing context routes to Gemini Flash vision fallback",
		};
	}

	if (s.largeContext || s.summarization || s.security) {
		return {
			role: "opencodeFast",
			thinking: s.securityHeavy ? "high" : "medium",
			confidence: s.largeContext ? 0.92 : 0.84,
			reason: "context building, summarization, or broad analysis uses OpenCode Go fast models",
		};
	}

	return {
		role: "opencodeFast",
		thinking: simpleThinking(s),
		confidence: 0.84,
		reason: "default dev route uses OpenCode Go fast models for low-friction work",
		escalation: "Planning escalates to GPT-5.5; implementation escalates to OpenCode Go executor models when code signals appear.",
	};
}

function chooseBugbounty(input: RouteInput): RouteChoice {
	const s = extractSignals(input.prompt, input);

	if (s.explicitCodex) {
		return {
			role: s.implementation || s.pocOrScript || s.debug ? "codexWork" : "codexPlan",
			thinking: s.critical || s.securityHeavy || s.debug ? "high" : "medium",
			confidence: 0.99,
			reason: "explicit GPT-5.5/Codex request for security work",
			explicit: true,
		};
	}
	if (s.explicitOpenCode) {
		return openCodeChoice(s, "explicit OpenCode Go request for security work");
	}
	if (s.explicitGeminiPro || s.explicitMaxReasoning) {
		return {
			role: "geminiPro",
			thinking: heavyThinking(s, "bugbounty"),
			confidence: 0.98,
			reason: "explicit Gemini Pro/deep security reasoning request",
			explicit: true,
		};
	}
	if (s.explicitGeminiFlash || (s.explicitGemini && !s.explicitGeminiPro)) {
		return {
			role: "geminiFlash",
			thinking: s.securityHeavy ? "medium" : simpleThinking(s),
			confidence: 0.96,
			reason: "explicit Gemini/Flash request",
			explicit: true,
		};
	}

	if (s.pocOrScript || s.implementation || s.debug || s.report) {
		return {
			role: "opencodeWork",
			thinking: s.securityHeavy || s.critical || s.debug ? "high" : "medium",
			confidence: 0.92,
			reason: "security PoC/script/code/report execution is routed to OpenCode Go executor models",
			escalation: "Use GPT-5.5/Codex for strategic exploitability review or final adversarial validation.",
		};
	}

	if (s.securityHeavy || s.critical || s.architecture) {
		return {
			role: "codexPlan",
			thinking: heavyThinking(s, "bugbounty"),
			confidence: 0.92,
			reason: "heavy exploitability/authz/business-logic reasoning routes to GPT-5.5 planning/review",
			escalation: "Use OpenCode Go when the next step is PoC code, patching, or report drafting.",
		};
	}

	if (s.hasImages) {
		return {
			role: "geminiFlash",
			thinking: s.security ? "medium" : simpleThinking(s),
			confidence: 0.9,
			reason: "image-bearing security context routes to Gemini Flash vision fallback",
		};
	}

	if (s.security || s.bugbounty || s.largeContext || s.summarization) {
		return {
			role: "opencodeFast",
			thinking: s.security ? "medium" : simpleThinking(s),
			confidence: s.bugbounty || s.largeContext ? 0.9 : 0.8,
			reason: "bug bounty mode uses OpenCode Go fast models for broad security context and triage",
			escalation: "Escalate to GPT-5.5 for deeper exploitability reasoning or OpenCode Go executor for PoC/code.",
		};
	}

	return {
		role: "opencodeFast",
		thinking: simpleThinking(s),
		confidence: 0.8,
		reason: "bug bounty profile default stays on OpenCode Go fast models until security/code signals appear",
	};
}

function chooseMax(input: RouteInput): RouteChoice {
	const s = extractSignals(input.prompt, input);

	if (s.explicitOpenCode) {
		return openCodeChoice(s, "explicit OpenCode Go request in max mode");
	}
	if (s.explicitCodex || s.explicitMaxReasoning || s.architecture || s.critical || s.securityHeavy) {
		return {
			role: s.implementation || s.debug || s.pocOrScript ? "codexWork" : "codexPlan",
			thinking: s.critical || s.explicitMaxReasoning ? "xhigh" : "high",
			confidence: s.explicitCodex || s.explicitMaxReasoning ? 0.99 : 0.94,
			reason: s.explicitCodex ? "explicit GPT-5.5/Codex request" : "max mode routes frontier planning/review to GPT-5.5",
			explicit: s.explicitCodex || s.explicitMaxReasoning,
		};
	}
	if (s.implementation || s.debug || s.pocOrScript || s.report) {
		return {
			role: "opencodeWork",
			thinking: "high",
			confidence: 0.92,
			reason: "max mode still uses OpenCode Go executor models for concrete code loops",
			escalation: "Ask for GPT-5.5/Codex explicitly for final frontier review.",
		};
	}
	if (s.explicitGeminiPro) {
		return {
			role: "geminiPro",
			thinking: "high",
			confidence: 0.99,
			reason: "explicit Gemini Pro request",
			explicit: true,
		};
	}
	if (s.hasImages || s.explicitGeminiFlash) {
		return {
			role: "geminiFlash",
			thinking: "medium",
			confidence: 0.95,
			reason: s.hasImages ? "image-bearing max-mode prompt uses Gemini Flash vision fallback" : "explicit Gemini Flash request in max mode",
			explicit: s.explicitGeminiFlash,
		};
	}
	return {
		role: "codexPlan",
		thinking: s.isAck || s.isSimple ? "medium" : "high",
		confidence: 0.9,
		reason: "max mode defaults to GPT-5.5 planning/review",
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
