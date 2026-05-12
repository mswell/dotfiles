import tempfile
import unittest
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "mongodb"))

import core  # noqa: E402


class MongoReconCoreTests(unittest.TestCase):
    def test_parse_subdomain_lines_dedupes_and_skips_blank_lines(self):
        self.assertEqual(
            core.parse_subdomain_lines(["a.example.com\n", "", "a.example.com", "b.example.com\n"]),
            ["a.example.com", "b.example.com"],
        )

    def test_in_memory_store_duplicate_detection_and_listing(self):
        store = core.InMemoryReconStore()
        self.assertTrue(core.setup_parser("example", "a.example.com", store))
        self.assertFalse(core.setup_parser("other", "a.example.com", store))
        self.assertTrue(core.setup_parser("example", "b.example.com", store))

        self.assertEqual(store.list_targets(), ["example"])
        self.assertEqual(store.list_all_subdomains(), ["a.example.com", "b.example.com"])
        self.assertEqual(store.list_subdomains("example"), ["a.example.com", "b.example.com"])
        self.assertEqual(store.delete_target("example"), 2)
        self.assertEqual(store.list_targets(), [])

    def test_subdomain_parser_uses_injected_store_without_mongo(self):
        store = core.InMemoryReconStore()
        with tempfile.NamedTemporaryFile("w", delete=False) as handle:
            handle.write("a.example.com\na.example.com\nb.example.com\n")
            path = handle.name
        try:
            inserted = core.subdomain_parser("example", path, store)
            self.assertEqual(inserted, 2)
            self.assertEqual(store.list_subdomains("example"), ["a.example.com", "b.example.com"])
        finally:
            Path(path).unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()
