import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const siteRoot = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(readFileSync(resolve(siteRoot, "content/exhibit-manifest.json"), "utf8"));
const catalog = JSON.parse(readFileSync(resolve(siteRoot, "content/asset-catalog.json"), "utf8"));
const registry = JSON.parse(readFileSync(resolve(siteRoot, "assets/selected/asset-sources.json"), "utf8"));

const words = (value) => value.trim().split(/\s+/u).filter(Boolean).length;
const selected = manifest.collections.flatMap((collection) => collection.images);
const selectedIds = selected.map((image) => image.assetId);
const selectedSet = new Set(selectedIds);

test("the exhibit is the approved 13-room, 104-image selection", () => {
  assert.equal(manifest.manifestVersion, 2);
  assert.equal(manifest.collections.length, 13);
  assert.equal(selected.length, 104);
  assert.equal(selectedSet.size, 104);
  assert.equal(catalog.assetCount, 104);
  assert.equal(registry.assets.length, 104);
  assert.deepEqual(new Set(catalog.assets.map((asset) => asset.id)), selectedSet);
  assert.deepEqual(new Set(registry.assets.map((asset) => asset.assetId)), selectedSet);
});

test("every collection preserves authored membership and copy contracts", () => {
  const roles = [
    "threshold",
    "development-1",
    "development-2",
    "development-3",
    "hinge",
    "echo-1",
    "echo-2",
    "release",
  ];
  for (const collection of manifest.collections) {
    assert.equal(collection.images.length, 8, collection.slug);
    assert.deepEqual(collection.images.map((image) => image.sequenceRole), roles, collection.slug);
    assert.ok(words(collection.title) >= 2 && words(collection.title) <= 5, collection.title);
    assert.ok(words(collection.synopsis) >= 15 && words(collection.synopsis) <= 25, collection.slug);
    assert.ok(words(collection.essay) >= 120 && words(collection.essay) <= 180, collection.slug);
    assert.equal(collection.previewPhotoIds.length, 5, collection.slug);
    assert.equal(new Set(collection.previewPhotoIds).size, 5, collection.slug);
    const roomIds = new Set(collection.images.map((image) => image.assetId));
    assert.ok(roomIds.has(collection.coverPhotoId), collection.slug);
    collection.previewPhotoIds.forEach((id) => assert.ok(roomIds.has(id), `${collection.slug}:${id}`));
    for (const image of collection.images) {
      assert.ok(words(image.title) >= 1 && words(image.title) <= 6, image.title);
      assert.ok(words(image.prose) >= 20 && words(image.prose) <= 40, image.title);
      assert.ok(words(image.alt) >= 12 && words(image.alt) <= 25, image.title);
      assert.notEqual(image.prose, image.alt, image.title);
    }
  }
});

test("the revised editorial passages are distinct and image-specific", () => {
  assert.equal(new Set(selected.map((image) => image.prose)).size, 104);
  for (const image of selected) {
    assert.notEqual(image.prose, image.alt, image.title);
    assert.doesNotMatch(image.prose, /\b(?:photo|photograph|image) shows\b/iu, image.title);
  }
});

test("covers, previews, intro, and responsive variants resolve exactly", () => {
  assert.ok(manifest.introPhotoIds.length > 0 && manifest.introPhotoIds.length <= 12);
  assert.equal(new Set(manifest.introPhotoIds).size, manifest.introPhotoIds.length);
  manifest.introPhotoIds.forEach((id) => assert.ok(selectedSet.has(id), id));

  for (const asset of catalog.assets) {
    for (const key of ["raw", "thumb", "rail", "hero"]) {
      const variant = asset.variants[key];
      for (const format of ["jpeg", "webp"]) {
        assert.ok(variant[format].startsWith(`/_generated/${key}/${asset.id}.`));
        assert.ok(existsSync(resolve(siteRoot, "public", variant[format].slice(1))), variant[format]);
      }
    }
  }
});

test("production content contains no private absolute source paths", () => {
  const serialized = [manifest, catalog, registry].map((value) => JSON.stringify(value)).join("\n");
  assert.doesNotMatch(serialized, /\/Volumes\//);
  assert.doesNotMatch(serialized, /#recycle/);
  assert.doesNotMatch(serialized, /\/Users\/alokmadan/);
  for (const source of registry.assets) {
    assert.ok(source.masterPath.startsWith("assets/selected/masters/am-"));
    assert.equal(source.masterPath.includes(".."), false);
  }
});
