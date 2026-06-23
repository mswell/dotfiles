#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || process.cwd());
const MAX_DEPTH = 6;
const SKIP = new Set([".git", "node_modules", ".next", "dist", "build", "coverage", "target", ".venv", "venv", "__pycache__"]);

const patterns = [
  { kind: "node", files: ["package.json", "package-lock.json", "npm-shrinkwrap.json", "pnpm-lock.yaml", "yarn.lock", ".yarnrc.yml"] },
  { kind: "python", files: ["requirements.txt", "requirements.lock", "pyproject.toml", "poetry.lock", "Pipfile", "Pipfile.lock", "uv.lock"] },
  { kind: "go", files: ["go.mod", "go.sum"] },
  { kind: "rust", files: ["Cargo.toml", "Cargo.lock"] },
  { kind: "java", files: ["pom.xml", "build.gradle", "build.gradle.kts", "gradle.lockfile"] },
  { kind: "dotnet", files: ["packages.lock.json", "global.json", "*.csproj", "*.sln"] },
  { kind: "ruby", files: ["Gemfile", "Gemfile.lock"] },
  { kind: "php", files: ["composer.json", "composer.lock"] },
  { kind: "containers", files: ["Dockerfile", "docker-compose.yml", "docker-compose.yaml", ".dockerignore"] },
  { kind: "iac", files: ["*.tf", "terragrunt.hcl", "Pulumi.yaml", "Chart.yaml", "kustomization.yaml"] },
  // GitHub Actions: workflows, composite/local actions, and action repos.
  { kind: "github-actions", files: [".github/workflows/*.yml", ".github/workflows/*.yaml", ".github/actions/**/action.yml", ".github/actions/**/action.yaml", "action.yml", "action.yaml"] },
  { kind: "ci-other", files: [".gitlab-ci.yml", "Jenkinsfile", "azure-pipelines.yml", "bitbucket-pipelines.yml", ".circleci/config.yml", ".drone.yml", "cloudbuild.yaml", "cloudbuild.yml", "buildkite/pipeline.yml", ".buildkite/pipeline.yml"] },
  { kind: "security", files: [".snyk", "dependabot.yml", ".github/dependabot.yml", "renovate.json", ".github/renovate.json", ".github/codeql/*.yml", ".github/codeql/*.yaml", "semgrep.yml", ".semgrep.yml", "trivy.yaml", "trivy.yml", "cosign.pub", ".github/workflows/codeql.yml", ".github/workflows/codeql.yaml"] },
];

function walk(dir, depth = 0, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  const insideGithub = dir.split(path.sep).includes(".github");
  for (const entry of entries) {
    // Never prune generic build dirs (build/dist/target/...) inside .github,
    // where they are legitimate action/workflow names, not artifacts.
    if (SKIP.has(entry.name) && !insideGithub && entry.name !== ".github") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Always descend into .github regardless of depth so CI/CD is never missed.
      if (depth < MAX_DEPTH || entry.name === ".github" || insideGithub) {
        walk(full, depth + 1, out);
      }
    } else {
      out.push(full);
    }
  }
  return out;
}

function globToRegex(glob) {
  // Support ** (any depth, incl. /) and * (single path segment).
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*\//g, "\u0000") // placeholder for **/
    .replace(/\*\*/g, "\u0001")
    .replace(/\*/g, "[^/]*")
    .replace(/\u0000/g, "(?:.*/)?")
    .replace(/\u0001/g, ".*");
  return new RegExp(`(^|/)${escaped}$`);
}

const files = walk(root).map((file) => path.relative(root, file).split(path.sep).join("/"));
const findings = new Map();

for (const group of patterns) {
  for (const pat of group.files) {
    const re = globToRegex(pat);
    for (const file of files) {
      if (file === pat || re.test(file)) {
        if (!findings.has(group.kind)) findings.set(group.kind, []);
        findings.get(group.kind).push(file);
      }
    }
  }
}

console.log(`# DevSecOps inventory for ${root}`);
console.log(`Scanned files: ${files.length}`);
for (const [kind, matches] of [...findings.entries()].sort()) {
  console.log(`\n## ${kind}`);
  for (const file of [...new Set(matches)].sort()) console.log(`- ${file}`);
}

const missing = patterns.map((p) => p.kind).filter((kind) => !findings.has(kind));
if (missing.length) console.log(`\n## not detected\n- ${missing.join("\n- ")}`);

// ---------------------------------------------------------------------------
// GitHub Actions security audit (high-signal, dependency-free line scan).
// ---------------------------------------------------------------------------
const ghActionFiles = [...new Set(findings.get("github-actions") || [])];
if (ghActionFiles.length) {
  const audit = [];
  const SHA40 = /@[0-9a-f]{40}\b/; // immutable pinning

  for (const rel of ghActionFiles) {
    let text;
    try { text = fs.readFileSync(path.join(root, rel), "utf8"); } catch { continue; }
    const lines = text.split(/\r?\n/);
    const isWorkflow = /\.github\/workflows\//.test(rel);

    const hasPermissions = /^\s*permissions\s*:/m.test(text);
    const triggers = [];
    if (isWorkflow) {
      if (/pull_request_target\b/.test(text)) triggers.push("pull_request_target");
      if (/^\s*workflow_run\s*:/m.test(text)) triggers.push("workflow_run");
    }

    lines.forEach((line, i) => {
      const n = i + 1;
      // 1. Unpinned external actions (uses: owner/repo@ref where ref isn't a 40-char SHA).
      const uses = line.match(/^\s*-?\s*uses\s*:\s*["']?([^"'#\s]+)/);
      if (uses) {
        const ref = uses[1];
        const isLocal = ref.startsWith("./") || ref.startsWith("../");
        const isDocker = ref.startsWith("docker://");
        if (!isLocal && !isDocker && ref.includes("@") && !SHA40.test(ref)) {
          audit.push({ file: rel, line: n, sev: "high", issue: `Unpinned action ref \`${ref}\` (pin to a full commit SHA)` });
        } else if (!isLocal && !isDocker && !ref.includes("@")) {
          audit.push({ file: rel, line: n, sev: "high", issue: `Action \`${ref}\` has no version ref (resolves to default branch)` });
        }
      }
      // 2. Script injection: untrusted github.event data interpolated into the workflow.
      if (/\$\{\{\s*github\.event\.[^}]*(title|body|head_ref|ref|name|email|message|label)[^}]*\}\}/.test(line)) {
        audit.push({ file: rel, line: n, sev: "high", issue: "Possible script injection: untrusted `github.event.*` interpolated in workflow" });
      }
    });

    if (isWorkflow && !hasPermissions) {
      audit.push({ file: rel, line: 0, sev: "medium", issue: "No `permissions:` block (GITHUB_TOKEN keeps broad default scopes)" });
    }
    if (triggers.length) {
      const usesSecrets = /\$\{\{\s*secrets\./.test(text);
      const sev = usesSecrets ? "high" : "medium";
      audit.push({ file: rel, line: 0, sev, issue: `Risky trigger(s) ${triggers.join(", ")}${usesSecrets ? " with secrets in scope (fork PR exposure risk)" : ""}` });
    }
  }

  console.log(`\n## github-actions audit`);
  if (!audit.length) {
    console.log("- No high-signal issues detected (still review manually).");
  } else {
    const order = { high: 0, medium: 1, low: 2 };
    audit.sort((a, b) => order[a.sev] - order[b.sev] || a.file.localeCompare(b.file) || a.line - b.line);
    for (const a of audit) {
      const loc = a.line ? `${a.file}:${a.line}` : a.file;
      console.log(`- [${a.sev}] ${loc} — ${a.issue}`);
    }
  }
}
