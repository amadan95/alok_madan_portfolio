#!/usr/bin/env python3

from __future__ import annotations

import base64
import datetime as dt
import hashlib
import json
import math
import os
import re
import shutil
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any

try:
    import requests
except ModuleNotFoundError:
    requests = None

try:
    from PIL import Image, ImageOps, ImageStat
except ModuleNotFoundError:
    Image = None
    ImageOps = None
    ImageStat = None

WORKSPACE_ROOT = Path(__file__).resolve().parents[1]
SITE_ROOT = WORKSPACE_ROOT / "site"
APP_ROOT = SITE_ROOT if SITE_ROOT.exists() else WORKSPACE_ROOT
ARCHIVE_DIR = WORKSPACE_ROOT / ".archive"
SOURCE_ROOT = ARCHIVE_DIR if ARCHIVE_DIR.exists() else WORKSPACE_ROOT
CONTENT_DIR = APP_ROOT / "content"
PUBLIC_DIR = APP_ROOT / "public"
GENERATED_DIR = PUBLIC_DIR / "_generated"

VARIANT_SPECS = {
    "raw": {"max_size": 320, "jpeg_quality": 40, "webp_quality": 42},
    "thumb": {"max_size": 640, "jpeg_quality": 48, "webp_quality": 50},
    "rail": {"max_size": 1200, "jpeg_quality": 56, "webp_quality": 58},
    "hero": {"max_size": 1800, "jpeg_quality": 62, "webp_quality": 60},
}
VARIANT_DIRS = {name: GENERATED_DIR / name for name in VARIANT_SPECS}
LEGACY_GENERATED_DIRS = [GENERATED_DIR / "display", GENERATED_DIR / "thumbs"]

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
EXHIBIT_MANIFEST_PATH = CONTENT_DIR / "exhibit-manifest.json"
TARGET_ROOM_COUNT = 14
TARGET_EXHIBIT_COUNT = 260
ROOM_MIN_SIZE = 12
ROOM_MAX_SIZE = 24
ROOM_SIZE_PLAN = [16, 18, 18, 19, 19, 20, 20, 19, 18, 18, 18, 18, 19, 20]

ROOM_PROFILES = [
    {
        "title": "Threshold",
        "primaryTone": "arrival",
        "subtitle": "Thresholds, arrivals, and first public light.",
        "synopsis": "An opening room of crossings, lookout, and tentative approach.",
        "roomStatement": "The exhibition begins at the edge of disclosure: entries, crossings, and the first sensation that a place is about to reveal itself.",
        "lightModes": {"daylight": 1.0, "twilight": 0.78, "night": 0.2},
        "distanceWeights": {"far": 1.0, "mid": 0.82, "close": 0.38},
        "humanWeights": {"trace": 1.0, "present": 0.88, "dominant": 0.64, "none": 0.46},
        "sceneWeights": {"Travel Observation": 1.0, "Street Fragments": 0.78, "After Hours": 0.3, "Snow Study": 0.52, "Print Memory": 0.26},
        "toneWeights": {"threshold": 1.0, "transit": 0.95, "public": 0.85, "open-air": 0.72, "clear": 0.42},
        "energyTarget": 0.42,
        "intimacyTarget": 0.28,
        "surrealnessTarget": 0.22,
        "warmthTarget": 0.54,
    },
    {
        "title": "Drift",
        "primaryTone": "movement",
        "subtitle": "Slipstream movement and passing attention.",
        "synopsis": "Street movement loosens into glances, fragments, and unstable pace.",
        "roomStatement": "Drift stays with moving attention: bodies in passage, peripheral incidents, and the instability of seeing while still in motion.",
        "lightModes": {"daylight": 0.88, "twilight": 1.0, "night": 0.42},
        "distanceWeights": {"far": 0.72, "mid": 1.0, "close": 0.56},
        "humanWeights": {"trace": 0.9, "present": 1.0, "dominant": 0.7, "none": 0.2},
        "sceneWeights": {"Travel Observation": 0.9, "Street Fragments": 1.0, "After Hours": 0.55, "Snow Study": 0.22, "Print Memory": 0.18},
        "toneWeights": {"movement": 1.0, "glance": 0.88, "street": 0.86, "transit": 0.8, "public": 0.6},
        "energyTarget": 0.56,
        "intimacyTarget": 0.4,
        "surrealnessTarget": 0.3,
        "warmthTarget": 0.52,
    },
    {
        "title": "Crossing",
        "primaryTone": "encounter",
        "subtitle": "Bodies, paths, and public negotiation.",
        "synopsis": "Encounters, obstructions, and shared ground shape the room.",
        "roomStatement": "Crossing is built from encounter and negotiation, where paths intersect and the public frame tightens around gesture, blockage, and contact.",
        "lightModes": {"daylight": 0.84, "twilight": 1.0, "night": 0.48},
        "distanceWeights": {"far": 0.42, "mid": 0.96, "close": 1.0},
        "humanWeights": {"trace": 0.62, "present": 0.94, "dominant": 1.0, "none": 0.08},
        "sceneWeights": {"Travel Observation": 0.84, "Street Fragments": 1.0, "After Hours": 0.48, "Snow Study": 0.16, "Print Memory": 0.18},
        "toneWeights": {"encounter": 1.0, "public": 0.92, "crowd": 0.82, "figure": 0.78, "pressure": 0.4},
        "energyTarget": 0.67,
        "intimacyTarget": 0.56,
        "surrealnessTarget": 0.24,
        "warmthTarget": 0.5,
    },
    {
        "title": "Concourse",
        "primaryTone": "flow",
        "subtitle": "Transit, direction, and accumulating momentum.",
        "synopsis": "Signals, routes, and collective motion begin to press forward.",
        "roomStatement": "Concourse moves from incidental passage into directed flow, where paths, signals, and structural cues begin to gather force.",
        "lightModes": {"daylight": 0.62, "twilight": 1.0, "night": 0.62},
        "distanceWeights": {"far": 0.78, "mid": 1.0, "close": 0.36},
        "humanWeights": {"trace": 0.82, "present": 1.0, "dominant": 0.54, "none": 0.24},
        "sceneWeights": {"Travel Observation": 1.0, "Street Fragments": 0.82, "After Hours": 0.7, "Snow Study": 0.18, "Print Memory": 0.1},
        "toneWeights": {"transit": 1.0, "signal": 0.92, "movement": 0.78, "direction": 0.76, "public": 0.6},
        "energyTarget": 0.68,
        "intimacyTarget": 0.34,
        "surrealnessTarget": 0.32,
        "warmthTarget": 0.48,
    },
    {
        "title": "Pressure",
        "primaryTone": "density",
        "subtitle": "Density, compression, and urban heat.",
        "synopsis": "Close frames and stacked surfaces push the exhibition inward.",
        "roomStatement": "Pressure compresses the frame into density and friction, where closeness, heat, and layered surfaces overpower orientation.",
        "lightModes": {"daylight": 0.28, "twilight": 0.92, "night": 1.0},
        "distanceWeights": {"far": 0.18, "mid": 0.74, "close": 1.0},
        "humanWeights": {"trace": 0.56, "present": 0.86, "dominant": 1.0, "none": 0.16},
        "sceneWeights": {"Travel Observation": 0.54, "Street Fragments": 0.92, "After Hours": 1.0, "SnowStudy": 0.0, "Snow Study": 0.12, "PrintMemory": 0.0, "Print Memory": 0.18},
        "toneWeights": {"pressure": 1.0, "crowd": 0.86, "dense": 0.84, "heat": 0.74, "close": 0.72},
        "energyTarget": 0.84,
        "intimacyTarget": 0.62,
        "surrealnessTarget": 0.34,
        "warmthTarget": 0.58,
    },
    {
        "title": "Voltage",
        "primaryTone": "infrastructure",
        "subtitle": "Infrastructure, glare, and charged surfaces.",
        "synopsis": "Steel, glass, and signage turn the public city into voltage.",
        "roomStatement": "Voltage gathers the charged architecture of movement, where glass, signage, and reflective surfaces feel electrically alive.",
        "lightModes": {"daylight": 0.24, "twilight": 0.84, "night": 1.0},
        "distanceWeights": {"far": 0.54, "mid": 0.92, "close": 0.56},
        "humanWeights": {"trace": 0.7, "present": 0.62, "dominant": 0.34, "none": 0.82},
        "sceneWeights": {"Travel Observation": 0.72, "Street Fragments": 0.88, "After Hours": 1.0, "Snow Study": 0.08, "Print Memory": 0.32},
        "toneWeights": {"signal": 1.0, "glare": 0.88, "infrastructure": 0.86, "reflection": 0.8, "vertical": 0.62},
        "energyTarget": 0.78,
        "intimacyTarget": 0.42,
        "surrealnessTarget": 0.58,
        "warmthTarget": 0.42,
    },
    {
        "title": "Nocturne",
        "primaryTone": "night",
        "subtitle": "Nightfall, distance, and artificial glow.",
        "synopsis": "Darkness reorganizes space into withheld light and suspended distance.",
        "roomStatement": "Nocturne lets darkness redraw the image, turning streets and facades into withheld information, scattered glow, and long distance.",
        "lightModes": {"daylight": 0.0, "twilight": 0.56, "night": 1.0},
        "distanceWeights": {"far": 0.92, "mid": 0.74, "close": 0.28},
        "humanWeights": {"trace": 0.68, "present": 0.42, "dominant": 0.16, "none": 1.0},
        "sceneWeights": {"Travel Observation": 0.4, "Street Fragments": 0.7, "After Hours": 1.0, "Snow Study": 0.14, "Print Memory": 0.22},
        "toneWeights": {"night": 1.0, "glow": 0.92, "distance": 0.84, "quiet": 0.72, "cool": 0.56},
        "energyTarget": 0.52,
        "intimacyTarget": 0.3,
        "surrealnessTarget": 0.64,
        "warmthTarget": 0.36,
    },
    {
        "title": "Afterlight",
        "primaryTone": "residue",
        "subtitle": "Neon, residue, and the city after hours.",
        "synopsis": "Late images hold reflection, color bleed, and unfinished passage.",
        "roomStatement": "Afterlight stays with the city after its peak energy, when reflected color, wet surfaces, and lingering movement become the subject.",
        "lightModes": {"daylight": 0.08, "twilight": 0.7, "night": 1.0},
        "distanceWeights": {"far": 0.46, "mid": 0.92, "close": 0.74},
        "humanWeights": {"trace": 0.74, "present": 0.84, "dominant": 0.52, "none": 0.58},
        "sceneWeights": {"Travel Observation": 0.46, "Street Fragments": 0.8, "After Hours": 1.0, "Snow Study": 0.08, "Print Memory": 0.34},
        "toneWeights": {"afterlight": 1.0, "reflection": 0.92, "residue": 0.84, "night": 0.72, "wet": 0.62},
        "energyTarget": 0.62,
        "intimacyTarget": 0.5,
        "surrealnessTarget": 0.74,
        "warmthTarget": 0.46,
    },
    {
        "title": "Residue",
        "primaryTone": "memory",
        "subtitle": "Prints, traces, and held memory.",
        "synopsis": "Reproduction enters the exhibit as sediment rather than document.",
        "roomStatement": "Residue introduces the memory-bearing image: prints, reposted surfaces, and fragments that feel carried forward rather than freshly seen.",
        "lightModes": {"daylight": 0.42, "twilight": 0.66, "night": 0.8},
        "distanceWeights": {"far": 0.3, "mid": 0.76, "close": 1.0},
        "humanWeights": {"trace": 0.92, "present": 0.48, "dominant": 0.34, "none": 0.78},
        "sceneWeights": {"Travel Observation": 0.28, "Street Fragments": 0.46, "After Hours": 0.74, "Snow Study": 0.24, "Print Memory": 1.0},
        "toneWeights": {"memory": 1.0, "paper": 0.94, "residue": 0.88, "archive": 0.82, "echo": 0.72},
        "energyTarget": 0.3,
        "intimacyTarget": 0.56,
        "surrealnessTarget": 0.88,
        "warmthTarget": 0.48,
    },
    {
        "title": "Quiet Heat",
        "primaryTone": "pause",
        "subtitle": "Warm air, pause, and private drift.",
        "synopsis": "Intensity falls into stillness without fully settling.",
        "roomStatement": "Quiet Heat lowers the exhibition into a slower register, where warmth and pause carry more force than spectacle.",
        "lightModes": {"daylight": 0.74, "twilight": 0.92, "night": 0.32},
        "distanceWeights": {"far": 0.24, "mid": 0.84, "close": 1.0},
        "humanWeights": {"trace": 0.42, "present": 0.72, "dominant": 1.0, "none": 0.26},
        "sceneWeights": {"Travel Observation": 0.74, "Street Fragments": 0.52, "After Hours": 0.42, "Snow Study": 0.1, "Print Memory": 0.22},
        "toneWeights": {"warm": 1.0, "pause": 0.92, "intimate": 0.86, "drift": 0.72, "private": 0.7},
        "energyTarget": 0.34,
        "intimacyTarget": 0.76,
        "surrealnessTarget": 0.28,
        "warmthTarget": 0.72,
    },
    {
        "title": "Echo Field",
        "primaryTone": "hush",
        "subtitle": "Snow, hush, and reduced detail.",
        "synopsis": "Cold rooms pull the sequence toward silence and near-abstraction.",
        "roomStatement": "Echo Field narrows the visual world into cold air, reduced detail, and the acoustics of quiet looking.",
        "lightModes": {"daylight": 1.0, "twilight": 0.52, "night": 0.0},
        "distanceWeights": {"far": 0.88, "mid": 0.74, "close": 0.22},
        "humanWeights": {"trace": 0.64, "present": 0.34, "dominant": 0.1, "none": 1.0},
        "sceneWeights": {"Travel Observation": 0.44, "Street Fragments": 0.28, "After Hours": 0.0, "Snow Study": 1.0, "Print Memory": 0.24},
        "toneWeights": {"snow": 1.0, "hush": 0.94, "cold": 0.86, "distance": 0.8, "white": 0.72},
        "energyTarget": 0.18,
        "intimacyTarget": 0.24,
        "surrealnessTarget": 0.46,
        "warmthTarget": 0.18,
    },
    {
        "title": "Glass Lift",
        "primaryTone": "vertical",
        "subtitle": "Vertical distance and suspended looking.",
        "synopsis": "Height, reflection, and enclosure turn observation into staging.",
        "roomStatement": "Glass Lift treats height and enclosure as emotional conditions, where vertical distance and reflective barriers make looking feel staged.",
        "lightModes": {"daylight": 0.34, "twilight": 0.82, "night": 1.0},
        "distanceWeights": {"far": 1.0, "mid": 0.86, "close": 0.14},
        "humanWeights": {"trace": 0.7, "present": 0.4, "dominant": 0.08, "none": 1.0},
        "sceneWeights": {"Travel Observation": 0.72, "Street Fragments": 0.54, "After Hours": 1.0, "Snow Study": 0.06, "Print Memory": 0.3},
        "toneWeights": {"vertical": 1.0, "glass": 0.96, "reflection": 0.9, "distance": 0.76, "cool": 0.54},
        "energyTarget": 0.46,
        "intimacyTarget": 0.18,
        "surrealnessTarget": 0.68,
        "warmthTarget": 0.32,
    },
    {
        "title": "Air Study",
        "primaryTone": "release",
        "subtitle": "Open space, release, and thinning pressure.",
        "synopsis": "The exhibition exhales through light, weather, and wider intervals.",
        "roomStatement": "Air Study opens the frame back outward, using weather, wider distances, and lighter surfaces as release after compression.",
        "lightModes": {"daylight": 1.0, "twilight": 0.54, "night": 0.06},
        "distanceWeights": {"far": 1.0, "mid": 0.76, "close": 0.08},
        "humanWeights": {"trace": 0.48, "present": 0.28, "dominant": 0.0, "none": 1.0},
        "sceneWeights": {"Travel Observation": 1.0, "Street Fragments": 0.34, "After Hours": 0.08, "Snow Study": 0.66, "Print Memory": 0.18},
        "toneWeights": {"air": 1.0, "weather": 0.9, "open-air": 0.86, "release": 0.8, "clear": 0.6},
        "energyTarget": 0.16,
        "intimacyTarget": 0.18,
        "surrealnessTarget": 0.26,
        "warmthTarget": 0.5,
    },
    {
        "title": "Afterimage",
        "primaryTone": "coda",
        "subtitle": "Departure, remainder, and visual echo.",
        "synopsis": "The final room leaves fragments that continue after viewing.",
        "roomStatement": "Afterimage closes the exhibit with fragments that remain active after the sequence ends: echoes, remainders, and images that refuse to settle completely.",
        "lightModes": {"daylight": 0.48, "twilight": 0.78, "night": 0.76},
        "distanceWeights": {"far": 0.54, "mid": 0.92, "close": 0.52},
        "humanWeights": {"trace": 0.9, "present": 0.62, "dominant": 0.34, "none": 0.72},
        "sceneWeights": {"Travel Observation": 0.62, "Street Fragments": 0.58, "After Hours": 0.86, "Snow Study": 0.4, "Print Memory": 0.76},
        "toneWeights": {"afterimage": 1.0, "echo": 0.94, "memory": 0.76, "residue": 0.72, "quiet": 0.56},
        "energyTarget": 0.22,
        "intimacyTarget": 0.38,
        "surrealnessTarget": 0.64,
        "warmthTarget": 0.46,
    },
]

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
    variants: dict[str, dict[str, Any]]


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
    ensure_directories(reset_variants=os.getenv("FORCE_REGENERATE_VARIANTS") == "1")
    cleanup_legacy_generated_dirs()
    existing_assets, hidden_variant_paths = load_existing_assets()
    existing_analyses = load_existing_analyses()
    if existing_assets and os.getenv("FORCE_RESCAN") != "1":
        files = [asset["sourcePath"] for asset in existing_assets]
        canonical_assets = normalize_existing_assets(existing_assets)
        print(f"Reusing {len(canonical_assets)} canonical assets from photo-analysis.json")
    else:
        ensure_pillow_available()
        files = walk_archive(SOURCE_ROOT, SOURCE_ROOT)
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
    manifest = build_exhibit_manifest(canonical_assets, analyses)
    series_catalog = build_series_catalog(manifest)

    photo_catalog = {
        "generatedAt": iso_now(),
        "canonicalPhotoCount": len(canonical_assets),
        "variantGroupCount": len({asset["variantGroupId"] for asset in canonical_assets}),
        "assets": canonical_assets,
        "analyses": analyses,
        "hiddenVariantPaths": hidden_variant_paths,
    }

    (CONTENT_DIR / "photo-analysis.json").write_text(f"{json.dumps(photo_catalog, indent=2)}\n", encoding="utf-8")
    EXHIBIT_MANIFEST_PATH.write_text(f"{json.dumps(manifest, indent=2)}\n", encoding="utf-8")
    (CONTENT_DIR / "series.json").write_text(f"{json.dumps(series_catalog, indent=2)}\n", encoding="utf-8")

    print(f"Scanned {len(files)} images.")
    print(f"Canonical images: {len(canonical_assets)}")
    print(f"Hidden variants: {len(hidden_variant_paths)}")
    print(f"Exhibit rooms: {series_catalog['totalSeries']}")
    print(f"Exhibit photos: {series_catalog['exhibitPhotoCount']}")
    print(f"Raw-only photos: {len(series_catalog['rawOnlyPhotoIds'])}")


def ensure_directories(reset_variants: bool = False) -> None:
    CONTENT_DIR.mkdir(parents=True, exist_ok=True)
    for directory in VARIANT_DIRS.values():
        if reset_variants and directory.exists():
            shutil.rmtree(directory)
        directory.mkdir(parents=True, exist_ok=True)


def cleanup_legacy_generated_dirs() -> None:
    for directory in LEGACY_GENERATED_DIRS:
        if directory.exists():
            shutil.rmtree(directory)


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
        variants = build_variants(image, id_seed)

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
        variants=variants,
    )


def build_variants(image: Image.Image, asset_id: str) -> dict[str, dict[str, Any]]:
    variants: dict[str, dict[str, Any]] = {}

    for name, spec in VARIANT_SPECS.items():
        derived = image.copy()
        derived.thumbnail((spec["max_size"], spec["max_size"]), Image.Resampling.LANCZOS)
        jpeg_path = VARIANT_DIRS[name] / f"{asset_id}.jpg"
        webp_path = VARIANT_DIRS[name] / f"{asset_id}.webp"
        write_variant(derived, jpeg_path, "JPEG", spec["jpeg_quality"])
        write_variant(derived, webp_path, "WEBP", spec["webp_quality"])
        variants[name] = {
            "jpeg": f"/_generated/{name}/{asset_id}.jpg",
            "webp": f"/_generated/{name}/{asset_id}.webp",
            "width": derived.size[0],
            "height": derived.size[1],
        }

    return variants


def write_variant(image: Image.Image, destination: Path, format_name: str, quality: int) -> None:
    if destination.exists():
        return

    save_kwargs: dict[str, Any] = {"quality": quality}
    if format_name == "JPEG":
        save_kwargs.update({"optimize": True, "progressive": True})
    if format_name == "WEBP":
        save_kwargs.update({"method": 6})

    image.save(destination, format=format_name, **save_kwargs)


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
                "width": canonical.width,
                "height": canonical.height,
                "aspectRatio": canonical.aspect_ratio,
                "orientation": canonical.orientation,
                "variants": canonical.variants,
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


def load_existing_assets() -> tuple[list[dict[str, Any]], list[str]]:
    target = CONTENT_DIR / "photo-analysis.json"
    if not target.exists():
        return [], []

    try:
        raw = json.loads(target.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return [], []

    assets = raw.get("assets", [])
    hidden_variant_paths = raw.get("hiddenVariantPaths", [])
    if not isinstance(assets, list) or not isinstance(hidden_variant_paths, list):
        return [], []

    return assets, hidden_variant_paths


def normalize_existing_assets(assets: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if all(asset_has_variants(asset) for asset in assets):
        return assets

    ensure_pillow_available()
    normalized: list[dict[str, Any]] = []
    for asset in assets:
        source_path = asset.get("canonicalPath") or asset["sourcePath"]
        absolute_path = SOURCE_ROOT / source_path
        with Image.open(absolute_path) as image_handle:
            image = ImageOps.exif_transpose(image_handle).convert("RGB")
            variants = build_variants(image, asset["id"])

        next_asset = dict(asset)
        next_asset.pop("displayPath", None)
        next_asset.pop("thumbPath", None)
        next_asset["variants"] = variants
        normalized.append(next_asset)

    return normalized


def asset_has_variants(asset: dict[str, Any]) -> bool:
    variants = asset.get("variants")
    if not isinstance(variants, dict):
        return False

    for name in VARIANT_SPECS:
        entry = variants.get(name)
        if not isinstance(entry, dict):
            return False
        jpeg_path = entry.get("jpeg")
        webp_path = entry.get("webp")
        if not isinstance(jpeg_path, str) or not isinstance(webp_path, str):
            return False
        if not (PUBLIC_DIR / jpeg_path.lstrip("/")).exists():
            return False
        if not (PUBLIC_DIR / webp_path.lstrip("/")).exists():
            return False

    return True


def analyze_assets(assets: list[dict[str, Any]], existing_analyses: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    analyses: list[dict[str, Any]] = []
    api_key = os.getenv("OPENAI_API_KEY")

    for asset in assets:
        cached = existing_analyses.get(asset["checksum"])
        if cached:
            analyses.append(enrich_analysis(cached, asset))
            continue

        if api_key:
            try:
                analyses.append(enrich_analysis(analyze_with_openai(api_key, asset), asset))
                continue
            except Exception as error:  # noqa: BLE001
                print(f"AI analysis failed for {asset['sourcePath']}: {error}")

        analyses.append(enrich_analysis(analyze_heuristically(asset), asset))

    return analyses


def analyze_with_openai(api_key: str, asset: dict[str, Any]) -> dict[str, Any]:
    ensure_requests_available()
    thumb_path = PUBLIC_DIR / asset["variants"]["thumb"]["jpeg"].lstrip("/")
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
                            "sequenceRole, confidence, lightMode, humanPresence, subjectDistance, energyScore, "
                            "intimacyScore, surrealnessScore, toneTags, rationale. sequenceRole must be one of "
                            "anchor, bridge, pivot, texture, release, coda. narrativeKeywords and moodKeywords "
                            "must each have exactly 3 short strings. lightMode must be one of daylight, twilight, night. "
                            "humanPresence must be one of none, trace, present, dominant. subjectDistance must be one of far, mid, close. "
                            "toneTags must contain 3 to 5 short words."
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
        "lightMode": normalize_light_mode(parsed.get("lightMode", "twilight")),
        "humanPresence": normalize_human_presence(parsed.get("humanPresence", "trace")),
        "subjectDistance": normalize_subject_distance(parsed.get("subjectDistance", "mid")),
        "energyScore": clamp_number(float(parsed.get("energyScore", 0.5)), 0, 1),
        "intimacyScore": clamp_number(float(parsed.get("intimacyScore", 0.5)), 0, 1),
        "surrealnessScore": clamp_number(float(parsed.get("surrealnessScore", 0.4)), 0, 1),
        "toneTags": normalize_tone_tags(parsed.get("toneTags", [])),
        "analysisMode": "ai",
        "rationale": parsed.get("rationale", "AI-generated editorial read."),
        "needsReview": False,
    }


def analyze_heuristically(asset: dict[str, Any]) -> dict[str, Any]:
    basename = asset["provenance"]["basename"].lower()
    top_level = asset["provenance"]["topLevel"].lower()
    light_mode = infer_light_mode(asset)
    cool_tone = is_cool_color(asset["averageColor"])
    scene_type = infer_scene_type(top_level, basename, light_mode)
    narrative_keywords = infer_narrative_keywords(top_level, light_mode, asset["orientation"])
    mood_keywords = infer_mood_keywords(light_mode, cool_tone, scene_type)
    human_presence = infer_human_presence(asset, scene_type, narrative_keywords)
    subject_distance = infer_subject_distance(asset, narrative_keywords)
    energy_score = infer_energy_score(asset, light_mode, scene_type, human_presence)
    intimacy_score = infer_intimacy_score(asset, subject_distance, human_presence, scene_type)
    surrealness_score = infer_surrealness_score(asset, light_mode, scene_type)

    return {
        "photoId": asset["id"],
        "sceneType": scene_type,
        "locationCue": infer_location_cue(asset["provenance"]["pathParts"]),
        "narrativeKeywords": narrative_keywords,
        "moodKeywords": mood_keywords,
        "duplicateConfidence": 0.22,
        "sequenceRole": infer_sequence_role(asset, light_mode),
        "confidence": 0.46,
        "lightMode": light_mode,
        "humanPresence": human_presence,
        "subjectDistance": subject_distance,
        "energyScore": energy_score,
        "intimacyScore": intimacy_score,
        "surrealnessScore": surrealness_score,
        "toneTags": infer_tone_tags(asset, scene_type, light_mode, human_presence, subject_distance, cool_tone),
        "analysisMode": "heuristic",
        "rationale": (
            f"Fallback analysis based on brightness, orientation, filename tokens, and archive provenance for "
            f"{asset['provenance']['topLevel']}."
        ),
        "needsReview": True,
    }


def build_exhibit_manifest(assets: list[dict[str, Any]], analyses: list[dict[str, Any]]) -> dict[str, Any]:
    asset_map = {asset["id"]: asset for asset in assets}
    analysis_map = {analysis["photoId"]: analysis for analysis in analyses}
    asset_ids = set(asset_map)
    existing_manifest = load_existing_manifest(asset_ids)
    if existing_manifest:
        return existing_manifest

    room_assignments, raw_only_ids = generate_room_assignments(asset_map, analysis_map)
    room_entries: list[dict[str, Any]] = []
    remaining_pool = set(raw_only_ids)

    for profile, target_size in zip(ROOM_PROFILES, ROOM_SIZE_PLAN, strict=True):
        ordered_ids, remaining_pool = finalize_room_selection(
            profile,
            room_assignments[profile["title"]],
            remaining_pool,
            target_size,
            asset_map,
            analysis_map,
        )
        room_entries.append(build_room_entry(profile, ordered_ids, asset_map, analysis_map))

    raw_only_ids = sort_raw_only_ids(remaining_pool, asset_map, analysis_map)
    return {
        "generatedAt": iso_now(),
        "manifestVersion": 1,
        "totalCanonicalPhotos": len(assets),
        "targetExhibitCount": TARGET_EXHIBIT_COUNT,
        "exhibitPhotoCount": sum(len(room["photoIds"]) for room in room_entries),
        "rawOnlyPhotoIds": raw_only_ids,
        "rooms": room_entries,
    }


def load_existing_manifest(asset_ids: set[str]) -> dict[str, Any] | None:
    if not EXHIBIT_MANIFEST_PATH.exists():
        return None

    try:
        manifest = json.loads(EXHIBIT_MANIFEST_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None

    if not manifest_is_valid(manifest, asset_ids):
        return None

    return manifest


def manifest_is_valid(manifest: dict[str, Any], asset_ids: set[str]) -> bool:
    rooms = manifest.get("rooms")
    raw_only_ids = manifest.get("rawOnlyPhotoIds")
    if not isinstance(rooms, list) or not isinstance(raw_only_ids, list):
        return False
    if len(rooms) != TARGET_ROOM_COUNT:
        return False

    seen: list[str] = []
    for room in rooms:
        if not isinstance(room, dict) or not room.get("title") or not isinstance(room.get("photoIds"), list):
            return False
        if not ROOM_MIN_SIZE <= len(room["photoIds"]) <= ROOM_MAX_SIZE:
            return False
        seen.extend(room["photoIds"])

    seen.extend(raw_only_ids)
    return set(seen) == asset_ids and len(seen) == len(asset_ids)


def generate_room_assignments(
    asset_map: dict[str, dict[str, Any]],
    analysis_map: dict[str, dict[str, Any]],
) -> tuple[dict[str, list[str]], list[str]]:
    room_assignments = {profile["title"]: [] for profile in ROOM_PROFILES}
    remaining_ids = set(asset_map)
    max_target = max(ROOM_SIZE_PLAN)

    for _ in range(max_target):
        for profile, target_size in zip(ROOM_PROFILES, ROOM_SIZE_PLAN, strict=True):
            room_ids = room_assignments[profile["title"]]
            if len(room_ids) >= target_size:
                continue
            candidate_id = select_best_room_candidate(profile, remaining_ids, room_ids, asset_map, analysis_map)
            if candidate_id is None:
                continue
            room_ids.append(candidate_id)
            remaining_ids.remove(candidate_id)

    return room_assignments, sort_raw_only_ids(remaining_ids, asset_map, analysis_map)


def select_best_room_candidate(
    profile: dict[str, Any],
    candidate_ids: set[str],
    current_room_ids: list[str],
    asset_map: dict[str, dict[str, Any]],
    analysis_map: dict[str, dict[str, Any]],
    predicate: Any | None = None,
) -> str | None:
    best_candidate = None
    best_score = -10_000.0

    for asset_id in candidate_ids:
        analysis = analysis_map[asset_id]
        if predicate and not predicate(analysis):
            continue

        asset = asset_map[asset_id]
        score = room_fit_score(profile, asset, analysis)
        score += exhibit_value_score(asset, analysis) * 0.7
        score += room_diversity_adjustment(asset_id, current_room_ids, asset_map, analysis_map)
        score += room_requirement_bonus(profile, analysis, current_room_ids, analysis_map)

        if best_candidate is None or score > best_score:
            best_candidate = asset_id
            best_score = score

    return best_candidate


def room_fit_score(profile: dict[str, Any], asset: dict[str, Any], analysis: dict[str, Any]) -> float:
    tone_score = sum(profile["toneWeights"].get(tag, 0.0) for tag in analysis.get("toneTags", []))
    light_score = profile["lightModes"].get(analysis["lightMode"], 0.0)
    distance_score = profile["distanceWeights"].get(analysis["subjectDistance"], 0.0)
    human_score = profile["humanWeights"].get(analysis["humanPresence"], 0.0)
    scene_score = profile["sceneWeights"].get(analysis["sceneType"], 0.16)
    energy_alignment = 1 - abs(analysis["energyScore"] - profile["energyTarget"])
    intimacy_alignment = 1 - abs(analysis["intimacyScore"] - profile["intimacyTarget"])
    surreal_alignment = 1 - abs(analysis["surrealnessScore"] - profile["surrealnessTarget"])
    warmth_alignment = 1 - abs(color_temperature_score(asset, analysis) - profile["warmthTarget"])

    score = light_score * 1.35
    score += distance_score * 1.0
    score += human_score * 0.95
    score += scene_score * 1.1
    score += tone_score * 0.32
    score += energy_alignment * 1.2
    score += intimacy_alignment * 0.95
    score += surreal_alignment * 0.95
    score += warmth_alignment * 0.72
    score += sequence_role_bias(profile["primaryTone"], analysis["sequenceRole"])
    score -= analysis["duplicateConfidence"] * 0.35
    return score


def exhibit_value_score(asset: dict[str, Any], analysis: dict[str, Any]) -> float:
    role_value = {
        "anchor": 1.0,
        "pivot": 0.96,
        "bridge": 0.84,
        "texture": 0.76,
        "release": 0.7,
        "coda": 0.72,
    }.get(analysis["sequenceRole"], 0.7)
    balance = 1 - abs(asset["brightness"] - 0.48)
    return role_value * 0.48 + analysis["confidence"] * 0.28 + (1 - analysis["duplicateConfidence"]) * 0.18 + balance * 0.12


def room_diversity_adjustment(
    asset_id: str,
    current_room_ids: list[str],
    asset_map: dict[str, dict[str, Any]],
    analysis_map: dict[str, dict[str, Any]],
) -> float:
    if not current_room_ids:
        return 0.22

    asset = asset_map[asset_id]
    analysis = analysis_map[asset_id]
    provenance_count = sum(
        1 for current_id in current_room_ids if asset_map[current_id]["provenance"]["topLevel"] == asset["provenance"]["topLevel"]
    )
    light_count = sum(1 for current_id in current_room_ids if analysis_map[current_id]["lightMode"] == analysis["lightMode"])
    distance_count = sum(
        1 for current_id in current_room_ids if analysis_map[current_id]["subjectDistance"] == analysis["subjectDistance"]
    )
    human_count = sum(
        1 for current_id in current_room_ids if analysis_map[current_id]["humanPresence"] == analysis["humanPresence"]
    )

    bonus = 0.18 if provenance_count == 0 else max(-0.3, 0.06 - provenance_count * 0.08)
    bonus += 0.08 if light_count == 0 else max(-0.16, 0.02 - light_count * 0.04)
    bonus += 0.08 if distance_count == 0 else max(-0.14, 0.02 - distance_count * 0.04)
    bonus += 0.04 if human_count == 0 else max(-0.08, 0.01 - human_count * 0.03)

    if is_near_duplicate_in_room(asset_id, current_room_ids, asset_map):
        bonus -= 2.4

    return bonus


def room_requirement_bonus(
    profile: dict[str, Any],
    analysis: dict[str, Any],
    current_room_ids: list[str],
    analysis_map: dict[str, dict[str, Any]],
) -> float:
    bonus = 0.0
    if not any(analysis_map[item_id]["sequenceRole"] == "pivot" for item_id in current_room_ids):
        bonus += 0.32 if analysis["sequenceRole"] == "pivot" else 0
    if not any(analysis_map[item_id]["sequenceRole"] in {"release", "coda"} for item_id in current_room_ids):
        bonus += 0.24 if analysis["sequenceRole"] in {"release", "coda"} else 0
    if profile["primaryTone"] in {"arrival", "movement", "flow"} and analysis["sequenceRole"] == "bridge":
        bonus += 0.08
    if profile["primaryTone"] in {"release", "coda", "hush"} and analysis["sequenceRole"] in {"release", "coda"}:
        bonus += 0.08
    return bonus


def is_near_duplicate_in_room(asset_id: str, current_room_ids: list[str], asset_map: dict[str, dict[str, Any]]) -> bool:
    candidate = asset_map[asset_id]
    for current_id in current_room_ids:
        current = asset_map[current_id]
        distance = hamming_distance(candidate["perceptualHash"], current["perceptualHash"])
        brightness_gap = abs(candidate["brightness"] - current["brightness"])
        aspect_gap = abs(candidate["aspectRatio"] - current["aspectRatio"])
        if distance <= 5 and brightness_gap < 0.08 and aspect_gap < 0.1:
            return True
    return False


def finalize_room_selection(
    profile: dict[str, Any],
    room_ids: list[str],
    remaining_pool: set[str],
    target_size: int,
    asset_map: dict[str, dict[str, Any]],
    analysis_map: dict[str, dict[str, Any]],
) -> tuple[list[str], set[str]]:
    ranked_ids = sorted(
        room_ids,
        key=lambda asset_id: room_fit_score(profile, asset_map[asset_id], analysis_map[asset_id]) + exhibit_value_score(asset_map[asset_id], analysis_map[asset_id]),
        reverse=True,
    )

    unique_ids: list[str] = []
    dropped_ids: list[str] = []
    for asset_id in ranked_ids:
        if is_near_duplicate_in_room(asset_id, unique_ids, asset_map):
            dropped_ids.append(asset_id)
        else:
            unique_ids.append(asset_id)

    updated_pool = set(remaining_pool) | set(dropped_ids)
    unique_ids, updated_pool = ensure_room_roles(profile, unique_ids, updated_pool, asset_map, analysis_map)
    unique_ids, updated_pool = trim_room_to_target(profile, unique_ids, updated_pool, target_size, asset_map, analysis_map)

    while len(unique_ids) < target_size:
        candidate_id = select_best_room_candidate(profile, updated_pool, unique_ids, asset_map, analysis_map)
        if candidate_id is None:
            break
        unique_ids.append(candidate_id)
        updated_pool.remove(candidate_id)

    ordered_ids = sequence_room_assets(profile, unique_ids, asset_map, analysis_map)
    return ordered_ids, updated_pool


def ensure_room_roles(
    profile: dict[str, Any],
    room_ids: list[str],
    remaining_pool: set[str],
    asset_map: dict[str, dict[str, Any]],
    analysis_map: dict[str, dict[str, Any]],
) -> tuple[list[str], set[str]]:
    requirements = [
        lambda analysis: analysis["sequenceRole"] == "pivot",
        lambda analysis: analysis["sequenceRole"] in {"release", "coda"} or analysis["energyScore"] <= profile["energyTarget"],
    ]

    updated_ids = list(room_ids)
    updated_pool = set(remaining_pool)
    for predicate in requirements:
        if any(predicate(analysis_map[asset_id]) for asset_id in updated_ids):
            continue
        candidate_id = select_best_room_candidate(profile, updated_pool, updated_ids, asset_map, analysis_map, predicate=predicate)
        if candidate_id is None:
            continue
        updated_ids.append(candidate_id)
        updated_pool.remove(candidate_id)

    return updated_ids, updated_pool


def trim_room_to_target(
    profile: dict[str, Any],
    room_ids: list[str],
    remaining_pool: set[str],
    target_size: int,
    asset_map: dict[str, dict[str, Any]],
    analysis_map: dict[str, dict[str, Any]],
) -> tuple[list[str], set[str]]:
    updated_ids = list(room_ids)
    updated_pool = set(remaining_pool)

    while len(updated_ids) > target_size:
        pivot_count = sum(1 for asset_id in updated_ids if analysis_map[asset_id]["sequenceRole"] == "pivot")
        release_count = sum(1 for asset_id in updated_ids if analysis_map[asset_id]["sequenceRole"] in {"release", "coda"})
        removable: list[tuple[float, str]] = []
        for asset_id in updated_ids:
            analysis = analysis_map[asset_id]
            if analysis["sequenceRole"] == "pivot" and pivot_count <= 1:
                continue
            if analysis["sequenceRole"] in {"release", "coda"} and release_count <= 1:
                continue
            removable.append(
                (
                    room_fit_score(profile, asset_map[asset_id], analysis) + exhibit_value_score(asset_map[asset_id], analysis),
                    asset_id,
                )
            )

        if not removable:
            removable = [
                (
                    room_fit_score(profile, asset_map[asset_id], analysis_map[asset_id]) + exhibit_value_score(asset_map[asset_id], analysis_map[asset_id]),
                    asset_id,
                )
                for asset_id in updated_ids
            ]

        _, asset_id = min(removable)
        updated_ids.remove(asset_id)
        updated_pool.add(asset_id)

    return updated_ids, updated_pool


def sequence_room_assets(
    profile: dict[str, Any],
    room_ids: list[str],
    asset_map: dict[str, dict[str, Any]],
    analysis_map: dict[str, dict[str, Any]],
) -> list[str]:
    remaining = set(room_ids)
    if not remaining:
        return []

    opener = pick_best_asset_with_spacing(
        remaining,
        [],
        lambda asset_id: opener_score(profile, asset_map[asset_id], analysis_map[asset_id]),
        asset_map,
        analysis_map,
    )
    if opener is None:
        return list(room_ids)
    remaining.remove(opener)

    pivot = pick_best_asset_with_spacing(
        remaining,
        [opener],
        lambda asset_id: pivot_score(profile, asset_map[asset_id], analysis_map[asset_id]),
        asset_map,
        analysis_map,
    )
    if pivot is not None:
        remaining.remove(pivot)

    coda = pick_best_asset_with_spacing(
        remaining,
        [opener] + ([pivot] if pivot else []),
        lambda asset_id: coda_score(profile, asset_map[asset_id], analysis_map[asset_id]),
        asset_map,
        analysis_map,
    )
    if coda is not None:
        remaining.remove(coda)

    remaining_count = len(remaining)
    context_count = max(2, round(remaining_count * 0.34)) if remaining_count else 0
    escalation_count = max(2, round(remaining_count * 0.28)) if remaining_count >= 6 else max(0, remaining_count // 2)
    if context_count + escalation_count > remaining_count:
        escalation_count = max(0, remaining_count - context_count)
    after_count = max(0, remaining_count - context_count - escalation_count)

    sequence = [opener]
    context_ids, remaining = pick_segment_assets(
        remaining,
        context_count,
        sequence,
        lambda asset_id: context_score(profile, asset_map[asset_id], analysis_map[asset_id]),
        asset_map,
        analysis_map,
    )
    sequence.extend(context_ids)

    escalation_ids, remaining = pick_segment_assets(
        remaining,
        escalation_count,
        sequence,
        lambda asset_id: escalation_score(profile, asset_map[asset_id], analysis_map[asset_id]),
        asset_map,
        analysis_map,
    )
    sequence.extend(escalation_ids)

    if pivot is not None:
        sequence.append(pivot)

    aftermath_ids, remaining = pick_segment_assets(
        remaining,
        after_count,
        sequence,
        lambda asset_id: aftermath_score(profile, asset_map[asset_id], analysis_map[asset_id]),
        asset_map,
        analysis_map,
    )
    sequence.extend(aftermath_ids)

    if coda is not None:
        sequence.append(coda)

    if remaining:
        leftover = sorted(
            remaining,
            key=lambda asset_id: aftermath_score(profile, asset_map[asset_id], analysis_map[asset_id]),
            reverse=True,
        )
        while leftover:
            next_id = pick_best_asset_with_spacing(set(leftover), sequence, lambda asset_id: 0.0, asset_map, analysis_map)
            if next_id is None:
                next_id = leftover[0]
            sequence.append(next_id)
            leftover.remove(next_id)

    return sequence


def pick_segment_assets(
    candidate_ids: set[str],
    count: int,
    chosen_ids: list[str],
    score_fn: Any,
    asset_map: dict[str, dict[str, Any]],
    analysis_map: dict[str, dict[str, Any]],
) -> tuple[list[str], set[str]]:
    picked: list[str] = []
    remaining = set(candidate_ids)

    for _ in range(count):
        next_id = pick_best_asset_with_spacing(remaining, chosen_ids + picked, score_fn, asset_map, analysis_map)
        if next_id is None:
            break
        picked.append(next_id)
        remaining.remove(next_id)

    return picked, remaining


def pick_best_asset_with_spacing(
    candidate_ids: set[str],
    chosen_ids: list[str],
    score_fn: Any,
    asset_map: dict[str, dict[str, Any]],
    analysis_map: dict[str, dict[str, Any]],
) -> str | None:
    if not candidate_ids:
        return None

    ranked = sorted(candidate_ids, key=score_fn, reverse=True)
    for asset_id in ranked:
        if not causes_repetition_block(asset_id, chosen_ids, asset_map, analysis_map):
            return asset_id
    return ranked[0]


def causes_repetition_block(
    candidate_id: str,
    chosen_ids: list[str],
    asset_map: dict[str, dict[str, Any]],
    analysis_map: dict[str, dict[str, Any]],
) -> bool:
    tail = chosen_ids[-3:]
    if len(tail) < 3:
        return False

    candidate_asset = asset_map[candidate_id]
    candidate_analysis = analysis_map[candidate_id]
    checks = [
        (
            [asset_map[item_id]["provenance"]["topLevel"] for item_id in tail],
            candidate_asset["provenance"]["topLevel"],
        ),
        (
            [analysis_map[item_id]["lightMode"] for item_id in tail],
            candidate_analysis["lightMode"],
        ),
        (
            [analysis_map[item_id]["subjectDistance"] for item_id in tail],
            candidate_analysis["subjectDistance"],
        ),
    ]
    return any(len(set(values)) == 1 and current_value == values[0] for values, current_value in checks)


def opener_score(profile: dict[str, Any], asset: dict[str, Any], analysis: dict[str, Any]) -> float:
    role_bonus = {"anchor": 0.56, "bridge": 0.42, "texture": 0.26, "pivot": 0.18, "release": 0.12, "coda": 0.0}.get(
        analysis["sequenceRole"],
        0,
    )
    brightness_alignment = 1 - abs(asset["brightness"] - 0.48)
    return room_fit_score(profile, asset, analysis) + role_bonus + brightness_alignment * 0.4


def pivot_score(profile: dict[str, Any], asset: dict[str, Any], analysis: dict[str, Any]) -> float:
    role_bonus = {"pivot": 0.86, "bridge": 0.34, "anchor": 0.16, "texture": 0.08}.get(analysis["sequenceRole"], 0)
    return room_fit_score(profile, asset, analysis) + role_bonus + analysis["energyScore"] * 0.42 + analysis["surrealnessScore"] * 0.22


def coda_score(profile: dict[str, Any], asset: dict[str, Any], analysis: dict[str, Any]) -> float:
    role_bonus = {"coda": 0.82, "release": 0.52, "texture": 0.18, "anchor": 0.06}.get(analysis["sequenceRole"], 0)
    return room_fit_score(profile, asset, analysis) + role_bonus + (1 - analysis["energyScore"]) * 0.34 + analysis["surrealnessScore"] * 0.18


def context_score(profile: dict[str, Any], asset: dict[str, Any], analysis: dict[str, Any]) -> float:
    role_bonus = {"texture": 0.42, "bridge": 0.24, "release": 0.18, "anchor": 0.1}.get(analysis["sequenceRole"], 0)
    return room_fit_score(profile, asset, analysis) + role_bonus + (1 - abs(analysis["energyScore"] - 0.42)) * 0.2


def escalation_score(profile: dict[str, Any], asset: dict[str, Any], analysis: dict[str, Any]) -> float:
    role_bonus = {"bridge": 0.38, "pivot": 0.34, "anchor": 0.24, "texture": 0.12}.get(analysis["sequenceRole"], 0)
    return room_fit_score(profile, asset, analysis) + role_bonus + analysis["energyScore"] * 0.38 + analysis["intimacyScore"] * 0.12


def aftermath_score(profile: dict[str, Any], asset: dict[str, Any], analysis: dict[str, Any]) -> float:
    role_bonus = {"release": 0.36, "coda": 0.32, "texture": 0.16, "pivot": 0.08}.get(analysis["sequenceRole"], 0)
    return room_fit_score(profile, asset, analysis) + role_bonus + analysis["surrealnessScore"] * 0.22 + (1 - analysis["energyScore"]) * 0.14


def build_room_entry(
    profile: dict[str, Any],
    ordered_ids: list[str],
    asset_map: dict[str, dict[str, Any]],
    analysis_map: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    photo_assets = [asset_map[photo_id] for photo_id in ordered_ids]
    archive_label = build_provenance_note(photo_assets)
    archive_year = build_year_range(photo_assets)
    tags = collect_room_tags(ordered_ids, analysis_map)

    return {
        "title": profile["title"],
        "primaryTone": profile["primaryTone"],
        "roomStatement": profile["roomStatement"],
        "subtitle": trim_word_count(profile["subtitle"], 12),
        "synopsis": trim_word_count(profile["synopsis"], 24),
        "tags": tags,
        "coverPhotoId": ordered_ids[0],
        "previewPhotoIds": select_preview_ids(photo_assets),
        "photoIds": ordered_ids,
        "archiveLabel": archive_label,
        "archiveYear": archive_year,
        "credits": build_room_credits(photo_assets, archive_label, archive_year),
        "projectInformation": build_room_information(profile, archive_label, archive_year, tags, ordered_ids, analysis_map),
    }


def build_series_catalog(manifest: dict[str, Any]) -> dict[str, Any]:
    series: list[dict[str, Any]] = []
    for index, room in enumerate(manifest["rooms"], start=1):
        series.append(
            {
                "id": f"series-{index:02d}",
                "slug": f"{index:02d}-{slugify(room['title'])}",
                "title": room["title"],
                "subtitle": room["subtitle"],
                "synopsis": room["synopsis"],
                "tags": room["tags"],
                "coverPhotoId": room["coverPhotoId"],
                "previewPhotoIds": room["previewPhotoIds"],
                "photoIds": room["photoIds"],
                "portfolioIndex": index,
                "archiveLabel": room["archiveLabel"],
                "archiveYear": room["archiveYear"],
                "credits": room["credits"],
                "projectInformation": room["projectInformation"],
                "primaryTone": room["primaryTone"],
                "roomStatement": room["roomStatement"],
            }
        )

    return {
        "generatedAt": manifest["generatedAt"],
        "totalSeries": len(series),
        "exhibitPhotoCount": manifest["exhibitPhotoCount"],
        "rawOnlyPhotoIds": manifest["rawOnlyPhotoIds"],
        "series": series,
    }


def collect_room_tags(photo_ids: list[str], analysis_map: dict[str, dict[str, Any]]) -> list[str]:
    counts: Counter[str] = Counter()
    for photo_id in photo_ids:
        analysis = analysis_map[photo_id]
        counts.update(tag.lower() for tag in analysis.get("toneTags", []))
        counts.update(keyword.lower() for keyword in analysis.get("narrativeKeywords", []))
        counts.update(keyword.lower() for keyword in analysis.get("moodKeywords", []))
    return [tag for tag, _ in counts.most_common(4)]


def select_preview_ids(assets: list[dict[str, Any]]) -> list[str]:
    count = min(5, max(3, len(assets)))
    preview_ids: list[str] = []
    for index in range(count):
        normalized = 0 if count == 1 else index / (count - 1)
        asset = assets[min(len(assets) - 1, round(normalized * (len(assets) - 1)))]
        if asset["id"] not in preview_ids:
            preview_ids.append(asset["id"])
    return preview_ids


def sort_key_for_sequence(asset: dict[str, Any]) -> tuple[Any, ...]:
    return (asset["captureYear"] or "9999", asset["sourcePath"].lower(), asset["brightness"])


def sort_raw_only_ids(
    raw_only_ids: set[str] | list[str],
    asset_map: dict[str, dict[str, Any]],
    analysis_map: dict[str, dict[str, Any]],
) -> list[str]:
    return sorted(
        raw_only_ids,
        key=lambda asset_id: (
            -exhibit_value_score(asset_map[asset_id], analysis_map[asset_id]),
            sort_key_for_sequence(asset_map[asset_id]),
        ),
    )


def build_provenance_note(photo_assets: list[dict[str, Any]]) -> str:
    counts = Counter(public_label_for_source(asset["provenance"]["topLevel"]) for asset in photo_assets)
    labels = [compact_provenance_label(label, use_compact=len(counts) > 1) for label, _ in counts.most_common(3)]
    return " / ".join(labels) if labels else "Mixed archive"


def build_year_range(photo_assets: list[dict[str, Any]]) -> str:
    years = sorted({asset["captureYear"] for asset in photo_assets if asset.get("captureYear")})
    if not years:
        return ""
    if len(years) == 1:
        return years[0]
    return f"{years[0]}-{years[-1]}"


def build_room_credits(photo_assets: list[dict[str, Any]], archive_label: str, archive_year: str) -> str:
    orientation_mix = most_frequent([asset["orientation"] for asset in photo_assets]) or "mixed format"
    location = archive_label.lower()
    year = archive_year or "undated"
    return f"{location} / {orientation_mix} sequence / {year}"


def build_room_information(
    profile: dict[str, Any],
    archive_label: str,
    archive_year: str,
    tags: list[str],
    photo_ids: list[str],
    analysis_map: dict[str, dict[str, Any]],
) -> str:
    top_tags = ", ".join(tags[:3]) if tags else profile["primaryTone"]
    light_phrase = most_frequent([analysis_map[photo_id]["lightMode"] for photo_id in photo_ids]) or "mixed"
    distance_phrase = most_frequent([analysis_map[photo_id]["subjectDistance"] for photo_id in photo_ids]) or "mixed"
    years = archive_year or "multiple years"
    note = (
        f"{profile['roomStatement']} {profile['title']} draws photographs from {archive_label} across {years}. "
        f"The edit leans on {top_tags} and moves through {light_phrase} light with {distance_phrase} framing, so place stays secondary to atmosphere. "
        f"The room is meant to read as a single curatorial chapter rather than a travel folder."
    )
    return trim_word_count(note, 70)


def public_label_for_source(value: str) -> str:
    return PUBLIC_SOURCE_LABELS.get(value, value)


def compact_provenance_label(value: str, use_compact: bool) -> str:
    if not use_compact:
        return value
    return value.replace(" / ", "-")


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


def infer_light_mode(asset: dict[str, Any]) -> str:
    if asset["brightness"] < 0.34:
        return "night"
    if asset["brightness"] < 0.56:
        return "twilight"
    return "daylight"


def infer_scene_type(top_level: str, basename: str, light_mode: str) -> str:
    joined = f"{top_level} {basename}"
    if "snow" in joined:
        return "Snow Study"
    if "print" in joined:
        return "Print Memory"
    if "ricoh" in joined:
        return "Street Fragments"
    if light_mode == "night":
        return "After Hours"
    return "Travel Observation"


def infer_narrative_keywords(top_level: str, light_mode: str, orientation: str) -> list[str]:
    source = top_level.lower()
    keywords = [
        "night" if light_mode == "night" else "threshold" if light_mode == "twilight" else "open-air",
        "figure" if orientation == "portrait" else "distance",
        "memory" if top_level.title() in DERIVATIVE_SOURCES else "transit",
    ]
    if "hong kong" in source or "taiwan" in source:
        keywords[2] = "signal"
    if "india" in source or "uae" in source:
        keywords[0] = "heat" if light_mode != "night" else "night"
    return keywords


def infer_mood_keywords(light_mode: str, cool_tone: bool, scene_type: str) -> list[str]:
    return [
        "nocturnal" if light_mode == "night" else "restless" if light_mode == "twilight" else "clear",
        "cool" if cool_tone else "warm",
        "hushed" if scene_type == "Snow Study" else "cinematic",
    ]


def infer_sequence_role(asset: dict[str, Any], light_mode: str) -> str:
    if asset["orientation"] == "portrait" and light_mode == "night":
        return "pivot"
    if asset["orientation"] == "portrait":
        return "anchor"
    if light_mode == "night":
        return "bridge"
    if asset["aspectRatio"] > 1.6:
        return "release"
    return "texture"


def infer_human_presence(asset: dict[str, Any], scene_type: str, narrative_keywords: list[str]) -> str:
    if asset["orientation"] == "portrait":
        return "dominant"
    if "figure" in narrative_keywords:
        return "present"
    if scene_type in {"Street Fragments", "Travel Observation", "After Hours"}:
        return "trace"
    return "none"


def infer_subject_distance(asset: dict[str, Any], narrative_keywords: list[str]) -> str:
    if asset["orientation"] == "portrait":
        return "close"
    if asset["aspectRatio"] > 1.7 or "distance" in narrative_keywords:
        return "far"
    return "mid"


def infer_energy_score(asset: dict[str, Any], light_mode: str, scene_type: str, human_presence: str) -> float:
    value = 0.24
    if light_mode == "twilight":
        value += 0.18
    if light_mode == "night":
        value += 0.28
    if scene_type in {"Street Fragments", "After Hours"}:
        value += 0.12
    if human_presence in {"present", "dominant"}:
        value += 0.12
    if asset["brightness"] < 0.26:
        value += 0.08
    return clamp_number(value, 0, 1)


def infer_intimacy_score(asset: dict[str, Any], subject_distance: str, human_presence: str, scene_type: str) -> float:
    value = 0.18
    if subject_distance == "close":
        value += 0.5
    elif subject_distance == "mid":
        value += 0.26
    if human_presence == "dominant":
        value += 0.2
    elif human_presence == "present":
        value += 0.1
    if scene_type == "Print Memory":
        value += 0.1
    return clamp_number(value, 0, 1)


def infer_surrealness_score(asset: dict[str, Any], light_mode: str, scene_type: str) -> float:
    source = asset["provenance"]["topLevel"]
    value = 0.14
    if light_mode == "night":
        value += 0.26
    if scene_type == "Print Memory":
        value += 0.42
    if source in {"Posts", "Prints", "Hong Kong", "Taiwan Malaysia Singapore"}:
        value += 0.14
    if is_cool_color(asset["averageColor"]):
        value += 0.08
    return clamp_number(value, 0, 1)


def infer_tone_tags(
    asset: dict[str, Any],
    scene_type: str,
    light_mode: str,
    human_presence: str,
    subject_distance: str,
    cool_tone: bool,
) -> list[str]:
    tags = [
        "night" if light_mode == "night" else "threshold" if light_mode == "twilight" else "air",
        "cool" if cool_tone else "warm",
        "memory" if scene_type == "Print Memory" else "snow" if scene_type == "Snow Study" else "street" if scene_type == "Street Fragments" else "public",
        "close" if subject_distance == "close" else "distance" if subject_distance == "far" else "movement",
        "figure" if human_presence in {"present", "dominant"} else "reflection",
    ]
    source = asset["provenance"]["topLevel"].lower()
    if "hong kong" in source:
        tags.append("vertical")
        tags.append("signal")
    elif "japan" in source:
        tags.append("transit")
    elif "india" in source or "uae" in source:
        tags.append("heat")
    elif "prints" in source or "posts" in source:
        tags.append("archive")
        tags.append("paper")
    elif "snow" in source:
        tags.append("hush")
    elif "spring" in source or "switzerland" in source:
        tags.append("weather")
    return normalize_tone_tags(tags)


def infer_location_cue(path_parts: list[str]) -> str | None:
    cue = re.sub(r"\d+", "", path_parts[0]).strip() if path_parts else ""
    return cue or None


def enrich_analysis(analysis: dict[str, Any], asset: dict[str, Any]) -> dict[str, Any]:
    enriched = dict(analysis)
    light_mode = normalize_light_mode(enriched.get("lightMode", infer_light_mode(asset)))
    scene_type = enriched.get("sceneType") or infer_scene_type(asset["provenance"]["topLevel"].lower(), asset["provenance"]["basename"].lower(), light_mode)
    cool_tone = is_cool_color(asset["averageColor"])
    narrative_keywords = unique_preserve((enriched.get("narrativeKeywords") or infer_narrative_keywords(asset["provenance"]["topLevel"].lower(), light_mode, asset["orientation"]))[:3])
    while len(narrative_keywords) < 3:
        narrative_keywords.append("transit")
    mood_keywords = unique_preserve((enriched.get("moodKeywords") or infer_mood_keywords(light_mode, cool_tone, scene_type))[:3])
    while len(mood_keywords) < 3:
        mood_keywords.append("cinematic")
    human_presence = normalize_human_presence(enriched.get("humanPresence", infer_human_presence(asset, scene_type, narrative_keywords)))
    subject_distance = normalize_subject_distance(enriched.get("subjectDistance", infer_subject_distance(asset, narrative_keywords)))
    energy_score = clamp_number(float(enriched.get("energyScore", infer_energy_score(asset, light_mode, scene_type, human_presence))), 0, 1)
    intimacy_score = clamp_number(float(enriched.get("intimacyScore", infer_intimacy_score(asset, subject_distance, human_presence, scene_type))), 0, 1)
    surrealness_score = clamp_number(float(enriched.get("surrealnessScore", infer_surrealness_score(asset, light_mode, scene_type))), 0, 1)
    tone_tags = normalize_tone_tags(
        enriched.get("toneTags") or infer_tone_tags(asset, scene_type, light_mode, human_presence, subject_distance, cool_tone)
    )

    enriched.update(
        {
            "photoId": asset["id"],
            "sceneType": scene_type,
            "locationCue": enriched.get("locationCue") or infer_location_cue(asset["provenance"]["pathParts"]),
            "narrativeKeywords": narrative_keywords[:3],
            "moodKeywords": mood_keywords[:3],
            "duplicateConfidence": clamp_number(float(enriched.get("duplicateConfidence", 0.22)), 0, 1),
            "sequenceRole": normalize_sequence_role(enriched.get("sequenceRole", "texture")),
            "confidence": clamp_number(float(enriched.get("confidence", 0.46)), 0, 1),
            "lightMode": light_mode,
            "humanPresence": human_presence,
            "subjectDistance": subject_distance,
            "energyScore": energy_score,
            "intimacyScore": intimacy_score,
            "surrealnessScore": surrealness_score,
            "toneTags": tone_tags,
            "analysisMode": enriched.get("analysisMode", "heuristic"),
            "rationale": enriched.get("rationale", "Enriched from existing analysis and exhibit heuristics."),
            "needsReview": enriched.get("analysisMode") != "ai" or clamp_number(float(enriched.get("confidence", 0.46)), 0, 1) < 0.65,
        }
    )
    return enriched


def sequence_role_bias(primary_tone: str, role: str) -> float:
    role_table = {
        "arrival": {"bridge": 0.32, "anchor": 0.18, "texture": 0.16},
        "movement": {"bridge": 0.26, "texture": 0.18, "pivot": 0.08},
        "encounter": {"anchor": 0.24, "pivot": 0.2, "bridge": 0.14},
        "flow": {"bridge": 0.28, "release": 0.16, "texture": 0.1},
        "density": {"pivot": 0.24, "anchor": 0.2, "bridge": 0.16},
        "infrastructure": {"bridge": 0.2, "texture": 0.18, "release": 0.12},
        "night": {"bridge": 0.22, "release": 0.18, "coda": 0.14},
        "residue": {"coda": 0.18, "release": 0.16, "texture": 0.1},
        "memory": {"coda": 0.22, "release": 0.18, "texture": 0.12},
        "pause": {"anchor": 0.14, "release": 0.18, "coda": 0.12},
        "hush": {"release": 0.22, "coda": 0.18, "texture": 0.08},
        "vertical": {"release": 0.14, "bridge": 0.16, "texture": 0.1},
        "release": {"release": 0.28, "coda": 0.18, "texture": 0.08},
        "coda": {"coda": 0.34, "release": 0.2, "texture": 0.08},
    }
    return role_table.get(primary_tone, {}).get(role, 0.0)


def color_temperature_score(asset: dict[str, Any], analysis: dict[str, Any]) -> float:
    if "warm" in analysis.get("toneTags", []) or "warm" in analysis.get("moodKeywords", []):
        return 0.72
    if "cool" in analysis.get("toneTags", []) or "cool" in analysis.get("moodKeywords", []):
        return 0.28
    return 0.28 if is_cool_color(asset["averageColor"]) else 0.72


def trim_word_count(value: str, limit: int) -> str:
    words = value.split()
    if len(words) <= limit:
        return value.strip()
    return " ".join(words[:limit]).rstrip(".,;:") + "."


def normalize_light_mode(value: str) -> str:
    return value if value in {"daylight", "twilight", "night"} else "twilight"


def normalize_human_presence(value: str) -> str:
    return value if value in {"none", "trace", "present", "dominant"} else "trace"


def normalize_subject_distance(value: str) -> str:
    return value if value in {"far", "mid", "close"} else "mid"


def normalize_tone_tags(values: Any) -> list[str]:
    if not isinstance(values, list):
        values = []
    cleaned = [slugify(str(value)).replace("-", " ") for value in values if str(value).strip()]
    return unique_preserve(cleaned)[:5]


def ensure_requests_available() -> None:
    if requests is None:
        raise RuntimeError("OpenAI analysis requires the optional Python package 'requests'.")


def ensure_pillow_available() -> None:
    if Image is None or ImageOps is None or ImageStat is None:
        raise RuntimeError(
            "Image rescanning requires the optional Python package 'Pillow'. "
            "Commit generated catalog artifacts or install Pillow before rescanning."
        )


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
