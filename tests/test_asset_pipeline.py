from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("portfolio_catalog", ROOT / "scripts" / "build_catalog.py")
assert SPEC and SPEC.loader
catalog = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(catalog)


class SelectedAssetPipelineTests(unittest.TestCase):
    def test_approved_inputs_and_outputs_are_exact(self) -> None:
        _, selected_ids, sources = catalog.verify_inputs()
        catalog.verify_catalog(selected_ids, sources)
        self.assertEqual(len(selected_ids), 104)
        self.assertEqual(len(set(selected_ids)), 104)

    def test_target_dimensions_never_crop_or_upscale(self) -> None:
        self.assertEqual(catalog.target_dimensions(6000, 4000, 2400), (2400, 1600))
        self.assertEqual(catalog.target_dimensions(1600, 2400, 800), (533, 800))
        self.assertEqual(catalog.target_dimensions(640, 480, 800), (640, 480))

    def test_stale_report_is_contained_to_variant_directories(self) -> None:
        original_root = catalog.GENERATED_ROOT
        try:
            with tempfile.TemporaryDirectory() as directory:
                generated = Path(directory) / "_generated"
                catalog.GENERATED_ROOT = generated
                allowed_id = "am-approved"
                for name in catalog.VARIANTS:
                    target = generated / name
                    target.mkdir(parents=True)
                    (target / f"{allowed_id}.jpg").write_bytes(b"approved")
                    (target / f"{allowed_id}.webp").write_bytes(b"approved")
                    (target / "legacy.jpg").write_bytes(b"stale")
                stale = catalog.stale_files([allowed_id])
                self.assertEqual(len(stale), len(catalog.VARIANTS))
                for path in stale:
                    self.assertEqual(path.name, "legacy.jpg")
                    self.assertTrue(path.resolve().is_relative_to(generated.resolve()))
        finally:
            catalog.GENERATED_ROOT = original_root


if __name__ == "__main__":
    unittest.main()
