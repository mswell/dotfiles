"""Behavioral tests for the standalone skill installer."""

import subprocess
import tempfile
import unittest
from pathlib import Path


SKILL_DIR = Path(__file__).resolve().parents[1]
INSTALLER = SKILL_DIR / "install.sh"


class InstallTests(unittest.TestCase):
    def run_installer(self, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            ["bash", str(INSTALLER), *args],
            text=True,
            capture_output=True,
            check=False,
        )

    def test_requires_destination_without_picking_a_harness(self) -> None:
        result = self.run_installer()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("--path", result.stderr + result.stdout)

    def test_update_preserves_previous_installation_in_backup(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            destination = Path(temporary) / "skills"
            first = self.run_installer("--path", str(destination))
            self.assertEqual(first.returncode, 0, first.stderr)
            installed = destination / "security-audit"
            self.assertTrue((installed / "SKILL.md").is_file())

            customization = installed / "local-notes.txt"
            customization.write_text("keep me\n")
            second = self.run_installer("--path", str(destination))
            self.assertEqual(second.returncode, 0, second.stderr)
            backups = list(destination.glob("security-audit.backup.*"))
            self.assertEqual(len(backups), 1)
            self.assertEqual((backups[0] / "local-notes.txt").read_text(), "keep me\n")
            self.assertFalse(customization.exists())

    def test_source_cannot_be_used_as_destination(self) -> None:
        before = (SKILL_DIR / "SKILL.md").read_bytes()
        result = self.run_installer("--path", str(SKILL_DIR.parent))
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual((SKILL_DIR / "SKILL.md").read_bytes(), before)


if __name__ == "__main__":
    unittest.main()
