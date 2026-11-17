"""Behavioral tests for the secret scanner CLI."""

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "scan_secrets.py"


def scan(project: Path) -> dict:
    result = subprocess.run(
        [sys.executable, str(SCRIPT), str(project)],
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(result.stdout)


class SecretScannerTests(unittest.TestCase):
    def test_detected_secret_is_redacted_even_with_sample_comment(self):
        with tempfile.TemporaryDirectory() as directory:
            project = Path(directory)
            dummy_key = "AKIA" + "A1B2C3D4E5F6G7H8"
            source_line = f'API_KEY = "{dummy_key}"  # sample fixture'
            (project / "app.py").write_text(source_line + "\n")

            result = scan(project)

            self.assertEqual(result["files_scanned"], 1)
            self.assertEqual(result["secrets_found"], 1)
            self.assertEqual(result["findings"][0]["type"], "AWS Access Key")
            self.assertEqual(result["findings"][0]["line"], 1)
            serialized = json.dumps(result)
            self.assertNotIn(dummy_key, serialized)
            self.assertNotIn(source_line, serialized)
            self.assertNotIn("value", result["findings"][0])
            self.assertNotIn("context", result["findings"][0])

    def test_comment_only_secret_is_not_silently_skipped(self):
        with tempfile.TemporaryDirectory() as directory:
            project = Path(directory)
            dummy_key = "AKIA" + "B1C2D3E4F5G6H7J8"
            (project / "settings.py").write_text(f"# old key: {dummy_key}\n")

            result = scan(project)

            self.assertEqual(result["secrets_found"], 1)
            self.assertEqual(result["findings"][0]["type"], "AWS Access Key")

    def test_unreadable_candidate_is_reported_without_counting_as_scanned(self):
        with tempfile.TemporaryDirectory() as directory:
            project = Path(directory)
            (project / "safe.py").write_text("answer = 42\n")
            (project / "missing.py").symlink_to(project / "does-not-exist.py")

            result = scan(project)

            self.assertEqual(result["files_scanned"], 1)
            self.assertEqual(result["files_skipped"], 1)
            self.assertEqual(result["scan_errors"][0]["file"], "missing.py")

    def test_invalid_text_is_reported_as_skipped(self):
        with tempfile.TemporaryDirectory() as directory:
            project = Path(directory)
            (project / "invalid.py").write_bytes(b"\xff")

            result = scan(project)

            self.assertEqual(result["files_scanned"], 0)
            self.assertEqual(result["files_skipped"], 1)
            self.assertEqual(result["scan_errors"][0]["reason"], "UnicodeDecodeError")

    def test_linked_directory_is_reported_as_coverage_gap(self):
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            project = base / "target"
            project.mkdir()
            linked = base / "linked-source"
            linked.mkdir()
            (linked / "secret.py").write_text('token = "' + "AKIA" + "A1B2C3D4E5F6G7H8" + '"\n')
            (project / "linked").symlink_to(linked, target_is_directory=True)

            result = scan(project)

            self.assertEqual(["linked"], result["skipped_directories"])
            self.assertEqual(0, result["secrets_found"])
            self.assertEqual(0, result["files_scanned"])


if __name__ == "__main__":
    unittest.main()
