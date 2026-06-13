import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { ChangeStatus, ReviewFile, ReviewFileComparison, ReviewFileContents, ReviewScope } from "./types.js";

interface ChangedPath {
  status: ChangeStatus;
  oldPath: string | null;
  newPath: string | null;
}

interface ReviewFileSeed {
  path: string;
  worktreeStatus: ChangeStatus | null;
  hasWorkingTreeFile: boolean;
  inGitDiff: boolean;
  inLastCommit: boolean;
  gitDiff: ReviewFileComparison | null;
  lastCommit: ReviewFileComparison | null;
  commitComparisons: Record<string, ReviewFileComparison>;
}

async function runGit(pi: ExtensionAPI, repoRoot: string, args: string[]): Promise<string> {
  const result = await pi.exec("git", args, { cwd: repoRoot });
  if (result.code !== 0) {
    const message = result.stderr.trim() || result.stdout.trim() || `git ${args.join(" ")} failed`;
    throw new Error(message);
  }
  return result.stdout;
}

async function runGitAllowFailure(pi: ExtensionAPI, repoRoot: string, args: string[]): Promise<string> {
  const result = await pi.exec("git", args, { cwd: repoRoot });
  if (result.code !== 0) {
    return "";
  }
  return result.stdout;
}

export async function getRepoRoot(pi: ExtensionAPI, cwd: string): Promise<string> {
  const result = await pi.exec("git", ["rev-parse", "--show-toplevel"], { cwd });
  if (result.code !== 0) {
    throw new Error("Not inside a git repository.");
  }
  return result.stdout.trim();
}

async function hasHead(pi: ExtensionAPI, repoRoot: string): Promise<boolean> {
  const result = await pi.exec("git", ["rev-parse", "--verify", "HEAD"], { cwd: repoRoot });
  return result.code === 0;
}

function parseNameStatus(output: string): ChangedPath[] {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const changes: ChangedPath[] = [];

  for (const line of lines) {
    const parts = line.split("\t");
    const rawStatus = parts[0] ?? "";
    const code = rawStatus[0];

    if (code === "R") {
      const oldPath = parts[1] ?? null;
      const newPath = parts[2] ?? null;
      if (oldPath != null && newPath != null) {
        changes.push({ status: "renamed", oldPath, newPath });
      }
      continue;
    }

    if (code === "M") {
      const path = parts[1] ?? null;
      if (path != null) {
        changes.push({ status: "modified", oldPath: path, newPath: path });
      }
      continue;
    }

    if (code === "A") {
      const path = parts[1] ?? null;
      if (path != null) {
        changes.push({ status: "added", oldPath: null, newPath: path });
      }
      continue;
    }

    if (code === "D") {
      const path = parts[1] ?? null;
      if (path != null) {
        changes.push({ status: "deleted", oldPath: path, newPath: null });
      }
    }
  }

  return changes;
}

function parseUntrackedPaths(output: string): ChangedPath[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((path) => ({
      status: "added" as const,
      oldPath: null,
      newPath: path,
    }));
}

function parseTrackedPaths(output: string): string[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function mergeChangedPaths(tracked: ChangedPath[], untracked: ChangedPath[]): ChangedPath[] {
  const seen = new Set(tracked.map((change) => `${change.status}:${change.oldPath ?? ""}:${change.newPath ?? ""}`));
  const merged = [...tracked];

  for (const change of untracked) {
    const key = `${change.status}:${change.oldPath ?? ""}:${change.newPath ?? ""}`;
    if (seen.has(key)) continue;
    merged.push(change);
    seen.add(key);
  }

  return merged;
}

function uniquePaths(paths: string[]): string[] {
  return [...new Set(paths)];
}

function toDisplayPath(change: ChangedPath): string {
  if (change.status === "renamed") {
    return `${change.oldPath ?? ""} -> ${change.newPath ?? ""}`;
  }
  return change.newPath ?? change.oldPath ?? "(unknown)";
}

function toComparison(change: ChangedPath): ReviewFileComparison {
  return {
    status: change.status,
    oldPath: change.oldPath,
    newPath: change.newPath,
    displayPath: toDisplayPath(change),
    hasOriginal: change.oldPath != null,
    hasModified: change.newPath != null,
  };
}

function buildReviewFileId(path: string, hasWorkingTreeFile: boolean, gitDiff: ReviewFileComparison | null, lastCommit: ReviewFileComparison | null): string {
  return [
    path,
    hasWorkingTreeFile ? "working" : "gone",
    gitDiff?.displayPath ?? "",
    lastCommit?.displayPath ?? "",
  ].join("::");
}

function parseCommitLog(output: string): { sha: string; shortSha: string; subject: string }[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [sha = "", shortSha = "", ...subjectParts] = line.split("\t");
      return { sha, shortSha, subject: subjectParts.join("\t") };
    })
    .filter((commit) => commit.sha.length > 0);
}

function createReviewFile(seed: ReviewFileSeed): ReviewFile {
  return {
    id: buildReviewFileId(seed.path, seed.hasWorkingTreeFile, seed.gitDiff, seed.lastCommit),
    path: seed.path,
    worktreeStatus: seed.worktreeStatus,
    hasWorkingTreeFile: seed.hasWorkingTreeFile,
    inGitDiff: seed.inGitDiff,
    inLastCommit: seed.inLastCommit,
    gitDiff: seed.gitDiff,
    lastCommit: seed.lastCommit,
    commitComparisons: seed.commitComparisons,
  };
}

async function getRevisionContent(pi: ExtensionAPI, repoRoot: string, revision: string, path: string): Promise<string> {
  const result = await pi.exec("git", ["show", `${revision}:${path}`], { cwd: repoRoot });
  if (result.code !== 0) {
    return "";
  }
  return result.stdout;
}

async function getWorkingTreeContent(repoRoot: string, path: string): Promise<string> {
  try {
    return await readFile(join(repoRoot, path), "utf8");
  } catch {
    return "";
  }
}

function isReviewableFilePath(path: string): boolean {
  const lowerPath = path.toLowerCase();
  const fileName = lowerPath.split("/").pop() ?? lowerPath;
  const extension = extname(fileName);

  if (fileName.length === 0) return false;

  const binaryExtensions = new Set([
    ".7z",
    ".a",
    ".avi",
    ".avif",
    ".bin",
    ".bmp",
    ".class",
    ".dll",
    ".dylib",
    ".eot",
    ".exe",
    ".gif",
    ".gz",
    ".ico",
    ".jar",
    ".jpeg",
    ".jpg",
    ".lockb",
    ".map",
    ".mov",
    ".mp3",
    ".mp4",
    ".o",
    ".otf",
    ".pdf",
    ".png",
    ".pyc",
    ".so",
    ".svgz",
    ".tar",
    ".ttf",
    ".wasm",
    ".webm",
    ".webp",
    ".woff",
    ".woff2",
    ".zip",
  ]);

  if (binaryExtensions.has(extension)) return false;
  if (fileName.endsWith(".min.js") || fileName.endsWith(".min.css")) return false;

  return true;
}

function compareReviewFiles(a: ReviewFile, b: ReviewFile): number {
  return a.path.localeCompare(b.path);
}

function upsertSeed(seeds: Map<string, ReviewFileSeed>, key: string, create: () => ReviewFileSeed): ReviewFileSeed {
  const existing = seeds.get(key);
  if (existing != null) return existing;
  const seed = create();
  seeds.set(key, seed);
  return seed;
}

export async function getReviewWindowData(pi: ExtensionAPI, cwd: string): Promise<{ repoRoot: string; files: ReviewFile[]; commits: { sha: string; shortSha: string; subject: string }[] }> {
  const repoRoot = await getRepoRoot(pi, cwd);
  const repositoryHasHead = await hasHead(pi, repoRoot);

  const trackedDiffOutput = repositoryHasHead
    ? await runGit(pi, repoRoot, ["diff", "--find-renames", "-M", "--name-status", "HEAD", "--"])
    : "";
  const untrackedOutput = await runGitAllowFailure(pi, repoRoot, ["ls-files", "--others", "--exclude-standard"]);
  const trackedFilesOutput = await runGitAllowFailure(pi, repoRoot, ["ls-files", "--cached"]);
  const deletedFilesOutput = await runGitAllowFailure(pi, repoRoot, ["ls-files", "--deleted"]);
  const lastCommitOutput = repositoryHasHead
    ? await runGitAllowFailure(pi, repoRoot, ["diff-tree", "--root", "--find-renames", "-M", "--name-status", "--no-commit-id", "-r", "HEAD"])
    : "";
  const commits = repositoryHasHead
    ? parseCommitLog(await runGitAllowFailure(pi, repoRoot, ["log", "--max-count=50", "--format=%H%x09%h%x09%s"]))
    : [];
  const commitChanges = new Map<string, ChangedPath[]>();
  for (const commit of commits) {
    const output = await runGitAllowFailure(pi, repoRoot, ["diff-tree", "--root", "--find-renames", "-M", "--name-status", "--no-commit-id", "-r", commit.sha]);
    commitChanges.set(commit.sha, parseNameStatus(output).filter((change) => isReviewableFilePath(change.newPath ?? change.oldPath ?? "")));
  }

  const worktreeChanges = mergeChangedPaths(parseNameStatus(trackedDiffOutput), parseUntrackedPaths(untrackedOutput))
    .filter((change) => isReviewableFilePath(change.newPath ?? change.oldPath ?? ""));
  const deletedPaths = new Set(parseTrackedPaths(deletedFilesOutput));
  const currentPaths = uniquePaths([...parseTrackedPaths(trackedFilesOutput), ...parseTrackedPaths(untrackedOutput)])
    .filter((path) => !deletedPaths.has(path))
    .filter(isReviewableFilePath);
  const lastCommitChanges = parseNameStatus(lastCommitOutput)
    .filter((change) => isReviewableFilePath(change.newPath ?? change.oldPath ?? ""));

  const seeds = new Map<string, ReviewFileSeed>();

  for (const path of currentPaths) {
    seeds.set(path, {
      path,
      worktreeStatus: null,
      hasWorkingTreeFile: true,
      inGitDiff: false,
      inLastCommit: false,
      gitDiff: null,
      lastCommit: null,
      commitComparisons: {},
    });
  }

  for (const change of worktreeChanges) {
    const key = change.newPath ?? change.oldPath ?? toDisplayPath(change);
    const seed = upsertSeed(seeds, key, () => ({
      path: key,
      worktreeStatus: null,
      hasWorkingTreeFile: change.newPath != null,
      inGitDiff: false,
      inLastCommit: false,
      gitDiff: null,
      lastCommit: null,
      commitComparisons: {},
    }));
    seed.worktreeStatus = change.status;
    seed.hasWorkingTreeFile = change.newPath != null;
    seed.inGitDiff = true;
    seed.gitDiff = toComparison(change);
  }

  for (const change of lastCommitChanges) {
    const key = change.newPath ?? change.oldPath ?? toDisplayPath(change);
    const seed = upsertSeed(seeds, key, () => ({
      path: key,
      worktreeStatus: null,
      hasWorkingTreeFile: change.newPath != null && currentPaths.includes(change.newPath),
      inGitDiff: false,
      inLastCommit: false,
      gitDiff: null,
      lastCommit: null,
      commitComparisons: {},
    }));
    seed.inLastCommit = true;
    seed.lastCommit = toComparison(change);
  }

  for (const [commitSha, changes] of commitChanges) {
    for (const change of changes) {
      const key = change.newPath ?? change.oldPath ?? toDisplayPath(change);
      const seed = upsertSeed(seeds, key, () => ({
        path: key,
        worktreeStatus: null,
        hasWorkingTreeFile: change.newPath != null && currentPaths.includes(change.newPath),
        inGitDiff: false,
        inLastCommit: false,
        gitDiff: null,
        lastCommit: null,
        commitComparisons: {},
      }));
      seed.commitComparisons[commitSha] = toComparison(change);
    }
  }

  const files = [...seeds.values()]
    .map(createReviewFile)
    .sort(compareReviewFiles);

  return { repoRoot, files, commits };
}

export async function loadReviewFileContents(pi: ExtensionAPI, repoRoot: string, file: ReviewFile, scope: ReviewScope, commitSha?: string): Promise<ReviewFileContents> {
  if (scope === "all-files") {
    const content = file.hasWorkingTreeFile ? await getWorkingTreeContent(repoRoot, file.path) : "";
    return {
      originalContent: content,
      modifiedContent: content,
    };
  }

  const comparison = scope === "git-diff" ? file.gitDiff : scope === "commit" && commitSha ? file.commitComparisons[commitSha] : file.lastCommit;
  if (comparison == null) {
    return {
      originalContent: "",
      modifiedContent: "",
    };
  }

  const originalRevision = scope === "git-diff" ? "HEAD" : scope === "commit" && commitSha ? `${commitSha}^` : "HEAD^";
  const modifiedRevision = scope === "git-diff" ? null : scope === "commit" && commitSha ? commitSha : "HEAD";

  const originalContent = comparison.oldPath == null ? "" : await getRevisionContent(pi, repoRoot, originalRevision, comparison.oldPath);
  const modifiedContent = comparison.newPath == null
    ? ""
    : modifiedRevision == null
      ? await getWorkingTreeContent(repoRoot, comparison.newPath)
      : await getRevisionContent(pi, repoRoot, modifiedRevision, comparison.newPath);

  return {
    originalContent,
    modifiedContent,
  };
}
