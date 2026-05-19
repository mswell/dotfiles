import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CURRENT_THEME_FILE = path.join(os.homedir(), ".config", "hypr", "current-theme");
const POLL_MS = 1000;

const THEME_ALIASES = {
  "wellpunk-dark": ["wellpunk-dark", "dark"],
  "wellpunk-light": ["wellpunk-light", "light"],
  tokyonight: ["tokyonight", "dark"],
  vantablack: ["wellpunk-dark", "dark"],
  black: ["wellpunk-dark", "dark"],
  dark: ["wellpunk-dark", "dark"],
  white: ["wellpunk-light", "light"],
  light: ["wellpunk-light", "light"],
};

function readHyprTheme() {
  try {
    return fs.readFileSync(CURRENT_THEME_FILE, "utf8").trim();
  } catch {
    return undefined;
  }
}

function resolvePiTheme(hyprTheme, ctx) {
  if (!hyprTheme) return undefined;

  const available = new Set(ctx.ui.getAllThemes().map((theme) => theme.name));
  const candidates = THEME_ALIASES[hyprTheme] ?? [hyprTheme];

  for (const candidate of candidates) {
    if (available.has(candidate)) return candidate;
  }

  return undefined;
}

export default function hyprThemeSync(pi) {
  let watcher = null;
  let interval = null;
  let lastHyprTheme;
  let lastPiTheme;
  let debounce = null;

  pi.on("session_start", (_event, ctx) => {
    const apply = () => {
      const hyprTheme = readHyprTheme();
      const piTheme = resolvePiTheme(hyprTheme, ctx);

      if (!piTheme || (hyprTheme === lastHyprTheme && piTheme === lastPiTheme)) {
        return;
      }

      const result = ctx.ui.setTheme(piTheme);
      if (result.success) {
        lastHyprTheme = hyprTheme;
        lastPiTheme = piTheme;
      } else {
        ctx.ui.notify(`hypr-theme-sync: failed to apply ${piTheme}: ${result.error}`, "error");
      }
    };

    const scheduleApply = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        debounce = null;
        apply();
      }, 100);
    };

    apply();

    try {
      watcher = fs.watch(CURRENT_THEME_FILE, scheduleApply);
    } catch {
      // The file may not exist yet on first install. Polling below covers that case.
    }

    interval = setInterval(apply, POLL_MS);
  });

  pi.on("session_shutdown", () => {
    if (debounce) {
      clearTimeout(debounce);
      debounce = null;
    }
    if (watcher) {
      watcher.close();
      watcher = null;
    }
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  });
}
