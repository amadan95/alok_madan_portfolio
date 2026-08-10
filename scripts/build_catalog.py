#!/usr/bin/env python3
"""Validate or compile the approved, selected-only portfolio asset catalog."""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import tempfile
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
MANIFEST_PATH = SITE / "content" / "exhibit-manifest.json"
REGISTRY_PATH = SITE / "assets" / "selected" / "asset-sources.json"
CATALOG_PATH = SITE / "content" / "asset-catalog.json"
GENERATED_ROOT = SITE / "public" / "_generated"
VARIANT_VERSION = 3
VARIANTS = {
    "raw": {"maxSize": 360, "jpegQuality": 70, "webpQuality": 70},
    "thumb": {"maxSize": 800, "jpegQuality": 78, "webpQuality": 76},
    "rail": {"maxSize": 1600, "jpegQuality": 86, "webpQuality": 82},
    "hero": {"maxSize": 2400, "jpegQuality": 90, "webpQuality": 86},
}


class CatalogError(RuntimeError):
    pass


def load_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as error:
        raise CatalogError(f"Missing required file: {path}") from error
    except json.JSONDecodeError as error:
        raise CatalogError(f"Invalid JSON in {path}: {error}") from error
    if not isinstance(value, dict):
        raise CatalogError(f"Expected a JSON object in {path}")
    return value


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def atomic_json(path: Path, payload: object) -> bool:
    body = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    if path.exists() and path.read_text(encoding="utf-8") == body:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", dir=path.parent, prefix=f".{path.name}.", delete=False
    ) as handle:
        handle.write(body)
        temporary = Path(handle.name)
    os.replace(temporary, path)
    return True


def selected_ids(manifest: dict[str, Any]) -> list[str]:
    if manifest.get("manifestVersion") != 2:
        raise CatalogError("content/exhibit-manifest.json must use manifestVersion 2")
    collections = manifest.get("collections")
    if not isinstance(collections, list):
        raise CatalogError("manifest.collections must be an array")
    ids: list[str] = []
    for collection_index, collection in enumerate(collections):
        images = collection.get("images") if isinstance(collection, dict) else None
        if not isinstance(images, list):
            raise CatalogError(f"manifest.collections[{collection_index}].images must be an array")
        for image_index, image in enumerate(images):
            asset_id = image.get("assetId") if isinstance(image, dict) else None
            if not isinstance(asset_id, str) or not asset_id:
                raise CatalogError(
                    f"manifest.collections[{collection_index}].images[{image_index}].assetId is required"
                )
            ids.append(asset_id)
    if len(ids) != len(set(ids)):
        raise CatalogError("Every selected assetId must appear exactly once")
    return ids


def registry_map(registry: dict[str, Any]) -> dict[str, dict[str, Any]]:
    assets = registry.get("assets")
    if registry.get("registryVersion") != 1 or not isinstance(assets, list):
        raise CatalogError("asset-sources.json must be a registryVersion 1 object with assets[]")
    result: dict[str, dict[str, Any]] = {}
    masters_root = (SITE / "assets" / "selected" / "masters").resolve()
    for index, record in enumerate(assets):
        if not isinstance(record, dict):
            raise CatalogError(f"registry.assets[{index}] must be an object")
        asset_id = record.get("assetId")
        relative = record.get("masterPath")
        checksum = record.get("sha256")
        if not isinstance(asset_id, str) or not asset_id:
            raise CatalogError(f"registry.assets[{index}].assetId is required")
        if asset_id in result:
            raise CatalogError(f"Duplicate source registry assetId: {asset_id}")
        if not isinstance(relative, str) or not relative:
            raise CatalogError(f"registry.assets[{index}].masterPath is required")
        relative_path = Path(relative)
        if relative_path.is_absolute() or ".." in relative_path.parts:
            raise CatalogError(f"Unsafe masterPath for {asset_id}: {relative}")
        master = (SITE / relative_path).resolve()
        if not master.is_relative_to(masters_root):
            raise CatalogError(f"Master path escapes the selected masters directory: {relative}")
        if not master.is_file():
            raise CatalogError(f"Missing selected master for {asset_id}: {relative}")
        if not isinstance(checksum, str) or len(checksum) != 64:
            raise CatalogError(f"registry.assets[{index}].sha256 must be a SHA-256 digest")
        result[asset_id] = {**record, "resolvedPath": master}
    return result


def verify_inputs() -> tuple[dict[str, Any], list[str], dict[str, dict[str, Any]]]:
    manifest = load_json(MANIFEST_PATH)
    ids = selected_ids(manifest)
    sources = registry_map(load_json(REGISTRY_PATH))
    if set(ids) != set(sources):
        missing = sorted(set(ids) - set(sources))
        extra = sorted(set(sources) - set(ids))
        raise CatalogError(f"Manifest/source registry mismatch; missing={missing}, extra={extra}")
    for asset_id in ids:
        record = sources[asset_id]
        actual = sha256(record["resolvedPath"])
        if actual != record["sha256"]:
            raise CatalogError(
                f"Selected master checksum mismatch for {asset_id}: expected {record['sha256']}, got {actual}"
            )
    return manifest, ids, sources


def import_imaging():
    try:
        from PIL import Image, ImageCms, ImageOps, ImageStat
    except ModuleNotFoundError as error:
        raise CatalogError(
            "Asset generation requires Pillow. Builds use --check and do not need Pillow."
        ) from error
    return Image, ImageCms, ImageOps, ImageStat


def srgb_image(path: Path):
    Image, ImageCms, ImageOps, _ = import_imaging()
    opened = Image.open(path)
    image = ImageOps.exif_transpose(opened)
    embedded_profile = image.info.get("icc_profile")
    if embedded_profile:
        try:
            source_profile = ImageCms.ImageCmsProfile(io.BytesIO(embedded_profile))
            destination_profile = ImageCms.createProfile("sRGB")
            converted = ImageCms.profileToProfile(
                image,
                source_profile,
                destination_profile,
                outputMode="RGB",
                renderingIntent=ImageCms.Intent.PERCEPTUAL,
            )
            opened.close()
            return converted
        except (ImageCms.PyCMSError, OSError, ValueError):
            pass
    if image.mode == "RGBA":
        converted = Image.new("RGB", image.size, "white")
        converted.paste(image, mask=image.getchannel("A"))
    else:
        converted = image.convert("RGB")
    opened.close()
    return converted


def image_metrics(image) -> tuple[int, int, float, str, str]:
    Image, _, _, ImageStat = import_imaging()
    width, height = image.size
    aspect = width / height
    orientation = "square" if abs(aspect - 1) < 0.04 else "landscape" if aspect > 1 else "portrait"
    sample = image.copy()
    sample.thumbnail((64, 64), Image.Resampling.LANCZOS)
    mean = ImageStat.Stat(sample).mean[:3]
    average = "#" + "".join(f"{max(0, min(255, round(value))):02x}" for value in mean)
    return width, height, aspect, orientation, average


def target_dimensions(width: int, height: int, maximum: int) -> tuple[int, int]:
    scale = min(1.0, maximum / max(width, height))
    return max(1, round(width * scale)), max(1, round(height * scale))


def atomic_image_save(image, destination: Path, format_name: str, **options: Any) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        "wb", dir=destination.parent, prefix=f".{destination.name}.", suffix=destination.suffix, delete=False
    ) as handle:
        temporary = Path(handle.name)
    try:
        image.save(temporary, format=format_name, **options)
        os.replace(temporary, destination)
    finally:
        temporary.unlink(missing_ok=True)


def variant_record(asset_id: str, name: str, width: int, height: int) -> dict[str, Any]:
    return {
        "jpeg": f"/_generated/{name}/{asset_id}.jpg",
        "webp": f"/_generated/{name}/{asset_id}.webp",
        "width": width,
        "height": height,
    }


def record_is_reusable(record: dict[str, Any] | None, checksum: str) -> bool:
    if not record or record.get("sourceChecksum") != checksum or record.get("variantVersion") != VARIANT_VERSION:
        return False
    variants = record.get("variants")
    if not isinstance(variants, dict):
        return False
    for name in VARIANTS:
        variant = variants.get(name)
        if not isinstance(variant, dict):
            return False
        for extension in ("jpg", "webp"):
            if not (GENERATED_ROOT / name / f"{record.get('id')}.{extension}").is_file():
                return False
    return True


def compile_catalog(ids: list[str], sources: dict[str, dict[str, Any]]) -> dict[str, Any]:
    previous: dict[str, dict[str, Any]] = {}
    if CATALOG_PATH.exists():
        loaded = load_json(CATALOG_PATH)
        if loaded.get("catalogVersion") == 1:
            previous = {
                record["id"]: record
                for record in loaded.get("assets", [])
                if isinstance(record, dict) and isinstance(record.get("id"), str)
            }

    assets: list[dict[str, Any]] = []
    regenerated = 0
    for asset_id in ids:
        source = sources[asset_id]
        checksum = source["sha256"]
        old = previous.get(asset_id)
        if record_is_reusable(old, checksum):
            assets.append(old)
            continue

        image = srgb_image(source["resolvedPath"])
        width, height, aspect, orientation, average = image_metrics(image)
        variant_payload: dict[str, Any] = {}
        Image, ImageCms, _, _ = import_imaging()
        srgb_profile = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()
        for name, specification in VARIANTS.items():
            target_width, target_height = target_dimensions(width, height, specification["maxSize"])
            resized = image if (target_width, target_height) == image.size else image.resize(
                (target_width, target_height), Image.Resampling.LANCZOS, reducing_gap=3.0
            )
            jpeg = GENERATED_ROOT / name / f"{asset_id}.jpg"
            webp = GENERATED_ROOT / name / f"{asset_id}.webp"
            atomic_image_save(
                resized,
                jpeg,
                "JPEG",
                quality=specification["jpegQuality"],
                subsampling=0,
                optimize=True,
                progressive=True,
                icc_profile=srgb_profile,
            )
            atomic_image_save(
                resized,
                webp,
                "WEBP",
                quality=specification["webpQuality"],
                method=6,
                icc_profile=srgb_profile,
            )
            variant_payload[name] = variant_record(asset_id, name, target_width, target_height)
        image.close()
        assets.append(
            {
                "id": asset_id,
                "sourceChecksum": checksum,
                "variantVersion": VARIANT_VERSION,
                "width": width,
                "height": height,
                "aspectRatio": round(aspect, 8),
                "orientation": orientation,
                "averageColor": average,
                "variants": variant_payload,
            }
        )
        regenerated += 1
        print(f"generated {asset_id}")

    payload = {
        "catalogVersion": 1,
        "variantVersion": VARIANT_VERSION,
        "assetCount": len(assets),
        "assets": assets,
    }
    changed = atomic_json(CATALOG_PATH, payload)
    print(f"Catalog ready: {len(assets)} assets; regenerated {regenerated}; catalog {'updated' if changed else 'unchanged'}")
    return payload


def verify_catalog(ids: list[str], sources: dict[str, dict[str, Any]]) -> None:
    catalog = load_json(CATALOG_PATH)
    if catalog.get("catalogVersion") != 1 or catalog.get("variantVersion") != VARIANT_VERSION:
        raise CatalogError(f"asset-catalog.json must use catalogVersion 1 and variantVersion {VARIANT_VERSION}")
    assets = catalog.get("assets")
    if not isinstance(assets, list) or catalog.get("assetCount") != len(assets):
        raise CatalogError("asset-catalog.json assetCount does not match assets[]")
    records = {record.get("id"): record for record in assets if isinstance(record, dict)}
    if len(records) != len(assets) or set(records) != set(ids):
        raise CatalogError("asset-catalog.json must contain exactly the selected manifest IDs")
    for asset_id in ids:
        record = records[asset_id]
        if record.get("sourceChecksum") != sources[asset_id]["sha256"]:
            raise CatalogError(f"Catalog checksum drift for {asset_id}")
        variants = record.get("variants")
        if not isinstance(variants, dict):
            raise CatalogError(f"Catalog variants are missing for {asset_id}")
        for name in VARIANTS:
            value = variants.get(name)
            if not isinstance(value, dict):
                raise CatalogError(f"Catalog variant {name} is missing for {asset_id}")
            expected_urls = {
                "jpeg": f"/_generated/{name}/{asset_id}.jpg",
                "webp": f"/_generated/{name}/{asset_id}.webp",
            }
            for key, url in expected_urls.items():
                if value.get(key) != url:
                    raise CatalogError(f"Unexpected {name}.{key} URL for {asset_id}")
                file_path = SITE / "public" / url.removeprefix("/")
                if not file_path.is_file() or file_path.stat().st_size <= 0:
                    raise CatalogError(f"Missing generated variant: {file_path}")
            if not isinstance(value.get("width"), int) or not isinstance(value.get("height"), int):
                raise CatalogError(f"Variant dimensions are missing for {asset_id}/{name}")
    print(f"Validated {len(ids)} selected masters and {len(ids) * len(VARIANTS) * 2} responsive files")


def stale_files(ids: list[str]) -> list[Path]:
    allowed = {f"{asset_id}.{extension}" for asset_id in ids for extension in ("jpg", "webp")}
    stale: list[Path] = []
    for name in VARIANTS:
        directory = (GENERATED_ROOT / name).resolve()
        if not directory.is_relative_to(GENERATED_ROOT.resolve()):
            raise CatalogError(f"Unsafe generated directory: {directory}")
        if not directory.exists():
            continue
        for path in directory.iterdir():
            if path.is_file() and path.name not in allowed:
                stale.append(path)
    return sorted(stale)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="validate committed catalog and variants")
    parser.add_argument("--generate", action="store_true", help="incrementally generate variants/catalog")
    parser.add_argument("--prune-stale", action="store_true", help="report stale responsive files")
    parser.add_argument("--apply-prune", action="store_true", help="delete the reported stale responsive files")
    args = parser.parse_args()
    if not any((args.check, args.generate, args.prune_stale)):
        args.check = True
    if args.apply_prune and not args.prune_stale:
        raise CatalogError("--apply-prune requires --prune-stale")

    _, ids, sources = verify_inputs()
    if args.generate:
        compile_catalog(ids, sources)
    if args.check:
        verify_catalog(ids, sources)
    if args.prune_stale:
        stale = stale_files(ids)
        print(f"Stale responsive files: {len(stale)}")
        for path in stale:
            print(path.relative_to(ROOT))
        if args.apply_prune:
            for path in stale:
                path.unlink()
            print(f"Removed {len(stale)} stale responsive files; recoverable from Git history")
        elif stale:
            print("Dry run only. Re-run with --apply-prune after reviewing this list.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except CatalogError as error:
        raise SystemExit(f"catalog error: {error}")
