# Audit record and report formats

This file defines the single input contract for report generation.
The audit workflow writes `VULNERABILITIES.json` to its private output directory.
`scripts/generate_report.py` validates that file and renders Markdown, JSON, or SARIF.
The generator records supplied evidence and coverage, and does not infer that a test or review phase occurred.

## Input contract

```json
{
  "scope": {
    "target": "example-app",
    "revision": "abc123",
    "included": ["src/"],
    "excluded": ["vendor/"]
  },
  "coverage": {
    "files_reviewed": 12,
    "checks_completed": ["Authorization paths in src/accounts.py"],
    "skipped": ["Generated files in vendor/"],
    "errors": []
  },
  "limitations": ["Production proxy configuration was unavailable"],
  "vulnerabilities": [
    {
      "id": "VULN-001",
      "title": "Missing ownership check",
      "severity": "high",
      "finding_type": "code",
      "validation_status": "confirmed_by_code",
      "file_path": "src/accounts.py",
      "line_number": 42,
      "description": "A caller can select another account's record.",
      "evidence": "The route accepts account_id, and the query omits the authenticated account ID.",
      "impact": "Another account's records may be read.",
      "recommendation": "Bind the query to the authenticated account.",
      "cwe_id": "CWE-639",
      "references": []
    }
  ],
  "hypotheses": [
    {
      "title": "Rate limit may be absent",
      "evidence": "No limiter was found in the visible code.",
      "next_step": "Inspect gateway configuration."
    }
  ]
}
```

Every input requires `scope`, `coverage`, `limitations`, and `vulnerabilities`.
`hypotheses` may be omitted when none remain.
`scope.target` is a nonempty name for the audited target, and `scope.revision` is optional.
`scope.included` and `scope.excluded` list the actual boundaries of the review.
`coverage.files_reviewed` is a nonnegative count.
`coverage.checks_completed`, `coverage.skipped`, and `coverage.errors` contain only work actually done or attempted.
Record unreadable files, failed tools, and incomplete scans in `coverage.errors` or `coverage.skipped`, with a reason.
`limitations` records important uncertainty such as unavailable deployment configuration.

Each item in `vulnerabilities` requires a unique `id`, `title`, `severity`, `finding_type`, `validation_status`, `description`, `evidence`, `impact`, and `recommendation`.
`severity` is one of `critical`, `high`, `medium`, or `low`.
`validation_status` is `confirmed_by_code` or `confirmed_by_test`, and describes the strongest validation actually performed.
`finding_type` is `code` for a finding tied to a specific code path, or `project` for a project-level dependency or configuration finding.
Code findings require a project-relative `file_path` and positive `line_number`.
Project-level findings may omit location when no precise file location applies.
If either location field is present, supply both.
File paths are normalized to forward slashes and must stay within the audited project.
Absolute paths, parent-directory traversal, drive or network paths, URI-like values, and control characters are rejected.
Spaces and other URI-sensitive characters are encoded when a path is written to SARIF.
Optional fields are `cwe_id`, `references`, and the CVSS field set.
The CVSS field set is `cvss_version`, `cvss_vector`, and `cvss_score`; provide all three together or omit all three.
Provide a CVSS score only when the case's attack preconditions and impacts support a vector.
Do not copy a score from a CWE table.

Put unresolved leads in `hypotheses`, not `vulnerabilities`.
Each hypothesis requires `title` and `evidence`, and may include `next_step`.
Hypotheses are shown separately in Markdown and JSON and omitted from SARIF results.
They are excluded from confirmed vulnerability counts.

Evidence should identify the relevant source, behavior, and preconditions for its finding type.
For code findings, describe the path from attacker-controlled input through authorization or validation to the affected operation when that path applies.
For dependency findings, include the resolved package version and advisory that matches it.
For configuration findings, include the setting and the deployment context that makes it effective.
Redact secrets in every field before saving the audit record.
Use safe local fixtures for dynamic confirmation unless testing a live target is explicitly authorized.

## Generated outputs

The generator accepts the audited project path and optional `--input`, `--output-dir`, and `--format` arguments.
By default, it reads `PROJECT/.security-audit/VULNERABILITIES.json` and writes to `PROJECT/.security-audit/`.
Specify both paths to keep audit artifacts outside the audited repository.

| Format | Output file | Content |
| --- | --- | --- |
| `markdown` | `scan_report.md` | Scope, coverage, limitations, confirmed findings, and separate hypotheses. |
| `json` | `scan_results.json` | The validated audit record plus generation metadata and counts. |
| `sarif` | `scan_results.sarif` | Confirmed findings as SARIF results, with audit context in run properties. |

SARIF permits results without a physical location, but some code scanning services require one to display an alert.
For project-level findings, supply a project-relative manifest or configuration location when it identifies the affected setting.
If no meaningful file location exists, retain the finding in Markdown and JSON and check whether the intended SARIF consumer displays it.

The generator prints only the output path to standard output.
It does not print the report body or the input record.
An empty `vulnerabilities` list means that no confirmed vulnerabilities were recorded within the stated scope and coverage.
It is not an overall safety rating.
