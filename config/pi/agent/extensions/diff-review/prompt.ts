import type { DiffReviewComment, ReviewFile, ReviewScope, ReviewSubmitPayload } from "./types.js";

function formatScopeLabel(scope: ReviewScope): string {
  switch (scope) {
    case "git-diff": return "git diff";
    case "last-commit": return "last commit";
    case "commit": return "commit";
    default: return "all files";
  }
}

function getCommentFilePath(file: ReviewFile | undefined, comment: DiffReviewComment): string {
  if (file == null) return "(unknown file)";
  const comparison = comment.scope === "git-diff"
    ? file.gitDiff
    : comment.scope === "last-commit"
      ? file.lastCommit
      : comment.scope === "commit" && comment.commitSha
        ? file.commitComparisons[comment.commitSha]
        : null;
  return comparison?.displayPath ?? file.path;
}

function formatLocation(comment: DiffReviewComment, file: ReviewFile | undefined): string {
  const filePath = getCommentFilePath(file, comment);
  const scopePrefix = comment.scope === "commit" && comment.commitSha
    ? `[commit ${comment.commitSha.slice(0, 12)}] `
    : `[${formatScopeLabel(comment.scope)}] `;

  if (comment.side === "file" || comment.startLine == null) {
    return `${scopePrefix}${filePath}`;
  }

  const range = comment.endLine != null && comment.endLine !== comment.startLine
    ? `${comment.startLine}-${comment.endLine}`
    : `${comment.startLine}`;

  if (comment.scope === "all-files") {
    return `${scopePrefix}${filePath}:${range}`;
  }

  const suffix = comment.side === "original" ? " (old)" : " (new)";
  return `${scopePrefix}${filePath}:${range}${suffix}`;
}

export function composeReviewPrompt(files: ReviewFile[], payload: ReviewSubmitPayload): string {
  const fileMap = new Map(files.map((file) => [file.id, file]));
  const lines: string[] = [];

  lines.push("Please address the following feedback");
  lines.push("");

  const overallComment = payload.overallComment.trim();
  if (overallComment.length > 0) {
    lines.push(overallComment);
    lines.push("");
  }

  payload.comments.forEach((comment, index) => {
    const file = fileMap.get(comment.fileId);
    lines.push(`${index + 1}. ${formatLocation(comment, file)}`);
    lines.push(`   ${comment.body.trim()}`);
    lines.push("");
  });

  return lines.join("\n").trim();
}
