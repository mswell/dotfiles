import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

type TimerHandle = ReturnType<typeof setTimeout>;

interface LoopState {
	prompt: string;
	intervalMs: number;
	startedAt: number;
	nextAt: number | null;
	lastAt: number | null;
	endAt: number | null;
	maxCycles: number | null;
	fired: number;
	skipped: number;
	running: boolean;
	skipBusy: boolean;
	queueBusy: boolean;
}

const USAGE = `Usage:
  /loop <interval> (--for <duration> | --cycles <n>) [--now] [--skip-busy|--queue-busy] -- <prompt>
  /loop-status
  /loop-stop

Examples:
  /loop 15m --for 8h --now -- autopilot max 1 cycles persistence normal creativity normal max 2 agents
  /loop 10m --cycles 30 -- autopilot max 1 cycles persistence high creativity high max 2 agents
  /loop 20m --for 6h --now -- autopilot max 1 cycles, não use ShadowClone; apenas use ccSurface.md/ccLeads.md atuais

Duration units: ms, s, m, h, d.`;

function parseDuration(input: string): number | null {
	const m = input.trim().match(/^(\d+(?:\.\d+)?)(ms|s|m|h|d)$/i);
	if (!m) return null;
	const value = Number(m[1]);
	if (!Number.isFinite(value) || value <= 0) return null;
	const unit = m[2].toLowerCase();
	const mult = unit === "ms" ? 1 : unit === "s" ? 1000 : unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;
	return Math.round(value * mult);
}

function formatDuration(ms: number): string {
	if (ms < 0) ms = 0;
	const totalSeconds = Math.floor(ms / 1000);
	const days = Math.floor(totalSeconds / 86_400);
	const hours = Math.floor((totalSeconds % 86_400) / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	const parts: string[] = [];
	if (days) parts.push(`${days}d`);
	if (hours) parts.push(`${hours}h`);
	if (minutes) parts.push(`${minutes}m`);
	if (seconds || parts.length === 0) parts.push(`${seconds}s`);
	return parts.join(" ");
}

function formatTime(ts: number | null): string {
	if (!ts) return "never";
	return new Date(ts).toLocaleTimeString();
}

function tokenize(input: string): string[] {
	const tokens: string[] = [];
	let current = "";
	let quote: '"' | "'" | null = null;
	let escape = false;

	for (const ch of input) {
		if (escape) {
			current += ch;
			escape = false;
			continue;
		}
		if (ch === "\\") {
			escape = true;
			continue;
		}
		if (quote) {
			if (ch === quote) quote = null;
			else current += ch;
			continue;
		}
		if (ch === '"' || ch === "'") {
			quote = ch;
			continue;
		}
		if (/\s/.test(ch)) {
			if (current) {
				tokens.push(current);
				current = "";
			}
			continue;
		}
		current += ch;
	}
	if (current) tokens.push(current);
	return tokens;
}

interface ParsedLoopArgs {
	intervalMs: number;
	durationMs: number | null;
	maxCycles: number | null;
	prompt: string;
	now: boolean;
	skipBusy: boolean;
	queueBusy: boolean;
}

function parseLoopArgs(args: string): ParsedLoopArgs | { error: string } {
	const raw = args.trim();
	if (!raw || raw === "help" || raw === "--help" || raw === "-h") {
		return { error: USAGE };
	}

	const delimiter = raw.indexOf(" -- ");
	const head = delimiter >= 0 ? raw.slice(0, delimiter).trim() : raw;
	const explicitPrompt = delimiter >= 0 ? raw.slice(delimiter + 4).trim() : "";
	const tokens = tokenize(head);

	if (tokens.length === 0) return { error: USAGE };

	const intervalMs = parseDuration(tokens[0]);
	if (!intervalMs) return { error: `Invalid interval: ${tokens[0]}\n\n${USAGE}` };

	let durationMs: number | null = null;
	let maxCycles: number | null = null;
	let now = false;
	let skipBusy = true;
	let queueBusy = false;
	const promptTokens: string[] = [];

	for (let i = 1; i < tokens.length; i++) {
		const t = tokens[i];
		if (t === "--for") {
			const v = tokens[++i];
			if (!v) return { error: "Missing value for --for" };
			durationMs = parseDuration(v);
			if (!durationMs) return { error: `Invalid --for duration: ${v}` };
		} else if (t.startsWith("--for=")) {
			const v = t.slice("--for=".length);
			durationMs = parseDuration(v);
			if (!durationMs) return { error: `Invalid --for duration: ${v}` };
		} else if (t === "--cycles") {
			const v = tokens[++i];
			if (!v || !/^\d+$/.test(v)) return { error: "--cycles requires a positive integer" };
			maxCycles = Number(v);
		} else if (t.startsWith("--cycles=")) {
			const v = t.slice("--cycles=".length);
			if (!/^\d+$/.test(v)) return { error: "--cycles requires a positive integer" };
			maxCycles = Number(v);
		} else if (t === "--now") {
			now = true;
		} else if (t === "--skip-busy") {
			skipBusy = true;
			queueBusy = false;
		} else if (t === "--queue-busy") {
			queueBusy = true;
			skipBusy = false;
		} else {
			promptTokens.push(t);
		}
	}

	if (maxCycles !== null && maxCycles <= 0) return { error: "--cycles must be > 0" };
	if (durationMs === null && maxCycles === null) {
		return { error: `Safety: provide --for <duration> or --cycles <n> so the loop cannot run forever.\n\n${USAGE}` };
	}

	const prompt = explicitPrompt || promptTokens.join(" ").trim();
	if (!prompt) return { error: `Missing prompt after --\n\n${USAGE}` };

	return { intervalMs, durationMs, maxCycles, prompt, now, skipBusy, queueBusy };
}

function describeState(state: LoopState): string {
	const now = Date.now();
	const elapsed = formatDuration(now - state.startedAt);
	const remaining = state.endAt ? formatDuration(state.endAt - now) : "n/a";
	const next = state.nextAt ? `${formatTime(state.nextAt)} (${formatDuration(state.nextAt - now)})` : "not scheduled";
	return [
		`loop: ${state.running ? "running" : "stopped"}`,
		`interval: ${formatDuration(state.intervalMs)}`,
		`elapsed: ${elapsed}`,
		`remaining: ${remaining}`,
		`cycles sent: ${state.fired}${state.maxCycles ? `/${state.maxCycles}` : ""}`,
		`skipped busy: ${state.skipped}`,
		`last fire: ${formatTime(state.lastAt)}`,
		`next fire: ${next}`,
		`busy behavior: ${state.skipBusy ? "skip" : state.queueBusy ? "queue follow-up" : "send"}`,
		`prompt: ${state.prompt}`,
	].join("\n");
}

export default function loopExtension(pi: ExtensionAPI) {
	let timer: TimerHandle | null = null;
	let state: LoopState | null = null;
	let agentBusy = false;
	let ui: any = null;

	function clearTimer() {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
	}

	function setLoopStatus(text?: string) {
		try {
			ui?.setStatus?.("loop", text || "");
		} catch {
			// best-effort UI only
		}
	}

	function notify(message: string, level: "info" | "warning" | "error" = "info") {
		try {
			ui?.notify?.(message, level);
		} catch {
			// best-effort UI only
		}
	}

	function stop(reason: string) {
		clearTimer();
		if (state) state.running = false;
		setLoopStatus("");
		notify(`Loop stopped: ${reason}`, "info");
	}

	function shouldStopBeforeFire(): string | null {
		if (!state) return "no loop state";
		const now = Date.now();
		if (state.endAt && now > state.endAt) return "time budget reached";
		if (state.maxCycles !== null && state.fired >= state.maxCycles) return "cycle budget reached";
		return null;
	}

	function scheduleNext() {
		if (!state?.running) return;
		clearTimer();

		const reason = shouldStopBeforeFire();
		if (reason) {
			stop(reason);
			return;
		}

		const now = Date.now();
		const nextAt = now + state.intervalMs;
		if (state.endAt && nextAt > state.endAt && state.fired > 0) {
			stop("next fire would exceed time budget");
			return;
		}

		state.nextAt = nextAt;
		setLoopStatus(`loop next ${formatDuration(nextAt - now)} (${state.fired}${state.maxCycles ? `/${state.maxCycles}` : ""})`);
		timer = setTimeout(() => void fire("timer"), state.intervalMs);
	}

	async function fire(source: "now" | "timer") {
		if (!state?.running) return;

		const stopReason = shouldStopBeforeFire();
		if (stopReason) {
			stop(stopReason);
			return;
		}

		const prompt = state.prompt;
		state.nextAt = null;

		if (agentBusy && state.skipBusy) {
			state.skipped += 1;
			notify(`Loop tick skipped because agent is busy (${source})`, "warning");
			scheduleNext();
			return;
		}

		try {
			if (agentBusy || state.queueBusy) {
				pi.sendUserMessage(prompt, { deliverAs: "followUp" });
			} else {
				pi.sendUserMessage(prompt);
			}
			state.fired += 1;
			state.lastAt = Date.now();
			notify(`Loop fired ${state.fired}${state.maxCycles ? `/${state.maxCycles}` : ""}: ${prompt}`, "info");
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			if (state.skipBusy && /stream|busy|idle/i.test(msg)) {
				state.skipped += 1;
				notify(`Loop tick skipped: ${msg}`, "warning");
			} else {
				stop(`send failed: ${msg}`);
				return;
			}
		}

		if (!state.running) return;
		if (state.maxCycles !== null && state.fired >= state.maxCycles) {
			stop("cycle budget reached");
			return;
		}
		scheduleNext();
	}

	pi.on("session_start", async (_event, ctx) => {
		ui = ctx.ui;
		if (state?.running) setLoopStatus(`loop running (${state.fired}${state.maxCycles ? `/${state.maxCycles}` : ""})`);
	});

	pi.on("agent_start", () => {
		agentBusy = true;
	});

	pi.on("agent_end", () => {
		agentBusy = false;
	});

	pi.on("session_shutdown", () => {
		clearTimer();
		state = null;
		agentBusy = false;
		setLoopStatus("");
	});

	pi.registerCommand("loop", {
		description: "Repeat a prompt on an interval with a required time/cycle budget",
		getArgumentCompletions: (prefix) => {
			const items = ["15m --for 8h --now -- autopilot max 1 cycles", "10m --cycles 30 -- autopilot max 1 cycles", "--help"];
			const filtered = items.filter((item) => item.startsWith(prefix));
			return filtered.length ? filtered.map((value) => ({ value, label: value })) : null;
		},
		handler: async (args, ctx) => {
			ui = ctx.ui;
			const parsed = parseLoopArgs(args);
			if ("error" in parsed) {
				ctx.ui.notify(parsed.error, parsed.error === USAGE ? "info" : "warning");
				return;
			}

			if (state?.running) {
				const replace = await ctx.ui.confirm("Loop already running", `${describeState(state)}\n\nReplace it?`);
				if (!replace) return;
				clearTimer();
			}

			const now = Date.now();
			state = {
				prompt: parsed.prompt,
				intervalMs: parsed.intervalMs,
				startedAt: now,
				nextAt: null,
				lastAt: null,
				endAt: parsed.durationMs ? now + parsed.durationMs : null,
				maxCycles: parsed.maxCycles,
				fired: 0,
				skipped: 0,
				running: true,
				skipBusy: parsed.skipBusy,
				queueBusy: parsed.queueBusy,
			};

			ctx.ui.notify(`Loop started\n${describeState(state)}`, "info");
			if (parsed.now) void fire("now");
			else scheduleNext();
		},
	});

	pi.registerCommand("loop-status", {
		description: "Show current /loop status",
		handler: async (_args, ctx) => {
			ui = ctx.ui;
			ctx.ui.notify(state?.running ? describeState(state) : "No loop running", "info");
		},
	});

	pi.registerCommand("loop-stop", {
		description: "Stop the current /loop",
		handler: async (_args, ctx) => {
			ui = ctx.ui;
			if (!state?.running) {
				ctx.ui.notify("No loop running", "info");
				return;
			}
			stop("user requested /loop-stop");
		},
	});
}
