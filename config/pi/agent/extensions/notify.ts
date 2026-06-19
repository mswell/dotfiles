/**
 * Desktop Notification Extension
 *
 * Sends a native desktop notification when the agent finishes and is waiting for input.
 *
 * Backends:
 * - notify-send: good for Hyprland/Sway/etc. when mako, dunst, swaync, etc. is running
 * - kitty OSC 99: native Kitty notification protocol
 * - OSC 777: Ghostty, iTerm2, WezTerm, rxvt-unicode
 *
 * Override with PI_NOTIFY_BACKEND=auto|notify-send|kitty|osc777|off.
 */

import { spawn } from "node:child_process";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Markdown, type MarkdownTheme } from "@earendil-works/pi-tui";

type Backend = "auto" | "notify-send" | "kitty" | "osc777" | "off";

const fallbackBackend = (): "kitty" | "osc777" => (isKitty() ? "kitty" : "osc777");

const getBackend = (): Backend => {
	const value = process.env.PI_NOTIFY_BACKEND?.trim().toLowerCase();
	if (value === "notify-send" || value === "kitty" || value === "osc777" || value === "off" || value === "auto") {
		return value;
	}
	return "auto";
};

const isKitty = (): boolean =>
	process.env.TERM === "xterm-kitty" || Boolean(process.env.KITTY_WINDOW_ID || process.env.KITTY_PID);

const isHyprland = (): boolean =>
	Boolean(process.env.HYPRLAND_INSTANCE_SIGNATURE) || process.env.XDG_CURRENT_DESKTOP?.toLowerCase().includes("hyprland") === true;

const isWayland = (): boolean => Boolean(process.env.WAYLAND_DISPLAY);

/**
 * OSC payloads must not contain terminal control characters.
 */
const stripControlChars = (text: string): string =>
	text.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ").replace(/\s+/g, " ").trim();

const oscWrite = (sequence: string): void => {
	if (!process.stdout.isTTY) {
		return;
	}
	process.stdout.write(sequence);
};

/**
 * Ghostty/iTerm2/WezTerm/rxvt-unicode: OSC 777 format: ESC ] 777 ; notify ; title ; body BEL
 */
const notifyOsc777 = (title: string, body: string): void => {
	oscWrite(`\x1b]777;notify;${stripControlChars(title)};${stripControlChars(body)}\x07`);
};

/**
 * Kitty: OSC 99 format. Send title first with d=0, then body with d=1 to display.
 */
const notifyKitty = (title: string, body: string): void => {
	const id = "pi-agent";
	oscWrite(`\x1b]99;i=${id}:d=0:p=title;${stripControlChars(title)}\x1b\\`);
	oscWrite(`\x1b]99;i=${id}:d=1:p=body;${stripControlChars(body)}\x1b\\`);
};

/**
 * Hyprland does not provide notifications itself; notify-send talks to the running
 * notification daemon (mako, dunst, swaync, etc.). If the command is unavailable or
 * fails, call fallback.
 */
const notifySend = (title: string, body: string, fallback: () => void): void => {
	let fellBack = false;
	const runFallback = () => {
		if (fellBack) return;
		fellBack = true;
		fallback();
	};

	try {
		const child = spawn(
			"notify-send",
			["--app-name=pi", "--expire-time=10000", "--icon=dialog-information", title, body],
			{ stdio: "ignore", detached: true },
		);
		child.once("error", runFallback);
		child.once("close", (code) => {
			if (code !== 0) runFallback();
		});
		child.unref();
	} catch {
		runFallback();
	}
};

const notify = (title: string, body: string): void => {
	const backend = getBackend();
	if (backend === "off") return;

	const fallback = () => {
		if (fallbackBackend() === "kitty") notifyKitty(title, body);
		else notifyOsc777(title, body);
	};

	if (backend === "notify-send") return notifySend(title, body, fallback);
	if (backend === "kitty") return notifyKitty(title, body);
	if (backend === "osc777") return notifyOsc777(title, body);

	// Auto: prefer the compositor notification path on Hyprland/Wayland, otherwise
	// use the terminal-native protocol. This keeps Kitty working while also making
	// non-Kitty terminals on Hyprland work when a daemon is available.
	if (isHyprland() || isWayland()) {
		return notifySend(title, body, fallback);
	}
	fallback();
};

const isTextPart = (part: unknown): part is { type: "text"; text: string } =>
	Boolean(part && typeof part === "object" && "type" in part && part.type === "text" && "text" in part);

const extractLastAssistantText = (messages: Array<{ role?: string; content?: unknown }>): string | null => {
	for (let i = messages.length - 1; i >= 0; i--) {
		const message = messages[i];
		if (message?.role !== "assistant") {
			continue;
		}

		const content = message.content;
		if (typeof content === "string") {
			return content.trim() || null;
		}

		if (Array.isArray(content)) {
			const text = content.filter(isTextPart).map((part) => part.text).join("\n").trim();
			return text || null;
		}

		return null;
	}

	return null;
};

const plainMarkdownTheme: MarkdownTheme = {
	heading: (text) => text,
	link: (text) => text,
	linkUrl: () => "",
	code: (text) => text,
	codeBlock: (text) => text,
	codeBlockBorder: () => "",
	quote: (text) => text,
	quoteBorder: () => "",
	hr: () => "",
	listBullet: () => "",
	bold: (text) => text,
	italic: (text) => text,
	strikethrough: (text) => text,
	underline: (text) => text,
};

const simpleMarkdown = (text: string, width = 80): string => {
	const markdown = new Markdown(text, 0, 0, plainMarkdownTheme);
	return markdown.render(width).join("\n");
};

const formatNotification = (text: string | null): { title: string; body: string } => {
	const simplified = text ? simpleMarkdown(text) : "";
	const normalized = simplified.replace(/\s+/g, " ").trim();
	if (!normalized) {
		return { title: "Ready for input", body: "" };
	}

	const maxBody = 200;
	const body = normalized.length > maxBody ? `${normalized.slice(0, maxBody - 1)}…` : normalized;
	return { title: "π", body };
};

export default function (pi: ExtensionAPI) {
	pi.on("agent_end", async (event) => {
		const lastText = extractLastAssistantText(event.messages ?? []);
		const { title, body } = formatNotification(lastText);
		notify(title, body);
	});
}
