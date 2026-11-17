"""Behavioral tests for the project detection CLI."""

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "detect_project.py"


class DetectProjectTests(unittest.TestCase):
    def test_finds_framework_and_entry_point_in_nested_project(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            project = Path(temporary)
            backend = project / "apps" / "backend"
            backend.mkdir(parents=True)
            (backend / "package.json").write_text(
                '{"dependencies":{"express":"4.21.0","pg":"8.0.0"}}'
            )
            (backend / "server.js").write_text("const express = require('express');\n")
            (backend / ".env.example").write_text("PORT=3000\n")

            result = subprocess.run(
                [sys.executable, str(SCRIPT), str(project)],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            data = json.loads(result.stdout)
            self.assertIn("Express.js", data["frameworks"])
            self.assertIn("postgres", data["databases"])
            self.assertIn("apps/backend/server.js", data["entry_points"])
            self.assertIn("apps/backend/.env.example", data["config_files"])

    def test_malformed_manifest_is_reported_as_detection_gap(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            project = Path(temporary)
            backend = project / "apps" / "backend"
            backend.mkdir(parents=True)
            (backend / "package.json").write_text("{invalid")

            result = subprocess.run(
                [sys.executable, str(SCRIPT), str(project)],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            data = json.loads(result.stdout)
            self.assertIn(
                {"file": "apps/backend/package.json", "reason": "JSONDecodeError"},
                data["detection_errors"],
            )

    def test_existing_file_is_not_accepted_as_a_project(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            target = Path(temporary) / "source.py"
            target.write_text("print('hello')\n")
            result = subprocess.run(
                [sys.executable, str(SCRIPT), str(target)],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertNotEqual(result.returncode, 0)

    def test_symlinked_manifest_is_not_read_outside_project(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            project = base / "app"
            project.mkdir()
            outside = base / "outside-package.json"
            outside.write_text('{"dependencies":{"express":"4.21.0"}}')
            (project / "package.json").symlink_to(outside)

            result = subprocess.run(
                [sys.executable, str(SCRIPT), str(project)],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            data = json.loads(result.stdout)
            self.assertNotIn("Express.js", data["frameworks"])
            self.assertIn(
                {"file": "package.json", "reason": "symlink"},
                data["detection_errors"],
            )

    def test_linked_directory_is_reported_as_detection_gap(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            project = base / "target"
            project.mkdir()
            linked = base / "linked-source"
            linked.mkdir()
            (linked / "package.json").write_text('{"dependencies":{"express":"4.21.0"}}')
            (project / "linked").symlink_to(linked, target_is_directory=True)

            result = subprocess.run(
                [sys.executable, str(SCRIPT), str(project)],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            data = json.loads(result.stdout)
            self.assertEqual(["linked"], data["skipped_directories"])
            self.assertNotIn("Express.js", data["frameworks"])


if __name__ == "__main__":
    unittest.main()
