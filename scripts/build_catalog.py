#!/usr/bin/env python3

from __future__ import annotations

import base64
import datetime as dt
import hashlib
import json
import math
import os
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests
from PIL import Image, ImageOps, ImageStat

WORKSPACE_ROOT = Path(__file__).resolve().parents[1]
SITE_ROOT = WORKSPACE_ROOT / "site"
APP_ROOT = SITE_ROOT if SITE_ROOT.exists() else WORKSPACE_ROOT
ARCHIVE_DIR = WORKSPACE_ROOT / ".archive"
SOURCE_ROOT = ARCHIVE_DIR if ARCHIVE_DIR.exists() else WORKSPACE_ROOT
CONTENT_DIR = APP_ROOT / "content"
PUBLIC_DIR = APP_ROOT / "public"
GENERATED_DIR = PUBLIC_DIR / "_generated"
DISPLAY_DIR = GENERATED_DIR / "display"
THUMB_DIR = GENERATED_DIR / "thumbs"

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".avif"}
EXCLUDED_ROOTS = {
    ".git",
    "node_modules",
    ".next",
    "out",
    "public",
    "app",
    "components",
    "content",
    "lib",
    "scripts",
    "site",
}
DERIVATIVE_SOURCES = {"After Hours", "Prints", "Posts"}
ANALYSIS_MODEL = os.getenv("OPENAI_VISION_MODEL", "gpt-4.1-mini")
MIN_SERIES_SIZE = 6
TARGET_MIN_SERIES = 22
TARGET_MAX_SERIES = 28

TITLE_MODIFIERS = [
    "Afterlight",
    "Blue",
    "Broken",
    "Cold",
    "Concrete",
    "Crosswind",
    "Drift",
    "Electric",
    "Faded",
    "Glass",
    "Harbor",
    "Late",
    "Monsoon",
    "Night",
    "Northern",
    "Paper",
    "Quiet",
    "Signal",
    "Silver",
    "Still",
    "Transit",
    "Velvet",
    "White",
    "Wild",
]

TITLE_NOUNS = [
    "Archive",
    "Corridor",
    "Distance",
    "Echo",
    "Frame",
    "Hours",
    "Margin",
    "Passage",
    "Platform",
    "Residue",
    "Route",
    "Sequence",
    "Signal",
    "Study",
    "Tide",
    "Transit",
    "Weather",
    "Window",
]

PUBLIC_SOURCE_LABELS = {
    "After Hours": "After Hours",
    "Copenhagen": "Copenhagen",
    "Hong Kong": "Hong Kong",
    "India UAE 2025": "India / UAE",
    "Japan": "Japan",
    "Posts": "Social Drafts",
    "Prints": "Print Archive",
    "Ricoh Griiix": "Pocket Camera",
    "Snow": "Winter Study",
    "Spring": "Spring",
    "Switzerland": "Switzerland",
    "Taiwan Malaysia Singapore": "Taiwan / Malaysia / Singapore",
}

SOURCE_TITLE_MODIFIERS = {
    "After Hours": ["Closing", "Afterlight", "Midnight", "Storefront", "Late"],
    "Copenhagen": ["Northern", "Brick", "Harbor", "Blue", "Quiet"],
    "Hong Kong": ["Harbor", "Neon", "Glass", "Vertical", "Night"],
    "India UAE 2025": ["Heat", "Mirage", "Gulf", "Signal", "Dust"],
    "Japan": ["Lantern", "Platform", "Glass", "Quiet", "Rain"],
    "Posts": ["Proof", "Paper", "Draft", "Loose", "Posted"],
    "Prints": ["Paper", "Ink", "Proof", "Silver", "Archive"],
    "Ricoh Griiix": ["Pocket", "Quick", "Sidewalk", "Street", "Passing"],
    "Snow": ["White", "Winter", "Cold", "Pale", "Silent"],
    "Spring": ["Soft", "Silver", "Open", "Tender", "Pale"],
    "Switzerland": ["Alpine", "Cold", "Clear", "Still", "Glacier"],
    "Taiwan Malaysia Singapore": ["Monsoon", "Humid", "Tropic", "Wet", "Electric"],
}

SOURCE_TITLE_NOUNS = {
    "After Hours": ["Window", "Counter", "Glow", "Threshold", "Static"],
    "Copenhagen": ["Facade", "Harbor", "Passage", "Weather", "Street"],
    "Hong Kong": ["Harbor", "Lift", "Window", "Passage", "Signal"],
    "India UAE 2025": ["Terminal", "Passage", "Heat", "Crossing", "Margin"],
    "Japan": ["Platform", "Crossing", "Passage", "Window", "Signal"],
    "Posts": ["Sequence", "Draft", "Contact", "Sheet", "Stream"],
    "Prints": ["Archive", "Residue", "Proof", "Memory", "Sheet"],
    "Ricoh Griiix": ["Note", "Drift", "Fragment", "Walk", "Trace"],
    "Snow": ["Margin", "Signal", "Silence", "Field", "Interval"],
    "Spring": ["Distance", "Weather", "Bloom", "Light", "Air"],
    "Switzerland": ["Passage", "Ascent", "Platform", "Line", "Interval"],
    "Taiwan Malaysia Singapore": ["Passage", "Rain", "Market", "Transit", "Humidity"],
}


@dataclass
class RawRecord:
    source_path: str
    absolute_path: Path
    id_seed: str
    checksum: str
    normalized_stem: str
    width: int
    height: int
    aspect_ratio: float
    orientation: str
    perceptual_hash: str
    average_color: str
    brightness: float
    capture_year: str
    top_level: str
    path_parts: list[str]
    basename: str
    score: int
    display_path: str
    thumb_path: str


class UnionFind:
    def __init__(self) -> None:
        self.parent: dict[str, str] = {}

    def add(self, value: str) -> None:
        self.parent.setdefault(value, value)

    def find(self, value: str) -> str:
        parent = self.parent.setdefault(value, value)
        if parent == value:
            return value
        root = self.find(parent)
        self.parent[value] = root
        return root

    def union(self, left: str, right: str) -> None:
        left_root = self.find(left)
        right_root = self.find(right)
        if left_root != right_root:
            self.parent[right_root] = left_root

    def groups(self) -> dict[str, list[str]]:
        result: dict[str, list[str]] = defaultdict(list)
        for value in self.parent:
            result[self.find(value)].append(value)
        return result


def main() -> None:
    ensure_directories()
    files = walk_archive(SOURCE_ROOT, SOURCE_ROOT)
    existing_analyses = load_existing_analyses()
    raw_records: list[RawRecord] = []

    print(f"Scanning {len(files)} source images...")
    for index, source_path in enumerate(files, start=1):
        raw_records.append(build_raw_record(source_path))
        if index % 20 == 0 or index == len(files):
            print(f"  processed {index}/{len(files)}")

    grouped = group_variants(raw_records)
    canonical_assets = grouped["canonical_assets"]
    hidden_variant_paths = grouped["hidden_variant_paths"]
    analyses = analyze_assets(canonical_assets, existing_analyses)
    series = build_series_catalog(canonical_assets, analyses)

    photo_catalog = {
        "generatedAt": iso_now(),
        "canonicalPhotoCount": len(canonical_assets),
        "variantGroupCount": len({asset["variantGroupId"] for asset in canonical_assets}),
        "assets": canonical_assets,
        "analyses": analyses,
        "hiddenVariantPaths": hidden_variant_paths,
    }

    series_catalog = {
        "generatedAt": iso_now(),
        "totalSeries": len(series),
        "series": series,
    }

    (CONTENT_DIR / "photo-analysis.json").write_text(f"{json.dumps(photo_catalog, indent=2)}\n", encoding="utf-8")
    (CONTENT_DIR / "series.json").write_text(f"{json.dumps(series_catalog, indent=2)}\n", encoding="utf-8")

    print(f"Scanned {len(files)} images.")
    print(f"Canonical images: {len(canonical_assets)}")
    print(f"Hidden variants: {len(hidden_variant_paths)}")
    print(f"Series generated: {len(series)}")


def ensure_directories() -> None:
    CONTENT_DIR.mkdir(parents=True, exist_ok=True)
    DISPLAY_DIR.mkdir(parents=True, exist_ok=True)
    THUMB_DIR.mkdir(parents=True, exist_ok=True)


def walk_archive(directory: Path, source_root: Path) -> list[str]:
    results: list[str] = []
    for entry in sorted(directory.iterdir(), key=lambda item: item.name.lower()):
        if entry.name.startswith("."):
            continue
        relative = entry.relative_to(source_root)
        first_segment = relative.parts[0] if relative.parts else ""
        if entry.is_dir():
            if first_segment in EXCLUDED_ROOTS or first_segment.startswith("node_modules"):
                continue
            results.extend(walk_archive(entry, source_root))
            continue

        if entry.suffix.lower() in IMAGE_EXTENSIONS:
            results.append(relative.as_posix())
    return results


def build_raw_record(source_path: str) -> RawRecord:
    absolute_path = SOURCE_ROOT / source_path
    checksum = sha1_file(absolute_path)
    basename = absolute_path.name
    normalized_stem = normalize_stem(absolute_path.stem)

    with Image.open(absolute_path) as image_handle:
        capture_year = extract_capture_year(image_handle, absolute_path)
        image = ImageOps.exif_transpose(image_handle).convert("RGB")
        width, height = image.size
        aspect_ratio = round(width / height, 4)
        orientation = get_orientation(width, height)
        stat = ImageStat.Stat(image)
        brightness = round(stat.mean[0] / 255, 4)
        average_color = rgb_to_hex(stat.mean[:3])
        perceptual_hash = create_perceptual_hash(image)

        id_seed = f"{checksum[:12]}-{slugify(absolute_path.stem)[:28]}"
        display_output = DISPLAY_DIR / f"{id_seed}.jpg"
        thumb_output = THUMB_DIR / f"{id_seed}.jpg"
        write_derivative(image, display_output, 2200, 82)
        write_derivative(image, thumb_output, 720, 72)

    path_parts = source_path.split("/")
    top_level = path_parts[0] if path_parts else "Archive"

    return RawRecord(
        source_path=source_path,
        absolute_path=absolute_path,
        id_seed=id_seed,
        checksum=checksum,
        normalized_stem=normalized_stem,
        width=width,
        height=height,
        aspect_ratio=aspect_ratio,
        orientation=orientation,
        perceptual_hash=perceptual_hash,
        average_color=average_color,
        brightness=brightness,
        capture_year=capture_year,
        top_level=top_level,
        path_parts=path_parts,
        basename=basename,
        score=source_priority(source_path, width, height),
        display_path=f"/_generated/display/{id_seed}.jpg",
        thumb_path=f"/_generated/thumbs/{id_seed}.jpg",
    )


def write_derivative(image: Image.Image, destination: Path, max_size: int, quality: int) -> None:
    if destination.exists():
        return
    derived = image.copy()
    derived.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    derived.save(destination, format="JPEG", quality=quality)


def group_variants(raw_records: list[RawRecord]) -> dict[str, Any]:
    checksum_groups: dict[str, list[RawRecord]] = defaultdict(list)
    for record in raw_records:
        checksum_groups[record.checksum].append(record)

    exact_hidden: set[str] = set()
    unique_records: list[RawRecord] = []
    for records in checksum_groups.values():
        canonical = select_canonical_record(records)
        unique_records.append(canonical)
        for record in records:
            if record.source_path != canonical.source_path:
                exact_hidden.add(record.source_path)

    union_find = UnionFind()
    for record in unique_records:
        union_find.add(record.source_path)

    for index, record in enumerate(unique_records):
        for candidate in unique_records[index + 1 :]:
            if should_merge_variants(record, candidate):
                union_find.union(record.source_path, candidate.source_path)

    hidden_variant_paths = set(exact_hidden)
    canonical_assets: list[dict[str, Any]] = []
    unique_by_path = {record.source_path: record for record in unique_records}

    for group in union_find.groups().values():
        records = sorted((unique_by_path[path] for path in group), key=lambda item: item.score, reverse=True)
        canonical = records[0]
        variant_group_id = f"variant-{canonical.checksum[:10]}"

        for record in records[1:]:
            hidden_variant_paths.add(record.source_path)

        canonical_assets.append(
            {
                "id": canonical.id_seed,
                "sourcePath": canonical.source_path,
                "canonicalPath": canonical.source_path,
                "displayPath": canonical.display_path,
                "thumbPath": canonical.thumb_path,
                "width": canonical.width,
                "height": canonical.height,
                "aspectRatio": canonical.aspect_ratio,
                "orientation": canonical.orientation,
                "checksum": canonical.checksum,
                "perceptualHash": canonical.perceptual_hash,
                "averageColor": canonical.average_color,
                "brightness": canonical.brightness,
                "variantGroupId": variant_group_id,
                "captureYear": canonical.capture_year,
                "provenance": {
                    "topLevel": canonical.top_level,
                    "pathParts": canonical.path_parts,
                    "basename": canonical.basename,
                },
            }
        )

    canonical_assets.sort(key=lambda asset: asset["sourcePath"])

    return {
        "canonical_assets": canonical_assets,
        "hidden_variant_paths": sorted(hidden_variant_paths),
    }


def select_canonical_record(records: list[RawRecord]) -> RawRecord:
    return sorted(records, key=lambda item: item.score, reverse=True)[0]


def should_merge_variants(left: RawRecord, right: RawRecord) -> bool:
    distance = hamming_distance(left.perceptual_hash, right.perceptual_hash)
    same_orientation = left.orientation == right.orientation
    similar_shape = abs(left.aspect_ratio - right.aspect_ratio) < 0.08
    stem_match = (
        left.normalized_stem == right.normalized_stem
        and is_specific_stem(left.normalized_stem)
    )
    derived_match = left.top_level in DERIVATIVE_SOURCES or right.top_level in DERIVATIVE_SOURCES
    same_top_level = left.top_level == right.top_level
    close_brightness = abs(left.brightness - right.brightness) < 0.12

    if stem_match and (derived_match or same_top_level):
        return True
    if stem_match and distance <= 6 and similar_shape:
        return True
    if distance <= 4 and same_orientation and similar_shape and (derived_match or same_top_level or close_brightness):
        return True
    if derived_match and distance <= 6 and similar_shape and close_brightness:
        return True
    if distance <= 2 and similar_shape and close_brightness:
        return True
    return False


def load_existing_analyses() -> dict[str, dict[str, Any]]:
    target = CONTENT_DIR / "photo-analysis.json"
    if not target.exists():
        return {}

    raw = json.loads(target.read_text(encoding="utf-8"))
    asset_by_id = {asset["id"]: asset for asset in raw.get("assets", [])}
    result: dict[str, dict[str, Any]] = {}
    for analysis in raw.get("analyses", []):
        asset = asset_by_id.get(analysis["photoId"])
        if asset:
            result[asset["checksum"]] = analysis
    return result


def analyze_assets(assets: list[dict[str, Any]], existing_analyses: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    analyses: list[dict[str, Any]] = []
    api_key = os.getenv("OPENAI_API_KEY")

    for asset in assets:
        cached = existing_analyses.get(asset["checksum"])
        if cached:
            refreshed = dict(cached)
            refreshed["photoId"] = asset["id"]
            analyses.append(refreshed)
            continue

        if api_key:
            try:
                analyses.append(analyze_with_openai(api_key, asset))
                continue
            except Exception as error:  # noqa: BLE001
                print(f"AI analysis failed for {asset['sourcePath']}: {error}")

        analyses.append(analyze_heuristically(asset))

    return analyses


def analyze_with_openai(api_key: str, asset: dict[str, Any]) -> dict[str, Any]:
    thumb_path = PUBLIC_DIR / asset["thumbPath"].lstrip("/")
    payload = {
        "model": ANALYSIS_MODEL,
        "input": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": (
                            "Analyze this photograph for editorial sequencing. Return JSON only with keys: "
                            "sceneType, locationCue, narrativeKeywords, moodKeywords, duplicateConfidence, "
                            "sequenceRole, confidence, rationale. sequenceRole must be one of "
                            "anchor, bridge, pivot, texture, release, coda. narrativeKeywords and moodKeywords "
                            "must each have exactly 3 short strings."
                        ),
                    },
                    {
                        "type": "input_image",
                        "image_url": f"data:image/jpeg;base64,{base64.b64encode(thumb_path.read_bytes()).decode('utf-8')}",
                    },
                ],
            }
        ],
    }

    response = requests.post(
        "https://api.openai.com/v1/responses",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=120,
    )
    response.raise_for_status()
    data = response.json()
    text = data.get("output_text") or extract_output_text(data)
    parsed = json.loads(extract_json(text))

    return {
        "photoId": asset["id"],
        "sceneType": parsed["sceneType"],
        "locationCue": parsed.get("locationCue"),
        "narrativeKeywords": parsed["narrativeKeywords"][:3],
        "moodKeywords": parsed["moodKeywords"][:3],
        "duplicateConfidence": clamp_number(float(parsed.get("duplicateConfidence", 0.25)), 0, 1),
        "sequenceRole": normalize_sequence_role(parsed.get("sequenceRole", "texture")),
        "confidence": clamp_number(float(parsed.get("confidence", 0.75)), 0, 1),
        "analysisMode": "ai",
        "rationale": parsed.get("rationale", "AI-generated editorial read."),
    }


def analyze_heuristically(asset: dict[str, Any]) -> dict[str, Any]:
    basename = asset["provenance"]["basename"].lower()
    top_level = asset["provenance"]["topLevel"].lower()
    brightness_band = "night" if asset["brightness"] < 0.34 else "twilight" if asset["brightness"] < 0.56 else "daylight"
    cool_tone = is_cool_color(asset["averageColor"])
    scene_type = infer_scene_type(top_level, basename, brightness_band)

    return {
        "photoId": asset["id"],
        "sceneType": scene_type,
        "locationCue": infer_location_cue(asset["provenance"]["pathParts"]),
        "narrativeKeywords": infer_narrative_keywords(top_level, brightness_band, asset["orientation"]),
        "moodKeywords": infer_mood_keywords(brightness_band, cool_tone, scene_type),
        "duplicateConfidence": 0.22,
        "sequenceRole": infer_sequence_role(asset, brightness_band),
        "confidence": 0.46,
        "analysisMode": "heuristic",
        "rationale": (
            f"Fallback analysis based on brightness, orientation, filename tokens, and archive provenance for "
            f"{asset['provenance']['topLevel']}."
        ),
    }


def build_series_catalog(assets: list[dict[str, Any]], analyses: list[dict[str, Any]]) -> list[dict[str, Any]]:
    analysis_map = {analysis["photoId"]: analysis for analysis in analyses}
    asset_map = {asset["id"]: asset for asset in assets}
    provenance_buckets: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for asset in assets:
        key = asset["provenance"]["topLevel"]
        provenance_buckets[key].append(asset)

    bucket_entries = [(key, sorted(bucket, key=sort_key_for_sequence)) for key, bucket in provenance_buckets.items()]
    split_counts = allocate_bucket_series_counts(bucket_entries)
    seeds = [seed for key, bucket in bucket_entries for seed in split_bucket_into_chapters(key, bucket, split_counts[key], analysis_map)]

    series = [build_series(seed, asset_map, analysis_map) for seed in seeds]
    series.sort(key=lambda item: next(asset["brightness"] for asset in assets if asset["id"] == item["coverPhotoId"]))
    dedupe_series_titles(series)

    for index, item in enumerate(series, start=1):
        item["portfolioIndex"] = index
        item["slug"] = f"{index:02d}-{slugify(item['title'])}"
        item["id"] = f"series-{index:02d}"

    return series


def allocate_bucket_series_counts(bucket_entries: list[tuple[str, list[dict[str, Any]]]]) -> dict[str, int]:
    desired_total = min(
        TARGET_MAX_SERIES,
        max(TARGET_MIN_SERIES, round(sum(len(bucket) for _, bucket in bucket_entries) / 12)),
    )
    counts = {key: 1 for key, _ in bucket_entries}
    remaining = desired_total - len(bucket_entries)

    while remaining > 0:
        candidates = []
        for key, bucket in bucket_entries:
            current = counts[key]
            max_count = max(1, len(bucket) // MIN_SERIES_SIZE)
            if current >= max_count:
                continue
            score = len(bucket) / current
            candidates.append((score, len(bucket), key))

        if not candidates:
            break

        _, _, key = max(candidates)
        counts[key] += 1
        remaining -= 1

    return counts


def split_bucket_into_chapters(
    key: str,
    bucket: list[dict[str, Any]],
    split_count: int,
    analysis_map: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    segments = [bucket]

    while len(segments) < split_count:
        best_segment_index = None
        best_boundary = None
        best_score = -1.0

        for segment_index, segment in enumerate(segments):
            if len(segment) < MIN_SERIES_SIZE * 2:
                continue
            boundary, boundary_score = find_best_boundary(segment, analysis_map)
            if boundary is not None and boundary_score > best_score:
                best_segment_index = segment_index
                best_boundary = boundary
                best_score = boundary_score

        if best_segment_index is None or best_boundary is None:
            break

        segment = segments.pop(best_segment_index)
        left_segment = segment[:best_boundary]
        right_segment = segment[best_boundary:]
        segments.insert(best_segment_index, left_segment)
        segments.insert(best_segment_index + 1, right_segment)

    return [
        {
            "key": key,
            "chapterIndex": index + 1,
            "chapterCount": len(segments),
            "photoIds": [asset["id"] for asset in segment],
        }
        for index, segment in enumerate(segments)
        if segment
    ]


def find_best_boundary(
    segment: list[dict[str, Any]],
    analysis_map: dict[str, dict[str, Any]],
) -> tuple[int | None, float]:
    best_boundary = None
    best_score = -1.0

    for boundary in range(MIN_SERIES_SIZE, len(segment) - MIN_SERIES_SIZE + 1):
        left_asset = segment[boundary - 1]
        right_asset = segment[boundary]
        score = score_boundary(left_asset, right_asset, analysis_map)
        if score > best_score:
            best_boundary = boundary
            best_score = score

    return best_boundary, best_score


def score_boundary(
    left_asset: dict[str, Any],
    right_asset: dict[str, Any],
    analysis_map: dict[str, dict[str, Any]],
) -> float:
    left_analysis = analysis_map[left_asset["id"]]
    right_analysis = analysis_map[right_asset["id"]]
    left_tags = asset_tag_set(left_analysis)
    right_tags = asset_tag_set(right_analysis)
    overlap = len(left_tags & right_tags) / max(len(left_tags | right_tags), 1)

    score = abs(left_asset["brightness"] - right_asset["brightness"]) * 2.1
    score += (1 - overlap) * 1.35
    score += 0.85 if left_analysis["sceneType"] != right_analysis["sceneType"] else 0
    score += 0.35 if left_asset["orientation"] != right_asset["orientation"] else 0
    score += 0.3 if left_asset.get("captureYear") != right_asset.get("captureYear") else 0
    score += 0.25 if left_asset["provenance"]["pathParts"][1:2] != right_asset["provenance"]["pathParts"][1:2] else 0
    return score


def asset_tag_set(analysis: dict[str, Any]) -> set[str]:
    return {
        analysis["sceneType"].lower(),
        *(keyword.lower() for keyword in analysis.get("narrativeKeywords", [])),
        *(keyword.lower() for keyword in analysis.get("moodKeywords", [])),
    }


def build_series(
    seed: dict[str, Any],
    asset_map: dict[str, dict[str, Any]],
    analysis_map: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    photo_assets = sorted((asset_map[photo_id] for photo_id in seed["photoIds"]), key=sort_key_for_sequence)
    cover = select_cover_photo(photo_assets, analysis_map)
    tags = collect_series_tags(photo_assets, analysis_map)
    dominant_scene = most_frequent([analysis_map[asset["id"]]["sceneType"] for asset in photo_assets])
    location_cue = public_label_for_source(seed["key"])
    moods = collect_top_keywords(
        [keyword for asset in photo_assets for keyword in analysis_map[asset["id"]]["moodKeywords"]],
        3,
    )
    capture_years = [asset["captureYear"] for asset in photo_assets if asset.get("captureYear")]
    title = build_editorial_title(seed, dominant_scene, moods, tags)
    archive_label = location_cue or dominant_scene
    archive_year = most_frequent(capture_years) or ""
    credits = build_series_credits(photo_assets, archive_label, archive_year)
    project_information = build_project_information(title, dominant_scene, archive_label, tags, photo_assets)

    return {
        "id": "",
        "slug": "",
        "title": title,
        "subtitle": build_series_subtitle(archive_label, dominant_scene, tags, len(photo_assets)),
        "synopsis": build_series_synopsis(dominant_scene, moods, tags),
        "tags": tags,
        "coverPhotoId": cover["id"],
        "previewPhotoIds": select_preview_ids(photo_assets),
        "photoIds": [asset["id"] for asset in photo_assets],
        "portfolioIndex": 0,
        "archiveLabel": archive_label,
        "archiveYear": archive_year,
        "credits": credits,
        "projectInformation": project_information,
    }


def collect_series_tags(assets: list[dict[str, Any]], analysis_map: dict[str, dict[str, Any]]) -> list[str]:
    keywords = []
    for asset in assets:
        analysis = analysis_map[asset["id"]]
        keywords.append(analysis["sceneType"])
        keywords.extend(analysis["narrativeKeywords"])
        keywords.extend(analysis["moodKeywords"])
    return collect_top_keywords(keywords, 4)


def collect_top_keywords(keywords: list[str], limit: int) -> list[str]:
    counts = Counter(keyword.lower() for keyword in keywords)
    return [keyword for keyword, _ in counts.most_common(limit)]


def build_editorial_title(seed: dict[str, Any], dominant_scene: str, moods: list[str], tags: list[str]) -> str:
    digest = hashlib.sha1(f"{seed['key']}-{'|'.join(seed['photoIds'])}".encode("utf-8")).hexdigest()
    modifier_pool = unique_preserve(
        SOURCE_TITLE_MODIFIERS.get(seed["key"], [])
        + TITLE_MODIFIERS
        + [keyword.title() for keyword in moods[:2] if keyword not in {"warm", "cool", "clear", "restless", "cinematic"}]
    )
    noun_pool = unique_preserve(
        SOURCE_TITLE_NOUNS.get(seed["key"], [])
        + TITLE_NOUNS
        + [word.title() for word in dominant_scene.lower().split() if word not in {"travel", "observation", "after"}]
    )
    modifier = modifier_pool[int(digest[:4], 16) % len(modifier_pool)]
    noun = noun_pool[int(digest[4:8], 16) % len(noun_pool)]
    if modifier.lower() == noun.lower():
        noun = next((value for value in noun_pool if value.lower() != modifier.lower()), noun)
    return f"{modifier} {noun}"


def build_series_subtitle(archive_label: str, dominant_scene: str, tags: list[str], photo_count: int) -> str:
    secondary = tags[0] if tags else dominant_scene.lower()
    return f"{archive_label}. {photo_count} photographs shaped around {dominant_scene.lower()} and {secondary}."


def build_series_synopsis(dominant_scene: str, moods: list[str], tags: list[str]) -> str:
    first_mood = moods[0] if moods else "quiet"
    second_mood = moods[1] if len(moods) > 1 else "distance"
    movement = tags[1] if len(tags) > 1 else "passage"
    return f"A {first_mood} sequence that moves through {dominant_scene.lower()}, {second_mood}, and {movement}."


def select_preview_ids(assets: list[dict[str, Any]]) -> list[str]:
    count = min(5, max(3, 5 if len(assets) >= 5 else len(assets)))
    preview_ids: list[str] = []
    for index in range(count):
        normalized = 0 if count == 1 else index / (count - 1)
        asset = assets[min(len(assets) - 1, round(normalized * (len(assets) - 1)))]
        if asset["id"] not in preview_ids:
            preview_ids.append(asset["id"])
    return preview_ids


def sort_key_for_sequence(asset: dict[str, Any]) -> tuple[Any, ...]:
    return (asset["captureYear"] or "9999", asset["sourcePath"].lower(), asset["brightness"])


def select_cover_photo(assets: list[dict[str, Any]], analysis_map: dict[str, dict[str, Any]]) -> dict[str, Any]:
    def cover_score(asset: dict[str, Any]) -> tuple[float, float, str]:
        role = analysis_map[asset["id"]]["sequenceRole"]
        role_weight = {
            "anchor": 0,
            "pivot": 1,
            "bridge": 2,
            "texture": 3,
            "release": 4,
            "coda": 5,
        }.get(role, 6)
        brightness_distance = abs(asset["brightness"] - 0.46)
        return (role_weight, brightness_distance, asset["sourcePath"])

    return min(assets, key=cover_score)


def dedupe_series_titles(series: list[dict[str, Any]]) -> None:
    seen: set[str] = set()
    for item in series:
        title = item["title"]
        if title not in seen:
            seen.add(title)
            continue

        prefix = title.split()[0]
        source_key = source_key_for_label(item["archiveLabel"])
        replacement_nouns = unique_preserve(SOURCE_TITLE_NOUNS.get(source_key, []) + TITLE_NOUNS)
        candidate = title
        for noun in replacement_nouns:
            if noun.lower() == prefix.lower():
                continue
            candidate = f"{prefix} {noun}"
            if candidate not in seen:
                break
        item["title"] = candidate
        seen.add(candidate)


def public_label_for_source(value: str) -> str:
    return PUBLIC_SOURCE_LABELS.get(value, value)


def source_key_for_label(value: str) -> str:
    for source_key, label in PUBLIC_SOURCE_LABELS.items():
        if label == value:
            return source_key
    return value


def unique_preserve(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        key = value.lower()
        if key in seen or not value.strip():
            continue
        seen.add(key)
        result.append(value)
    return result


def infer_scene_type(top_level: str, basename: str, brightness_band: str) -> str:
    joined = f"{top_level} {basename}"
    if "snow" in joined:
        return "Snow Study"
    if "print" in joined:
        return "Print Memory"
    if "ricoh" in joined:
        return "Street Fragments"
    if brightness_band == "night":
        return "After Hours"
    return "Travel Observation"


def infer_narrative_keywords(top_level: str, brightness_band: str, orientation: str) -> list[str]:
    return [
        "night" if brightness_band == "night" else "transition" if brightness_band == "twilight" else "open-air",
        "figure-scale" if orientation == "portrait" else "spatial-distance",
        "memory" if top_level in {item.lower() for item in DERIVATIVE_SOURCES} else "passage",
    ]


def infer_mood_keywords(brightness_band: str, cool_tone: bool, scene_type: str) -> list[str]:
    return [
        "nocturnal" if brightness_band == "night" else "restless" if brightness_band == "twilight" else "clear",
        "cool" if cool_tone else "warm",
        "hushed" if scene_type == "Snow Study" else "cinematic",
    ]


def infer_sequence_role(asset: dict[str, Any], brightness_band: str) -> str:
    if asset["orientation"] == "portrait" and brightness_band == "night":
        return "pivot"
    if asset["orientation"] == "portrait":
        return "anchor"
    if brightness_band == "night":
        return "bridge"
    if asset["aspectRatio"] > 1.6:
        return "release"
    return "texture"


def infer_location_cue(path_parts: list[str]) -> str | None:
    cue = re.sub(r"\d+", "", path_parts[0]).strip() if path_parts else ""
    return cue or None


def create_perceptual_hash(image: Image.Image) -> str:
    resized = image.convert("L").resize((9, 8), Image.Resampling.BILINEAR)
    pixels = list(resized.getdata())
    bits = []
    for row in range(8):
        for column in range(8):
            left = pixels[row * 9 + column]
            right = pixels[row * 9 + column + 1]
            bits.append("1" if left > right else "0")
    return binary_to_hex("".join(bits))


def hamming_distance(left: str, right: str) -> int:
    left_bits = hex_to_binary(left)
    right_bits = hex_to_binary(right)
    return sum(1 for l_bit, r_bit in zip(left_bits, right_bits, strict=False) if l_bit != r_bit)


def binary_to_hex(value: str) -> str:
    return "".join(f"{int(value[index:index + 4], 2):x}" for index in range(0, len(value), 4))


def hex_to_binary(value: str) -> str:
    return "".join(f"{int(char, 16):04b}" for char in value)


def source_priority(source_path: str, width: int, height: int) -> int:
    normalized = source_path.lower()
    score = width * height
    if normalized.startswith("after hours/") or "/after hours/" in normalized:
        score -= 1_750_000
    if normalized.startswith("prints/") or "/prints/" in normalized:
        score -= 4_000_000
    if normalized.startswith("posts/") or "/posts/" in normalized:
        score -= 2_500_000
    if "untitled export" in normalized:
        score -= 750_000
    if "curated_top_10" in normalized:
        score -= 1_500_000
    if normalized.endswith(".png"):
        score -= 250_000
    if "-edit" in normalized:
        score += 125_000
    return score


def extract_capture_year(image_handle: Image.Image, absolute_path: Path) -> str:
    exif = image_handle.getexif()
    candidates = [
        exif.get(36867),
        exif.get(36868),
        exif.get(306),
    ]
    for candidate in candidates:
        year = parse_year_value(candidate)
        if year:
            return year

    return dt.datetime.fromtimestamp(absolute_path.stat().st_mtime).strftime("%Y")


def parse_year_value(value: Any) -> str:
    if not value:
        return ""
    match = re.search(r"(19|20)\d{2}", str(value))
    return match.group(0) if match else ""


def build_series_credits(photo_assets: list[dict[str, Any]], archive_label: str, archive_year: str) -> str:
    orientation_mix = most_frequent([asset["orientation"] for asset in photo_assets]) or "mixed format"
    location = archive_label.replace("/", " / ").lower()
    year = archive_year or "undated"
    return f"{location} / {orientation_mix} sequence / {year}"


def build_project_information(
    title: str,
    dominant_scene: str,
    archive_label: str,
    tags: list[str],
    photo_assets: list[dict[str, Any]],
) -> str:
    dominant_orientation = most_frequent([asset["orientation"] for asset in photo_assets]) or "mixed"
    first_tag = tags[0] if tags else dominant_scene.lower()
    second_tag = tags[1] if len(tags) > 1 else archive_label.lower()
    return (
        f"{title} gathers {len(photo_assets)} photographs from {archive_label} into a focused {dominant_scene.lower()} chapter. "
        f"The sequence leans on {first_tag}, {second_tag}, and {dominant_orientation} frames so the edit shifts without repeating the same motif."
    )

def normalize_stem(stem: str) -> str:
    result = stem.lower()
    result = re.sub(r"(?:-|\s|_)?(?:edit|enhanced|nr|hdr|pano|copy|final|export)", "", result)
    result = re.sub(r"[^a-z0-9]+", "", result)
    if re.fullmatch(r"(?:dscf?\d+|img\d+|r\d+)", result):
        return result
    result = re.sub(r"\d+$", "", result)
    return result.strip()


def is_specific_stem(value: str) -> bool:
    generic = {"photo", "image", "img", "dsc", "dscf", "scan", "untitled"}
    return len(value) > 5 and (any(character.isdigit() for character in value) or value not in generic)


def slugify(value: str) -> str:
    slug = value.lower().replace("&", " and ")
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = re.sub(r"-{2,}", "-", slug)
    return slug.strip("-")


def get_orientation(width: int, height: int) -> str:
    ratio = width / height
    if ratio > 1.05:
        return "landscape"
    if ratio < 0.95:
        return "portrait"
    return "square"


def rgb_to_hex(values: list[float]) -> str:
    red, green, blue = (round(value) for value in values[:3])
    return f"#{red:02x}{green:02x}{blue:02x}"


def is_cool_color(hex_value: str) -> bool:
    red = int(hex_value[1:3], 16)
    blue = int(hex_value[5:7], 16)
    return blue >= red


def sha1_file(file_path: Path) -> str:
    digest = hashlib.sha1()
    with file_path.open("rb") as handle:
        while True:
            chunk = handle.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def normalize_sequence_role(value: str) -> str:
    if value in {"anchor", "bridge", "pivot", "texture", "release", "coda"}:
        return value
    return "texture"


def clamp_number(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def extract_output_text(payload: dict[str, Any]) -> str:
    output_text = []
    for item in payload.get("output", []):
        for content in item.get("content", []):
            if content.get("type") == "output_text":
                output_text.append(content.get("text", ""))
    return "\n".join(output_text)


def extract_json(raw_text: str) -> str:
    trimmed = raw_text.strip()
    if trimmed.startswith("{"):
        return trimmed
    match = re.search(r"\{[\s\S]*\}", trimmed)
    if not match:
        raise ValueError(f"Could not extract JSON from: {raw_text}")
    return match.group(0)


def most_frequent(values: list[str]) -> str:
    return Counter(values).most_common(1)[0][0] if values else ""


def iso_now() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat()


if __name__ == "__main__":
    main()
