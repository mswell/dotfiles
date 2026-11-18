"""Behavior checks for the dependency scan CLI."""

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "analyze_dependencies.py"


class DependencyScanTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        self.project = Path(self.temp_dir.name)

    def scan(self):
        result = subprocess.run(
            [sys.executable, str(SCRIPT), str(self.project)],
            text=True,
            capture_output=True,
            check=True,
        )
        return json.loads(result.stdout)

    def write_npm(self, declared, resolved=None):
        (self.project / "package.json").write_text(
            json.dumps({"dependencies": {"lodash": declared}})
        )
        if resolved is not None:
            (self.project / "package-lock.json").write_text(
                json.dumps({
                    "lockfileVersion": 3,
                    "packages": {"": {}, "node_modules/lodash": {"version": resolved}},
                })
            )

    def test_resolved_fixed_version_does_not_get_cve(self):
        self.write_npm("^4.17.21", "4.17.21")

        result = self.scan()

        self.assertEqual([], result["advisory_matches"])
        self.assertEqual([], result["unverified_advisory_candidates"])
        self.assertIn("package-lock.json", result["dependency_files"])
        self.assertTrue(result["version_inventory_complete"])
        self.assertEqual("bundled_sample", result["advisory_catalog"])
        self.assertNotIn("analysis_complete", result)

    def test_resolved_affected_version_is_a_local_advisory_match(self):
        self.write_npm("^4.17.0", "4.17.20")

        result = self.scan()

        self.assertEqual(1, result["advisory_matches_found"])
        self.assertEqual(1, len(result["advisory_matches"]))
        finding = result["advisory_matches"][0]
        self.assertEqual("CVE-2021-23337", finding["cve"])
        self.assertEqual("4.17.20", finding["version"])
        self.assertEqual("local_advisory_match", finding["status"])

    def test_manifest_range_without_lock_is_unverified(self):
        self.write_npm("^4.17.21")

        result = self.scan()

        self.assertEqual([], result["advisory_matches"])
        self.assertEqual("lodash", result["unverified_advisory_candidates"][0]["package"])
        self.assertEqual("version_not_resolved", result["unverified_advisory_candidates"][0]["status"])

    def test_go_mod_only_counts_requirements(self):
        (self.project / "go.mod").write_text(
            "module example.com/demo\n\n"
            "go 1.22\n"
            "require (\n"
            "    golang.org/x/crypto v0.17.0\n"
            "    example.com/other v1.2.3 // indirect\n"
            ")\n"
            "replace example.com/other => example.com/fork v1.2.4\n"
        )

        result = self.scan()

        self.assertEqual(2, result["total_dependencies"])
        self.assertEqual([], result["advisory_matches"])

    def test_invalid_manifest_is_reported_as_incomplete_scan(self):
        (self.project / "package.json").write_text("{invalid")

        result = self.scan()

        self.assertFalse(result["version_inventory_complete"])
        self.assertEqual("package.json", result["parse_errors"][0]["file"])
        self.assertIn("package.json", result["dependency_files"])

    def test_unresolved_package_outside_sample_still_limits_coverage(self):
        (self.project / "package.json").write_text(
            json.dumps({"dependencies": {"unlisted-package": "^1.0.0"}})
        )

        result = self.scan()

        self.assertFalse(result["version_inventory_complete"])
        self.assertEqual(1, result["unresolved_dependencies_count"])
        self.assertEqual([], result["advisory_matches"])

    def test_symlinked_manifest_is_skipped_and_reported(self):
        outside = self.project.parent / (self.project.name + "-outside-package.json")
        outside.write_text(json.dumps({"dependencies": {"lodash": "^4.17.0"}}))
        (self.project / "package.json").symlink_to(outside)

        result = self.scan()

        self.assertFalse(result["version_inventory_complete"])
        self.assertEqual("symlink", result["parse_errors"][0]["error"])
        self.assertEqual(0, result["total_dependencies"])

    def test_linked_directory_makes_version_inventory_incomplete(self):
        self.write_npm("^4.17.21", "4.17.21")
        with tempfile.TemporaryDirectory() as linked_directory:
            linked = Path(linked_directory)
            (linked / "package.json").write_text(
                json.dumps({"dependencies": {"lodash": "^4.17.20"}})
            )
            (self.project / "linked").symlink_to(linked, target_is_directory=True)

            result = self.scan()

        self.assertEqual(["linked"], result["skipped_directories"])
        self.assertFalse(result["version_inventory_complete"])
        self.assertEqual([], result["advisory_matches"])

    def test_requirements_include_is_reported_as_coverage_gap(self):
        (self.project / "requirements.txt").write_text("-r requirements-prod.txt\n")
        (self.project / "requirements-prod.txt").write_text("django==4.2.11\n")

        result = self.scan()

        self.assertFalse(result["version_inventory_complete"])
        self.assertEqual("requirements.txt", result["parse_errors"][0]["file"])

    def test_optional_dependency_without_lock_is_unresolved(self):
        (self.project / "package.json").write_text(
            json.dumps({"optionalDependencies": {"lodash": "^4.17.21"}})
        )

        result = self.scan()

        self.assertEqual(1, result["total_dependencies"])
        self.assertEqual(1, result["unresolved_dependencies_count"])
        self.assertFalse(result["version_inventory_complete"])

    def test_lock_entry_without_version_is_unresolved(self):
        self.write_npm("^4.17.21", "4.17.21")
        (self.project / "package-lock.json").write_text(
            json.dumps({
                "lockfileVersion": 3,
                "packages": {
                    "": {},
                    "node_modules/lodash": {"version": "4.17.21"},
                    "node_modules/local-lib": {"link": True},
                },
            })
        )

        result = self.scan()

        self.assertEqual(1, result["unresolved_dependencies_count"])
        self.assertFalse(result["version_inventory_complete"])

    def test_nested_lock_copy_does_not_resolve_direct_declaration(self):
        (self.project / "package.json").write_text(
            json.dumps({"dependencies": {"lodash": "^4.17.21"}})
        )
        (self.project / "package-lock.json").write_text(
            json.dumps({
                "lockfileVersion": 3,
                "packages": {
                    "": {},
                    "node_modules/foo": {"version": "1.0.0"},
                    "node_modules/foo/node_modules/lodash": {"version": "4.17.20"},
                },
            })
        )

        result = self.scan()

        self.assertFalse(result["version_inventory_complete"])
        self.assertEqual(1, result["unresolved_dependencies_count"])
        self.assertEqual(1, result["advisory_matches_found"])
        self.assertEqual("4.17.20", result["advisory_matches"][0]["version"])


if __name__ == "__main__":
    unittest.main()
