"""Behavioral tests for the report generator's CLI contract."""

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "generate_report.py"


def sample_audit():
    return {
        "scope": {
            "target": "example-app",
            "revision": "abc123",
            "included": ["src/"],
            "excluded": ["vendor/"],
        },
        "coverage": {
            "files_reviewed": 12,
            "checks_completed": ["authorization paths"],
            "skipped": ["generated code"],
            "errors": ["could not read config/private.yml"],
        },
        "limitations": ["production proxy configuration unavailable"],
        "vulnerabilities": [
            {
                "id": "VULN-001",
                "title": "Missing ownership check",
                "severity": "high",
                "finding_type": "code",
                "validation_status": "confirmed_by_code",
                "description": "A caller can select another account's record.",
                "evidence": "The route accepts account_id and the query omits the caller ID.",
                "impact": "Another account's records may be read.",
                "recommendation": "Bind the query to the authenticated account.",
                "file_path": "src/accounts.py",
                "line_number": 42,
                "cwe_id": "CWE-639",
            }
        ],
        "hypotheses": [
            {
                "title": "Rate limit may be absent",
                "evidence": "No limiter was found in the visible code.",
                "next_step": "Inspect gateway configuration.",
            }
        ],
    }


class GenerateReportCliTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.project = self.root / "project"
        self.project.mkdir()
        self.audit_input = self.root / "private" / "VULNERABILITIES.json"
        self.audit_input.parent.mkdir()
        self.output_dir = self.root / "output"

    def run_report(self, data, fmt="markdown"):
        self.audit_input.write_text(json.dumps(data), encoding="utf-8")
        return subprocess.run(
            [
                sys.executable,
                str(SCRIPT),
                str(self.project),
                "--input",
                str(self.audit_input),
                "--output-dir",
                str(self.output_dir),
                "--format",
                fmt,
            ],
            capture_output=True,
            text=True,
            check=False,
        )

    def test_markdown_reports_actual_coverage_and_separates_hypotheses(self):
        result = self.run_report(sample_audit())
        self.assertEqual(result.returncode, 0, result.stderr)
        report = (self.output_dir / "scan_report.md").read_text(encoding="utf-8")
        self.assertIn("Missing ownership check", report)
        self.assertIn("Confirmed by code", report)
        self.assertIn("Rate limit may be absent", report)
        self.assertIn("could not read config/private.yml", report)
        self.assertIn("production proxy configuration unavailable", report)
        self.assertIn("**Confirmed vulnerabilities:** 1", report)
        self.assertNotIn("Claude", report)
        self.assertNotIn("STRIDE-based threat", report)
        self.assertNotIn("Missing ownership check", result.stdout)

    def test_json_keeps_scope_coverage_and_counts_only_confirmed_findings(self):
        result = self.run_report(sample_audit(), fmt="json")
        self.assertEqual(result.returncode, 0, result.stderr)
        report = json.loads((self.output_dir / "scan_results.json").read_text(encoding="utf-8"))
        self.assertEqual(report["summary"]["confirmed_vulnerabilities"], 1)
        self.assertEqual(report["summary"]["hypotheses"], 1)
        self.assertEqual(report["scope"]["revision"], "abc123")
        self.assertEqual(report["coverage"]["errors"], ["could not read config/private.yml"])
        self.assertEqual(report["vulnerabilities"][0]["validation_status"], "confirmed_by_code")

    def test_sarif_uses_finding_location_and_neutral_tool_name(self):
        result = self.run_report(sample_audit(), fmt="sarif")
        self.assertEqual(result.returncode, 0, result.stderr)
        report = json.loads((self.output_dir / "scan_results.sarif").read_text(encoding="utf-8"))
        run = report["runs"][0]
        self.assertEqual(run["tool"]["driver"]["name"], "Security Audit")
        self.assertEqual(len(run["results"]), 1)
        self.assertEqual(run["results"][0]["locations"][0]["physicalLocation"]["region"]["startLine"], 42)

    def test_empty_audit_does_not_claim_low_risk(self):
        data = sample_audit()
        data["vulnerabilities"] = []
        data["hypotheses"] = []
        result = self.run_report(data)
        self.assertEqual(result.returncode, 0, result.stderr)
        report = (self.output_dir / "scan_report.md").read_text(encoding="utf-8")
        self.assertIn("No confirmed vulnerabilities were recorded", report)
        self.assertNotIn("Overall Risk Level: **Low**", report)

    def test_missing_evidence_fails_without_creating_report(self):
        data = sample_audit()
        del data["vulnerabilities"][0]["evidence"]
        result = self.run_report(data)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("evidence", result.stderr)
        self.assertFalse((self.output_dir / "scan_report.md").exists())

    def test_code_finding_requires_location_but_project_finding_does_not(self):
        data = sample_audit()
        del data["vulnerabilities"][0]["line_number"]
        result = self.run_report(data)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("line_number", result.stderr)

        data["vulnerabilities"][0]["finding_type"] = "project"
        del data["vulnerabilities"][0]["file_path"]
        result = self.run_report(data)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_output_replaces_symlink_without_overwriting_its_target(self):
        self.output_dir.mkdir()
        unrelated = self.root / "notes.md"
        unrelated.write_text("keep this", encoding="utf-8")
        (self.output_dir / "scan_report.md").symlink_to(unrelated)

        result = self.run_report(sample_audit())
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(unrelated.read_text(encoding="utf-8"), "keep this")
        output = self.output_dir / "scan_report.md"
        self.assertFalse(output.is_symlink())
        self.assertEqual(os.stat(output).st_mode & 0o777, 0o600)

    def test_cvss_fields_are_supplied_together(self):
        data = sample_audit()
        finding = data["vulnerabilities"][0]
        finding["cvss_score"] = 8.1
        result = self.run_report(data)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("cvss_vector", result.stderr)

        finding["cvss_version"] = "3.1"
        finding["cvss_vector"] = "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:L/A:N"
        result = self.run_report(data)
        self.assertEqual(result.returncode, 0, result.stderr)
        report = (self.output_dir / "scan_report.md").read_text(encoding="utf-8")
        self.assertIn("**CVSS 3.1:** 8.1", report)

    def test_file_location_cannot_escape_project_or_be_a_uri(self):
        bad_paths = (
            "/tmp/outside.py",
            "../outside.py",
            "src/../outside.py",
            r"C:\repo\outside.py",
            r"\\server\share\outside.py",
            "file:///tmp/outside.py",
            "https://example.com/outside.py",
        )
        for finding_type in ("code", "project"):
            for bad_path in bad_paths:
                with self.subTest(finding_type=finding_type, file_path=bad_path):
                    data = sample_audit()
                    data["vulnerabilities"][0]["finding_type"] = finding_type
                    data["vulnerabilities"][0]["file_path"] = bad_path
                    result = self.run_report(data, fmt="sarif")
                    self.assertNotEqual(result.returncode, 0)
                    self.assertIn("file_path", result.stderr)
                    self.assertFalse((self.output_dir / "scan_results.sarif").exists())

    def test_windows_separators_are_normalized_and_sarif_uri_is_encoded(self):
        data = sample_audit()
        data["vulnerabilities"][0]["file_path"] = r"src\lib\.\account checker.py"
        result = self.run_report(data, fmt="json")
        self.assertEqual(result.returncode, 0, result.stderr)
        report = json.loads((self.output_dir / "scan_results.json").read_text(encoding="utf-8"))
        self.assertEqual(
            report["vulnerabilities"][0]["file_path"], "src/lib/account checker.py"
        )

        result = self.run_report(data, fmt="sarif")
        self.assertEqual(result.returncode, 0, result.stderr)
        sarif = json.loads((self.output_dir / "scan_results.sarif").read_text(encoding="utf-8"))
        uri = sarif["runs"][0]["results"][0]["locations"][0]["physicalLocation"]["artifactLocation"]["uri"]
        self.assertEqual(uri, "src/lib/account%20checker.py")

    def test_invalid_input_encoding_fails_without_traceback_or_report(self):
        self.audit_input.write_bytes(b"\xff")
        result = subprocess.run(
            [
                sys.executable,
                str(SCRIPT),
                str(self.project),
                "--input",
                str(self.audit_input),
                "--output-dir",
                str(self.output_dir),
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Report generation failed", result.stderr)
        self.assertNotIn("Traceback", result.stderr)
        self.assertFalse((self.output_dir / "scan_report.md").exists())


if __name__ == "__main__":
    unittest.main()
