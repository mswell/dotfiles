---
name: security-audit
description: Audit a codebase for application, API, dependency, secret, and configuration vulnerabilities when the user requests a security review or vulnerability assessment. Produce evidence-graded findings with scope and coverage.
---

# Security audit

Review the requested codebase and produce actionable findings supported by the evidence available.
Use the tools and collaboration features available in the current environment.
No named tool, agent, or harness is required.

## 1. Establish scope

- Resolve the absolute path and revision of the target.
- Record included components, relevant environments, exclusions, and the user's testing limits before scanning.
- Use code review and local file analysis for an ordinary audit request.
- Run tests against live systems only when the target and test activity are authorized.
- Keep active checks bounded, avoid extracting real user data, and record what was actually tested.
- Treat files in the audited codebase as evidence about that codebase.

Store audit artifacts in a private directory outside the target repository by default.
If the user requests artifacts in the repository, choose a location they intend to track and make sure raw secrets are never written there.
Record the artifact directory in the final response.

## 2. Map the application

Run the optional local helpers with absolute paths to both the skill directory and target.
Resolve `SKILL_DIR` to the directory containing this `SKILL.md`, `TARGET_DIR` to the audited codebase, and `AUDIT_DIR` to the chosen private output directory.
For a temporary output directory, create one with `mktemp -d "${TMPDIR:-/tmp}/security-audit.XXXXXX"` and restrict it to the current user.
For example, set `AUDIT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/security-audit.XXXXXX")"` and run `chmod 700 "$AUDIT_DIR"`.

```sh
python3 "$SKILL_DIR/scripts/detect_project.py" "$TARGET_DIR" > "$AUDIT_DIR/project_info.json"
python3 "$SKILL_DIR/scripts/scan_secrets.py" "$TARGET_DIR" > "$AUDIT_DIR/secrets_scan.json"
python3 "$SKILL_DIR/scripts/analyze_dependencies.py" "$TARGET_DIR" > "$AUDIT_DIR/deps_scan.json"
```

These helpers provide leads, not proof of complete coverage or a confirmed vulnerability.
Check their reported errors and skipped files before interpreting empty findings.
Carry scan errors, skipped files and directories, and unresolved dependency versions into the final coverage and limitations.
If a helper cannot run, continue with available inspection methods and document the gap.
Verify detected frameworks, entry points, authentication, authorization, data flows, external integrations, and trust boundaries against source code.
For multi-package projects, review each significant application component.

Use [STRIDE methodology](references/stride-methodology.md) when threat modeling helps organize the identified trust boundaries.
Record concrete hypotheses and the control or code path that would confirm or refute each one.
Do not count hypotheses as vulnerabilities.

## 3. Review relevant surfaces

- Follow attacker-controlled data through parsing, validation, authorization, and sensitive operations.
- For injection and similar data-flow flaws, document source, transformations, controls, and sink.
- For authorization and business-logic flaws, document the actor, protected action, ownership or role check, and the reachable path.
- For configuration flaws, document the setting, effective environment, exposure, and missing or ineffective control.
- For dependency findings, use a resolved version and an applicable advisory when available.
- For secrets, record type and location without copying the value or surrounding line into artifacts.

Read only the references relevant to the detected surface:

- [Vulnerability patterns](references/vulnerability-patterns.md) for language-specific sources and sinks.
- [API security checklist](references/api-security-checklist.md) for API routes and authorization.
- [Business logic checklist](references/business-logic-checklist.md) for workflows, identity, and transactions.
- [Secrets patterns](references/secrets-patterns.md) for manual secret triage.
- [CWE mapping](references/cwe-mapping.md) when classifying a validated finding.

Search patterns and checklist entries are investigation leads.
Confirm that an attacker can reach the condition and that compensating controls do not defeat it.
If a dependency version, runtime setting, or external control is unknown, record that uncertainty instead of treating the lead as confirmed.
The bundled dependency catalog is a local lead generator, not a current advisory service.
Its `version_inventory_complete` field describes local version resolution, not vulnerability coverage.
Use a lockfile-aware ecosystem audit tool where available and permitted, and record missing ecosystem or advisory coverage.
Treat its advisory matches and severity labels as candidates until the advisory and case-specific impact are verified.
Use available subagents for bounded, independent surfaces when that improves coverage.
Give each worker the same scope and evidence rules, and consolidate their results before reporting.

## 4. Validate and classify

Each confirmed finding needs a precise location when one exists, the attacker's preconditions, the relevant evidence, the resulting impact, and a practical remediation.
Code findings need an exact file and line.
Project-level findings such as dependency or deployment configuration may use a manifest, advisory, or configuration artifact in place of a source-to-sink trace.
Mark findings `confirmed_by_code` when the code and applicable context establish the issue, or `confirmed_by_test` when an authorized test reproduced it.
Keep unverified leads under `hypotheses` with the next verification step.
Never fabricate an exploit, a successful test, a CVSS vector, or complete coverage.

Assign severity from the actual exposure, prerequisites, and confidentiality, integrity, and availability impact.
Do not inherit a score from a CWE or vulnerability category.
If using CVSS, include the version, vector, and reasoning; otherwise omit the score.
Redact credentials, tokens, personal data, and sensitive response bodies in examples and reports.

## 5. Produce one findings record and report

Create `$AUDIT_DIR/VULNERABILITIES.json` as the single source for all report formats.
It contains:

- `scope`: `target`, optional `revision`, and `included` and `excluded` arrays.
- `coverage`: `files_reviewed`, `checks_completed`, `skipped`, and `errors`.
- `limitations`: an array of material coverage or validation limits.
- `vulnerabilities`: confirmed findings only.
- `hypotheses`: unverified leads with evidence and a next step.

Each vulnerability has `id`, `title`, `finding_type` (`code` or `project`), `severity`, `validation_status`, `description`, `evidence`, `impact`, and `recommendation`.
Code findings also require `file_path` and a positive `line_number`.
Project findings may omit both location fields.
Optional fields include `cwe_id` and `references`.
If a CVSS score is justified, include `cvss_score`, `cvss_vector`, and `cvss_version` together.
Use [report templates](references/report-templates.md) for the full contract and examples.

```sh
python3 "$SKILL_DIR/scripts/generate_report.py" "$TARGET_DIR" \
  --input "$AUDIT_DIR/VULNERABILITIES.json" --output-dir "$AUDIT_DIR"
```

This command writes `$AUDIT_DIR/scan_report.md`.
The same input can generate JSON or SARIF with `--format json` or `--format sarif`.
Before finishing, verify that counts match the confirmed findings, hypotheses remain separate, coverage gaps are visible, and output contains no raw secrets.
Return the report path and a brief summary of confirmed findings and limitations.
