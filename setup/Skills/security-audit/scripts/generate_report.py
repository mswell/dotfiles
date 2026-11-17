#!/usr/bin/env python3
"""Render a validated security audit record as Markdown, JSON, or SARIF.

Usage: python3 generate_report.py PROJECT [--input PATH] [--output-dir PATH]
                                  [--format markdown|json|sarif]
"""

import argparse
import json
import os
import posixpath
import re
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote


SEVERITIES = ("critical", "high", "medium", "low")
VALIDATION_STATUSES = ("confirmed_by_code", "confirmed_by_test")
FINDING_TYPES = ("code", "project")
OUTPUT_NAMES = {
    "markdown": "scan_report.md",
    "json": "scan_results.json",
    "sarif": "scan_results.sarif",
}


class InvalidAudit(ValueError):
    """The input does not meet the report contract."""


def require_object(value, field):
    if not isinstance(value, dict):
        raise InvalidAudit(f"{field} must be an object")
    return value


def require_text(value, field):
    if not isinstance(value, str) or not value.strip():
        raise InvalidAudit(f"{field} must be a nonempty string")
    return value


def require_strings(value, field):
    if not isinstance(value, list) or any(not isinstance(item, str) for item in value):
        raise InvalidAudit(f"{field} must be an array of strings")
    return value


def normalize_file_path(value, field):
    """Keep report locations relative to the audited project on every host OS."""
    path = require_text(value, field).replace("\\", "/")
    if (
        path.startswith("/")
        or re.match(r"^[A-Za-z][A-Za-z0-9+.-]*:", path)
        or path.endswith("/")
        or any(part == ".." for part in path.split("/"))
        or any(ord(char) < 32 or ord(char) == 127 for char in path)
    ):
        raise InvalidAudit(f"{field} must be a project-relative file path")
    normalized = posixpath.normpath(path)
    if normalized == ".":
        raise InvalidAudit(f"{field} must be a project-relative file path")
    return normalized


def validate_audit(data):
    """Validate fields needed for accurate reporting without echoing their values."""
    require_object(data, "audit")
    scope = require_object(data.get("scope"), "scope")
    require_text(scope.get("target"), "scope.target")
    for field in ("included", "excluded"):
        require_strings(scope.get(field), f"scope.{field}")
    if "revision" in scope:
        require_text(scope["revision"], "scope.revision")

    coverage = require_object(data.get("coverage"), "coverage")
    reviewed = coverage.get("files_reviewed")
    if isinstance(reviewed, bool) or not isinstance(reviewed, int) or reviewed < 0:
        raise InvalidAudit("coverage.files_reviewed must be a nonnegative integer")
    for field in ("checks_completed", "skipped", "errors"):
        require_strings(coverage.get(field), f"coverage.{field}")

    require_strings(data.get("limitations"), "limitations")
    vulnerabilities = data.get("vulnerabilities")
    if not isinstance(vulnerabilities, list):
        raise InvalidAudit("vulnerabilities must be an array")
    ids = set()
    for index, finding in enumerate(vulnerabilities):
        prefix = f"vulnerabilities[{index}]"
        require_object(finding, prefix)
        for field in ("id", "title", "description", "evidence", "impact", "recommendation"):
            require_text(finding.get(field), f"{prefix}.{field}")
        if finding["id"] in ids:
            raise InvalidAudit(f"{prefix}.id must be unique")
        ids.add(finding["id"])
        if finding.get("severity") not in SEVERITIES:
            raise InvalidAudit(f"{prefix}.severity must be critical, high, medium, or low")
        if finding.get("validation_status") not in VALIDATION_STATUSES:
            raise InvalidAudit(f"{prefix}.validation_status must be confirmed_by_code or confirmed_by_test")
        if finding.get("finding_type") not in FINDING_TYPES:
            raise InvalidAudit(f"{prefix}.finding_type must be code or project")
        has_file = "file_path" in finding
        has_line = "line_number" in finding
        if finding["finding_type"] == "code" and (not has_file or not has_line):
            raise InvalidAudit(f"{prefix}.file_path and line_number are required for code findings")
        if has_file != has_line:
            raise InvalidAudit(f"{prefix}.file_path and line_number must appear together")
        if has_file:
            finding["file_path"] = normalize_file_path(finding["file_path"], f"{prefix}.file_path")
            line = finding["line_number"]
            if isinstance(line, bool) or not isinstance(line, int) or line < 1:
                raise InvalidAudit(f"{prefix}.line_number must be a positive integer")
        if "cwe_id" in finding:
            require_text(finding["cwe_id"], f"{prefix}.cwe_id")
        cvss_fields = ("cvss_score", "cvss_vector", "cvss_version")
        if any(field in finding for field in cvss_fields) and not all(field in finding for field in cvss_fields):
            raise InvalidAudit(f"{prefix}.cvss_score, cvss_vector, and cvss_version must appear together")
        for field in ("cvss_vector", "cvss_version"):
            if field in finding:
                require_text(finding[field], f"{prefix}.{field}")
        if "cvss_score" in finding:
            score = finding["cvss_score"]
            if isinstance(score, bool) or not isinstance(score, (int, float)) or not 0 <= score <= 10:
                raise InvalidAudit(f"{prefix}.cvss_score must be between 0 and 10")
        if "references" in finding:
            require_strings(finding["references"], f"{prefix}.references")

    hypotheses = data.get("hypotheses", [])
    if not isinstance(hypotheses, list):
        raise InvalidAudit("hypotheses must be an array")
    for index, hypothesis in enumerate(hypotheses):
        prefix = f"hypotheses[{index}]"
        require_object(hypothesis, prefix)
        require_text(hypothesis.get("title"), f"{prefix}.title")
        require_text(hypothesis.get("evidence"), f"{prefix}.evidence")
        if "next_step" in hypothesis:
            require_text(hypothesis["next_step"], f"{prefix}.next_step")
    return data


def summary(data):
    counts = {severity: 0 for severity in SEVERITIES}
    for finding in data["vulnerabilities"]:
        counts[finding["severity"]] += 1
    return {
        "confirmed_vulnerabilities": len(data["vulnerabilities"]),
        "by_severity": counts,
        "hypotheses": len(data.get("hypotheses", [])),
    }


def lines_for_list(items):
    return [f"- {item}" for item in items] if items else ["- None recorded"]


def generate_markdown_report(data, generated_at):
    counts = summary(data)
    scope = data["scope"]
    coverage = data["coverage"]
    parts = [
        "# Security Audit Report",
        "",
        f"**Target:** {scope['target']}",
        f"**Generated:** {generated_at}",
        f"**Confirmed vulnerabilities:** {counts['confirmed_vulnerabilities']}",
        f"**Hypotheses:** {counts['hypotheses']}",
        "",
        "## Scope",
        "",
    ]
    if scope.get("revision"):
        parts.append(f"**Revision:** {scope['revision']}")
        parts.append("")
    parts.extend(["### Included", "", *lines_for_list(scope["included"]), "", "### Excluded", "", *lines_for_list(scope["excluded"]), ""])
    parts.extend([
        "## Coverage",
        "",
        f"**Files reviewed:** {coverage['files_reviewed']}",
        "",
        "### Checks completed",
        "",
        *lines_for_list(coverage["checks_completed"]),
        "",
        "### Skipped",
        "",
        *lines_for_list(coverage["skipped"]),
        "",
        "### Scan errors",
        "",
        *lines_for_list(coverage["errors"]),
        "",
        "## Limitations",
        "",
        *lines_for_list(data["limitations"]),
        "",
        "## Confirmed findings",
        "",
    ])
    if not data["vulnerabilities"]:
        parts.extend(["No confirmed vulnerabilities were recorded in this review.", ""])
    for finding in sorted(data["vulnerabilities"], key=lambda item: SEVERITIES.index(item["severity"])):
        validation = "Confirmed by code" if finding["validation_status"] == "confirmed_by_code" else "Confirmed by test"
        parts.extend([
            f"### {finding['id']}: {finding['title']}",
            "",
            f"**Severity:** {finding['severity'].title()}",
            f"**Validation:** {validation}",
            f"**Finding type:** {finding['finding_type'].title()}",
        ])
        if "file_path" in finding:
            parts.append(f"**Location:** `{finding['file_path']}:{finding['line_number']}`")
        if finding.get("cwe_id"):
            parts.append(f"**CWE:** {finding['cwe_id']}")
        if "cvss_score" in finding:
            parts.append(f"**CVSS {finding['cvss_version']}:** {finding['cvss_score']} ({finding['cvss_vector']})")
        parts.extend([
            "",
            "#### Description",
            "",
            finding["description"],
            "",
            "#### Evidence",
            "",
            finding["evidence"],
            "",
            "#### Impact",
            "",
            finding["impact"],
            "",
            "#### Recommendation",
            "",
            finding["recommendation"],
            "",
        ])
        if finding.get("references"):
            parts.extend(["#### References", "", *lines_for_list(finding["references"]), ""])
    parts.extend(["## Hypotheses requiring validation", ""])
    hypotheses = data.get("hypotheses", [])
    if not hypotheses:
        parts.extend(["None recorded.", ""])
    for hypothesis in hypotheses:
        parts.extend([f"### {hypothesis['title']}", "", hypothesis["evidence"], ""])
        if hypothesis.get("next_step"):
            parts.extend([f"**Next step:** {hypothesis['next_step']}", ""])
    return "\n".join(parts).rstrip() + "\n"


def generate_json_report(data, generated_at):
    return json.dumps(
        {
            "metadata": {"generated": generated_at, "generator": "Security Audit"},
            "scope": data["scope"],
            "coverage": data["coverage"],
            "limitations": data["limitations"],
            "summary": summary(data),
            "vulnerabilities": data["vulnerabilities"],
            "hypotheses": data.get("hypotheses", []),
        },
        indent=2,
    ) + "\n"


def generate_sarif_report(data, generated_at):
    levels = {"critical": "error", "high": "error", "medium": "warning", "low": "note"}
    results = []
    for finding in data["vulnerabilities"]:
        result = {
            "ruleId": finding.get("cwe_id", finding["id"]),
            "level": levels[finding["severity"]],
            "message": {"text": f"{finding['title']}: {finding['description']}"},
            "properties": {
                "validation_status": finding["validation_status"],
                "finding_type": finding["finding_type"],
                "evidence": finding["evidence"],
                "impact": finding["impact"],
                "recommendation": finding["recommendation"],
            },
        }
        if "cvss_score" in finding:
            result["properties"]["cvss"] = {
                "version": finding["cvss_version"],
                "score": finding["cvss_score"],
                "vector": finding["cvss_vector"],
            }
        if "file_path" in finding:
            result["locations"] = [{
                "physicalLocation": {
                    "artifactLocation": {"uri": quote(finding["file_path"], safe="/-._~")},
                    "region": {"startLine": finding["line_number"]},
                }
            }]
        results.append(result)
    sarif = {
        "$schema": "https://docs.oasis-open.org/sarif/sarif/v2.1.0/errata01/os/schemas/sarif-schema-2.1.0.json",
        "version": "2.1.0",
        "runs": [{
            "tool": {"driver": {"name": "Security Audit"}},
            "properties": {
                "generated_at": generated_at,
                "scope": data["scope"],
                "coverage": data["coverage"],
                "limitations": data["limitations"],
                "hypotheses": data.get("hypotheses", []),
            },
            "results": results,
        }],
    }
    return json.dumps(sarif, indent=2) + "\n"


def write_private(path, content):
    """Atomically replace a report without following an existing output symlink."""
    fd, temp_path = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            fd = -1
            handle.write(content)
        os.replace(temp_path, path)
    finally:
        if fd >= 0:
            os.close(fd)
        if os.path.exists(temp_path):
            os.unlink(temp_path)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project", type=Path, help="project being audited")
    parser.add_argument("--input", type=Path, help="validated audit JSON input")
    parser.add_argument("--output-dir", type=Path, help="directory for generated reports")
    parser.add_argument("--format", choices=OUTPUT_NAMES, default="markdown")
    args = parser.parse_args(argv)
    project = args.project.resolve()
    if not project.is_dir():
        parser.error("project must be an existing directory")
    input_file = args.input or project / ".security-audit" / "VULNERABILITIES.json"
    output_dir = args.output_dir or project / ".security-audit"
    try:
        data = validate_audit(json.loads(input_file.read_text(encoding="utf-8")))
        generated_at = datetime.now(timezone.utc).isoformat()
        if args.format == "json":
            report = generate_json_report(data, generated_at)
        elif args.format == "sarif":
            report = generate_sarif_report(data, generated_at)
        else:
            report = generate_markdown_report(data, generated_at)
        output_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
        output_file = output_dir / OUTPUT_NAMES[args.format]
        write_private(output_file, report)
    except (OSError, UnicodeError, json.JSONDecodeError, InvalidAudit) as exc:
        print(f"Report generation failed: {exc}", file=sys.stderr)
        return 1
    print(output_file)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
