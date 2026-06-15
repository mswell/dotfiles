#!/usr/bin/env node

import { spawn, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

const useProfile = process.argv[2] === "--profile";

// Resolve the Chrome/Chromium binary and source profile dir per-platform.
function resolveBrowser() {
	const home = process.env.HOME;
	const candidates = [];

	if (process.platform === "darwin") {
		candidates.push(
			{ bin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", profile: `${home}/Library/Application Support/Google/Chrome/` },
			{ bin: "/Applications/Chromium.app/Contents/MacOS/Chromium", profile: `${home}/Library/Application Support/Chromium/` },
			{ bin: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser", profile: `${home}/Library/Application Support/BraveSoftware/Brave-Browser/` },
		);
	} else {
		// Linux (and other unix). Match each binary name with its profile dir.
		candidates.push(
			{ bins: ["google-chrome-stable", "google-chrome", "chrome"], profile: `${home}/.config/google-chrome/` },
			{ bins: ["chromium", "chromium-browser"], profile: `${home}/.config/chromium/` },
			{ bins: ["brave", "brave-browser"], profile: `${home}/.config/BraveSoftware/Brave-Browser/` },
			{ bins: ["microsoft-edge", "microsoft-edge-stable"], profile: `${home}/.config/microsoft-edge/` },
		);
	}

	for (const c of candidates) {
		if (c.bin) {
			if (existsSync(c.bin)) return { bin: c.bin, profile: c.profile };
			continue;
		}
		for (const name of c.bins) {
			try {
				const path = execSync(`command -v ${name}`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
				if (path) return { bin: path, profile: c.profile };
			} catch {}
		}
	}

	return null;
}

const resolved = resolveBrowser();
if (!resolved) {
	console.error("\u2717 Could not find a Chrome/Chromium/Brave/Edge binary on this system");
	console.error("  Install one (e.g. `sudo pacman -S chromium` or google-chrome) and retry.");
	process.exit(1);
}

if (process.argv[2] && process.argv[2] !== "--profile") {
	console.log("Usage: browser-start.js [--profile]");
	console.log("\nOptions:");
	console.log("  --profile  Copy your default Chrome profile (cookies, logins)");
	process.exit(1);
}

const SCRAPING_DIR = `${process.env.HOME}/.cache/browser-tools`;

// Check if already running on :9222
try {
	const browser = await puppeteer.connect({
		browserURL: "http://localhost:9222",
		defaultViewport: null,
	});
	await browser.disconnect();
	console.log("✓ Chrome already running on :9222");
	process.exit(0);
} catch {}

// Setup profile directory
execSync(`mkdir -p "${SCRAPING_DIR}"`, { stdio: "ignore" });

// Remove SingletonLock to allow new instance
try {
	execSync(`rm -f "${SCRAPING_DIR}/SingletonLock" "${SCRAPING_DIR}/SingletonSocket" "${SCRAPING_DIR}/SingletonCookie"`, { stdio: "ignore" });
} catch {}

if (useProfile) {
	if (!existsSync(resolved.profile)) {
		console.error(`\u2717 Profile directory not found: ${resolved.profile}`);
		process.exit(1);
	}
	console.log("Syncing profile...");
	execSync(
		`rsync -a --delete \
			--exclude='SingletonLock' \
			--exclude='SingletonSocket' \
			--exclude='SingletonCookie' \
			--exclude='*/Sessions/*' \
			--exclude='*/Current Session' \
			--exclude='*/Current Tabs' \
			--exclude='*/Last Session' \
			--exclude='*/Last Tabs' \
			"${resolved.profile}" "${SCRAPING_DIR}/"`,
		{ stdio: "pipe" },
	);
}

// Start Chrome with flags to force new instance
spawn(
	resolved.bin,
	[
		"--remote-debugging-port=9222",
		`--user-data-dir=${SCRAPING_DIR}`,
		"--no-first-run",
		"--no-default-browser-check",
	],
	{ detached: true, stdio: "ignore" },
).unref();

// Wait for Chrome to be ready
let connected = false;
for (let i = 0; i < 30; i++) {
	try {
		const browser = await puppeteer.connect({
			browserURL: "http://localhost:9222",
			defaultViewport: null,
		});
		await browser.disconnect();
		connected = true;
		break;
	} catch {
		await new Promise((r) => setTimeout(r, 500));
	}
}

if (!connected) {
	console.error("✗ Failed to connect to Chrome");
	process.exit(1);
}

console.log(`✓ Chrome started on :9222${useProfile ? " with your profile" : ""}`);
