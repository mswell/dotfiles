import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { isRouteMode, type RouteConfig } from "./types";

const DEFAULT_CONFIG: RouteConfig = {
	// Fail-safe default: routing must be explicitly enabled with /route mode.
	// If config.json is missing or unreadable, do not auto-switch into OpenCode/Qwen.
	mode: "off",
	switchConfidenceThreshold: 0.8,
	familySwitchCooldownPrompts: 2,
	showStatus: true,
};

const CONFIG_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "config.json");

function asNumber(value: unknown, fallback: number, min: number, max: number): number {
	if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
	return Math.min(max, Math.max(min, value));
}

export function getConfigPath(): string {
	return CONFIG_PATH;
}

export async function loadConfig(): Promise<RouteConfig> {
	try {
		const raw = await fs.readFile(CONFIG_PATH, "utf8");
		const parsed = JSON.parse(raw) as Partial<RouteConfig> & Record<string, unknown>;
		return {
			mode: typeof parsed.mode === "string" && isRouteMode(parsed.mode) ? parsed.mode : DEFAULT_CONFIG.mode,
			switchConfidenceThreshold: asNumber(
				parsed.switchConfidenceThreshold,
				DEFAULT_CONFIG.switchConfidenceThreshold,
				0,
				1,
			),
			familySwitchCooldownPrompts: Math.round(asNumber(
				parsed.familySwitchCooldownPrompts,
				DEFAULT_CONFIG.familySwitchCooldownPrompts,
				0,
				10,
			)),
			showStatus: typeof parsed.showStatus === "boolean" ? parsed.showStatus : DEFAULT_CONFIG.showStatus,
		};
	} catch (error) {
		const code = (error as { code?: string }).code;
		if (code !== "ENOENT") {
			console.warn(`[route-router] Failed to read config: ${String(error)}`);
		}
		return { ...DEFAULT_CONFIG };
	}
}

export async function saveConfig(config: RouteConfig): Promise<void> {
	await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
	const safe: RouteConfig = {
		mode: config.mode,
		switchConfidenceThreshold: asNumber(config.switchConfidenceThreshold, DEFAULT_CONFIG.switchConfidenceThreshold, 0, 1),
		familySwitchCooldownPrompts: Math.round(asNumber(config.familySwitchCooldownPrompts, DEFAULT_CONFIG.familySwitchCooldownPrompts, 0, 10)),
		showStatus: config.showStatus,
	};
	await fs.writeFile(CONFIG_PATH, `${JSON.stringify(safe, null, 2)}\n`, "utf8");
}

export function defaultConfig(): RouteConfig {
	return { ...DEFAULT_CONFIG };
}
