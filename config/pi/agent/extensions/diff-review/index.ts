import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { Key, matchesKey, truncateToWidth } from "@earendil-works/pi-tui";
import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { getReviewWindowData, loadReviewFileContents } from "./git.js";
import { composeReviewPrompt } from "./prompt.js";
import type {
  ReviewCancelPayload,
  ReviewFile,
  ReviewFileContents,
  ReviewHostMessage,
  ReviewRequestFilePayload,
  ReviewSubmitPayload,
  ReviewWindowMessage,
} from "./types.js";
import { buildReviewHtml } from "./ui.js";

type GlimpseWindow = {
  close(): void;
  send(script: string): void;
  on(event: "message", listener: (data: unknown) => void): void;
  on(event: "closed", listener: () => void): void;
  on(event: "error", listener: (error: Error) => void): void;
  removeListener(event: "message", listener: (data: unknown) => void): void;
  removeListener(event: "closed", listener: () => void): void;
  removeListener(event: "error", listener: (error: Error) => void): void;
};

type GlimpseOpen = (html: string, options: { width: number; height: number; title: string }) => GlimpseWindow;

type GlimpseModule = {
  open: GlimpseOpen;
};

const execFileAsync = promisify(execFile);
const EXTENSION_DIR = path.dirname(fileURLToPath(import.meta.url));
let cachedOpen: GlimpseOpen | null = null;

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isMissingGlimpseError(error: unknown): boolean {
  const message = errorMessage(error);
  return message.includes("glimpseui") && (message.includes("Cannot find") || message.includes("ERR_MODULE_NOT_FOUND"));
}

async function loadGlimpseOpen(ctx: ExtensionCommandContext): Promise<GlimpseOpen> {
  if (cachedOpen != null) return cachedOpen;

  try {
    const module = (await import("glimpseui")) as GlimpseModule;
    cachedOpen = module.open;
    return cachedOpen;
  } catch (error) {
    if (!isMissingGlimpseError(error)) throw error;
  }

  const hasPackageLock = await pathExists(path.join(EXTENSION_DIR, "package-lock.json"));
  const npmArgs = hasPackageLock ? ["ci", "--omit=dev", "--ignore-scripts"] : ["install", "--omit=dev", "--ignore-scripts"];
  const manualCommand = `cd ${EXTENSION_DIR} && npm ${npmArgs.join(" ")}`;

  if (process.env.PI_DIFF_REVIEW_AUTO_INSTALL === "0") {
    throw new Error(`diff-review dependency missing: glimpseui. Run manually: ${manualCommand}`);
  }

  ctx.ui.notify("diff-review dependency missing; installing glimpseui with npm...", "warning");

  try {
    await execFileAsync("npm", npmArgs, {
      cwd: EXTENSION_DIR,
      timeout: 120_000,
      maxBuffer: 1024 * 1024,
    });
  } catch (error) {
    if (!hasPackageLock) {
      throw new Error(`diff-review dependency install failed. Run manually: ${manualCommand}. ${errorMessage(error)}`);
    }

    const fallbackArgs = ["install", "--omit=dev", "--ignore-scripts"];
    const fallbackCommand = `cd ${EXTENSION_DIR} && npm ${fallbackArgs.join(" ")}`;
    ctx.ui.notify("npm ci failed; retrying diff-review dependency install with npm install...", "warning");
    try {
      await execFileAsync("npm", fallbackArgs, {
        cwd: EXTENSION_DIR,
        timeout: 120_000,
        maxBuffer: 1024 * 1024,
      });
    } catch (fallbackError) {
      throw new Error(`diff-review dependency install failed. Run manually: ${fallbackCommand}. ${errorMessage(fallbackError)}`);
    }
  }

  try {
    const module = (await import("glimpseui")) as GlimpseModule;
    cachedOpen = module.open;
    ctx.ui.notify("diff-review dependency installed.", "info");
    return cachedOpen;
  } catch (error) {
    throw new Error(`diff-review dependency installed, but loading glimpseui still failed. ${errorMessage(error)}`);
  }
}

function isSubmitPayload(value: ReviewWindowMessage): value is ReviewSubmitPayload {
  return value.type === "submit";
}

function isCancelPayload(value: ReviewWindowMessage): value is ReviewCancelPayload {
  return value.type === "cancel";
}

function isRequestFilePayload(value: ReviewWindowMessage): value is ReviewRequestFilePayload {
  return value.type === "request-file";
}

type WaitingEditorResult = "escape" | "window-settled";

function escapeForInlineScript(value: string): string {
  return value.replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

export default function (pi: ExtensionAPI) {
  let activeWindow: GlimpseWindow | null = null;
  let activeWaitingUIDismiss: (() => void) | null = null;

  function closeActiveWindow(): void {
    if (activeWindow == null) return;
    const windowToClose = activeWindow;
    activeWindow = null;
    try {
      windowToClose.close();
    } catch {}
  }

  function showWaitingUI(ctx: ExtensionCommandContext): {
    promise: Promise<WaitingEditorResult>;
    dismiss: () => void;
  } {
    let settled = false;
    let doneFn: ((result: WaitingEditorResult) => void) | null = null;
    let pendingResult: WaitingEditorResult | null = null;

    const finish = (result: WaitingEditorResult): void => {
      if (settled) return;
      settled = true;
      if (activeWaitingUIDismiss === dismiss) {
        activeWaitingUIDismiss = null;
      }
      if (doneFn != null) {
        doneFn(result);
      } else {
        pendingResult = result;
      }
    };

    const promise = ctx.ui.custom<WaitingEditorResult>((_tui, theme, _kb, done) => {
      doneFn = done;
      if (pendingResult != null) {
        const result = pendingResult;
        pendingResult = null;
        queueMicrotask(() => done(result));
      }

      return {
        render(width: number): string[] {
          const innerWidth = Math.max(24, width - 2);
          const borderTop = theme.fg("border", `╭${"─".repeat(innerWidth)}╮`);
          const borderBottom = theme.fg("border", `╰${"─".repeat(innerWidth)}╯`);
          const lines = [
            theme.fg("accent", theme.bold("Waiting for review")),
            "The native review window is open.",
            "Press Escape to cancel and close the review window.",
          ];
          return [
            borderTop,
            ...lines.map((line) => `${theme.fg("border", "│")}${truncateToWidth(line, innerWidth, "...", true).padEnd(innerWidth, " ")}${theme.fg("border", "│")}`),
            borderBottom,
          ];
        },
        handleInput(data: string): void {
          if (matchesKey(data, Key.escape)) {
            finish("escape");
          }
        },
        invalidate(): void {},
      };
    });

    const dismiss = (): void => {
      finish("window-settled");
    };

    activeWaitingUIDismiss = dismiss;

    return {
      promise,
      dismiss,
    };
  }

  async function reviewRepository(ctx: ExtensionCommandContext): Promise<void> {
    if (activeWindow != null) {
      ctx.ui.notify("A review window is already open.", "warning");
      return;
    }

    const { repoRoot, files, commits } = await getReviewWindowData(pi, ctx.cwd);
    if (files.length === 0) {
      ctx.ui.notify("No reviewable files found.", "info");
      return;
    }

    const openGlimpse = await loadGlimpseOpen(ctx);
    const html = buildReviewHtml({ repoRoot, files, commits });
    const window = openGlimpse(html, {
      width: 1680,
      height: 1020,
      title: "pi review",
    });
    activeWindow = window;

    const waitingUI = showWaitingUI(ctx);
    const fileMap = new Map(files.map((file) => [file.id, file]));
    const contentCache = new Map<string, Promise<ReviewFileContents>>();

    const sendWindowMessage = (message: ReviewHostMessage): void => {
      if (activeWindow !== window) return;
      const payload = escapeForInlineScript(JSON.stringify(message));
      window.send(`window.__reviewReceive(${payload});`);
    };

    const loadContents = (file: ReviewFile, scope: ReviewRequestFilePayload["scope"], commitSha?: string): Promise<ReviewFileContents> => {
      const cacheKey = `${scope}:${commitSha ?? ""}:${file.id}`;
      const cached = contentCache.get(cacheKey);
      if (cached != null) return cached;

      const pending = loadReviewFileContents(pi, repoRoot, file, scope, commitSha);
      contentCache.set(cacheKey, pending);
      return pending;
    };

    ctx.ui.notify("Opened native review window.", "info");

    try {
      const terminalMessagePromise = new Promise<ReviewSubmitPayload | ReviewCancelPayload | null>((resolve, reject) => {
        let settled = false;

        const cleanup = (): void => {
          window.removeListener("message", onMessage);
          window.removeListener("closed", onClosed);
          window.removeListener("error", onError);
          if (activeWindow === window) {
            activeWindow = null;
          }
        };

        const settle = (value: ReviewSubmitPayload | ReviewCancelPayload | null): void => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve(value);
        };

        const handleRequestFile = async (message: ReviewRequestFilePayload): Promise<void> => {
          const file = fileMap.get(message.fileId);
          if (file == null) {
            sendWindowMessage({
              type: "file-error",
              requestId: message.requestId,
              fileId: message.fileId,
              scope: message.scope,
              commitSha: message.commitSha,
              message: "Unknown file requested.",
            });
            return;
          }

          try {
            const contents = await loadContents(file, message.scope, message.commitSha);
            sendWindowMessage({
              type: "file-data",
              requestId: message.requestId,
              fileId: message.fileId,
              scope: message.scope,
              commitSha: message.commitSha,
              originalContent: contents.originalContent,
              modifiedContent: contents.modifiedContent,
            });
          } catch (error) {
            const messageText = error instanceof Error ? error.message : String(error);
            sendWindowMessage({
              type: "file-error",
              requestId: message.requestId,
              fileId: message.fileId,
              scope: message.scope,
              commitSha: message.commitSha,
              message: messageText,
            });
          }
        };

        const onMessage = (data: unknown): void => {
          const message = data as ReviewWindowMessage;
          if (isRequestFilePayload(message)) {
            void handleRequestFile(message);
            return;
          }
          if (isSubmitPayload(message) || isCancelPayload(message)) {
            settle(message);
          }
        };

        const onClosed = (): void => {
          settle(null);
        };

        const onError = (error: Error): void => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(error);
        };

        window.on("message", onMessage);
        window.on("closed", onClosed);
        window.on("error", onError);
      });

      const result = await Promise.race([
        terminalMessagePromise.then((message) => ({ type: "window" as const, message })),
        waitingUI.promise.then((reason) => ({ type: "ui" as const, reason })),
      ]);

      if (result.type === "ui" && result.reason === "escape") {
        closeActiveWindow();
        await terminalMessagePromise.catch(() => null);
        ctx.ui.notify("Review cancelled.", "info");
        return;
      }

      const message = result.type === "window" ? result.message : await terminalMessagePromise;

      waitingUI.dismiss();
      await waitingUI.promise;
      closeActiveWindow();

      if (message == null || message.type === "cancel") {
        ctx.ui.notify("Review cancelled.", "info");
        return;
      }

      const prompt = composeReviewPrompt(files, message);
      ctx.ui.setEditorText(prompt);
      ctx.ui.notify("Inserted review feedback into the editor.", "info");
    } catch (error) {
      activeWaitingUIDismiss?.();
      closeActiveWindow();
      const message = error instanceof Error ? error.message : String(error);
      ctx.ui.notify(`Review failed: ${message}`, "error");
    }
  }

  pi.registerCommand("diff-review", {
    description: "Open a native review window with git diff, last commit, and all files scopes",
    handler: async (_args, ctx) => {
      await reviewRepository(ctx);
    },
  });

  pi.on("session_shutdown", async () => {
    activeWaitingUIDismiss?.();
    closeActiveWindow();
  });
}
