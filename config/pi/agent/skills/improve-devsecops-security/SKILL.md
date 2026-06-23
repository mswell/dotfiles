---
name: improve-devsecops-security
description: Reviews a codebase's DevSecOps posture across dependency supply chain, CI/CD permissions, secrets, builds, releases, containers, IaC, and deployment controls, then produces an implementation PRD. Use when the user wants DevSecOps hardening, supply-chain protection, dependency pinning, CI/CD least privilege, release integrity, SBOM/provenance, or security improvements that must adapt to the project's actual stack.
---

# Improve DevSecOps Security

Review the repository's DevSecOps posture and produce a prioritized PRD for concrete hardening work. Stay stack-aware: discover the project's languages, package managers, CI/CD system, deploy targets, and release model before recommending controls.

## Operating rules

- Do **not** prescribe a framework-specific checklist before identifying the stack.
- Prefer evidence from project files over generic advice.
- Treat dependency supply-chain and CI/CD permissions as first-class risks.
- Read [REFERENCES.md](REFERENCES.md) for current baseline sources; refresh with web research when recommendations depend on recent incidents, platform behavior, or ecosystem-specific controls.
- Do not edit production code unless the user explicitly asks for implementation.
- Do not store or print secrets. If a secret is found, report location and remediation without revealing the value.

## Workflow

### 1. Inventory the stack

Run the bundled inventory helper when possible:

```bash
node <skill-dir>/scripts/inventory.js <repo-root>
```

The helper now also emits a **`github-actions audit`** section that flags high-signal
workflow risks (unpinned action refs, missing `permissions:`, `pull_request_target`/
`workflow_run` triggers, secrets exposed to fork PRs, and likely script injection via
untrusted `github.event.*`). It detects GitHub Actions robustly: workflow files at any
depth (it always descends into `.github/`), composite/local actions under
`.github/actions/**/action.yml`, and published action repos (`action.yml` at root).

Then manually inspect the files it flags. Identify:

- Languages, package managers, lockfiles, build tools, monorepos/workspaces.
- CI/CD providers and workflow files.
- Container, IaC, deployment, release, and artifact-publishing paths.
- Existing security tooling: SCA, SAST, secret scanning, SBOM, signing, provenance, policy-as-code.

### 2. Threat-model the delivery chain

Map how code becomes a deployed artifact. Cover:

- Dependency intake: registries, lockfiles, update bots, private packages, vendored code.
- Build execution: who can trigger builds, from which branches/forks, with which tokens/secrets.
- Artifact integrity: reproducibility, signing, provenance, checksums, SBOMs.
- Deployment authority: environments, approvals, cloud/IaC permissions, rollback path.

### 3. Assess controls with stack-specific evidence

Use [CHECKLIST.md](CHECKLIST.md) as the control catalogue and [REFERENCES.md](REFERENCES.md) as the source baseline, but tailor recommendations to discovered technologies. Pay special attention to:

- Dependencies pinned by immutable lockfiles and, where supported, integrity hashes/checksums.
- CI/CD tokens using least privilege; avoid broad write scopes and long-lived credentials.
- Pull request workflows from forks not receiving write tokens or deployment secrets.
- Actions/plugins/images pinned to immutable refs/digests where practical. For GitHub
  Actions, pin third-party `uses:` to a full 40-char commit SHA (not a tag/branch);
  treat the inventory's `github-actions audit` findings as a starting point and verify
  each in the workflow file.
- Secrets separated by environment and protected by approvals.
- Releases producing SBOM/provenance and signed or verifiable artifacts.

For every finding, capture: evidence, risk, affected files, recommended control, effort, priority, and validation method.

### 4. Produce a PRD when improvements exist

If there are actionable improvements, create an English PRD with this structure:

1. Title
2. Background / current posture
3. Goals and non-goals
4. Threat model summary
5. Findings and evidence
6. Recommended workstreams
7. Prioritized implementation plan
8. Acceptance criteria
9. Validation plan
10. Rollout / migration considerations
11. Open questions

If the `to-prd` skill is available, load/use it to publish the PRD to the project issue tracker. If it is not available or no tracker is configured, write the PRD to a markdown file and ask the user where to publish it.

### 5. If no improvements are found

Do not create a PRD. Provide a concise English summary of reviewed areas, evidence, and residual risks.
