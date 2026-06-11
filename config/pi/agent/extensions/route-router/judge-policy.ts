import type { RiskTier } from "./types";

export type JudgeWorkType = "code" | "docs" | "typo" | "security" | "unknown";
export type FanOutLevel = "none" | "single-reviewer" | "multi-reviewer";
export type JudgeAgentName = "reviewer" | "oracle" | "code-quality" | "docs" | "security";

export interface JudgePolicyInput {
	riskTier: RiskTier;
	workType?: JudgeWorkType;
	availableAgents?: readonly string[];
	explicitJudgeRequest?: boolean;
}

export interface JudgeParticipant {
	agent: JudgeAgentName;
	required: boolean;
	focus: string;
}

export interface JudgePolicyDecision {
	riskTier: RiskTier;
	workType: JudgeWorkType;
	fanOut: FanOutLevel;
	finalJudgeRequired: boolean;
	participants: JudgeParticipant[];
	manualFallbackRequired: boolean;
	manualFallbackReason?: string;
	dedupeBlockers: true;
	ignoreNits: true;
	reason: string;
}

export interface JudgeDisclosureInput {
	ran: boolean;
	blockers?: number;
	reason?: string;
}

const DEFAULT_AVAILABLE_AGENTS = new Set<string>(["reviewer", "oracle"]);

export function decideJudgePolicy(input: JudgePolicyInput): JudgePolicyDecision {
	const workType = input.workType ?? "unknown";
	const availableAgents = new Set(input.availableAgents ?? DEFAULT_AVAILABLE_AGENTS);
	const docsOrTypo = workType === "docs" || workType === "typo";
	const participants = participantsFor(input.riskTier, workType, Boolean(input.explicitJudgeRequest));
	const unavailableRequired = participants.filter((participant) => participant.required && !availableAgents.has(participant.agent));
	const finalJudgeRequired = input.riskTier === "full" || input.riskTier === "critical";

	if (docsOrTypo && !input.explicitJudgeRequest && input.riskTier !== "critical") {
		return decision({
			riskTier: input.riskTier,
			workType,
			fanOut: "none",
			finalJudgeRequired: false,
			participants: [],
			manualFallbackRequired: false,
			reason: "docs/typo work does not fan out by default; local deterministic checks are preferred unless explicitly escalated",
		});
	}

	return decision({
		riskTier: input.riskTier,
		workType,
		fanOut: fanOutFor(input.riskTier, participants),
		finalJudgeRequired,
		participants,
		manualFallbackRequired: unavailableRequired.length > 0,
		manualFallbackReason: unavailableRequired.length > 0
			? `Required judge participant unavailable: ${unavailableRequired.map((participant) => participant.agent).join(", ")}`
			: undefined,
		reason: reasonFor(input.riskTier, workType),
	});
}

export function formatJudgeDisclosure(policy: JudgePolicyDecision, input: JudgeDisclosureInput): string {
	if (input.ran) {
		const blockerText = input.blockers === undefined ? "blockers not counted" : `${input.blockers} blocker(s)`;
		return `Judge: ran ${policy.fanOut} policy for ${policy.riskTier} risk; ${blockerText}.`;
	}
	if (policy.manualFallbackRequired) {
		return `Judge: not run automatically; manual fallback required (${policy.manualFallbackReason}).`;
	}
	if (policy.finalJudgeRequired) {
		return `Judge: required by ${policy.riskTier} policy but not run${input.reason ? `: ${input.reason}` : "."}`;
	}
	return `Judge: not run; ${input.reason ?? policy.reason}.`;
}

export function summarizeJudgeInstructions(policy: JudgePolicyDecision): string[] {
	const instructions = [
		"Deduplicate repeated findings before reporting.",
		"Report concrete blockers only; ignore nits, style preferences, and theoretical risks without evidence.",
		"Prefer staged context paths over duplicating large context.",
	];
	if (policy.manualFallbackRequired) {
		instructions.push(`Use manual fallback: ${policy.manualFallbackReason}.`);
	}
	return instructions;
}

function participantsFor(riskTier: RiskTier, workType: JudgeWorkType, explicitJudgeRequest: boolean): JudgeParticipant[] {
	switch (riskTier) {
		case "trivial":
			return explicitJudgeRequest ? [{ agent: "reviewer", required: false, focus: "optional sanity check for explicitly requested trivial review" }] : [];
		case "lite":
			return [{ agent: "reviewer", required: false, focus: "optional single-pass review for concrete blockers" }];
		case "full":
			return [
				{ agent: "reviewer", required: true, focus: "final blocker-only review" },
				{ agent: "code-quality", required: false, focus: "code-quality specialist if available and code changed" },
				{ agent: "docs", required: false, focus: "docs specialist if public behavior or docs changed" },
			];
		case "critical": {
			const participants: JudgeParticipant[] = [
				{ agent: "oracle", required: true, focus: "frontier consistency and risk judge" },
				{ agent: "reviewer", required: true, focus: "final blocker-only review" },
			];
			participants.push(workType === "security"
				? { agent: "security", required: true, focus: "security specialist for exploitability, sensitive data, and impact" }
				: { agent: "code-quality", required: true, focus: "specialist relevant to critical code path" });
			return participants;
		}
	}
}

function fanOutFor(riskTier: RiskTier, participants: JudgeParticipant[]): FanOutLevel {
	if (riskTier === "trivial" || participants.length === 0) return "none";
	if (riskTier === "lite") return "single-reviewer";
	return "multi-reviewer";
}

function reasonFor(riskTier: RiskTier, workType: JudgeWorkType): string {
	switch (riskTier) {
		case "trivial":
			return "trivial risk tier avoids subagents to preserve tokenomics";
		case "lite":
			return "lite risk tier allows one optional reviewer but avoids broad fan-out";
		case "full":
			return "full risk tier requires final reviewer and may use optional code/docs specialists";
		case "critical":
			return workType === "security"
				? "critical security work requires oracle, reviewer, and security specialist"
				: "critical work requires oracle, reviewer, and a relevant specialist";
	}
}

function decision(input: Omit<JudgePolicyDecision, "dedupeBlockers" | "ignoreNits">): JudgePolicyDecision {
	return {
		...input,
		dedupeBlockers: true,
		ignoreNits: true,
	};
}
