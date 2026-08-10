import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const siteRoot = resolve(import.meta.dirname, "..");
const outRoot = resolve(siteRoot, "out");
const manifest = JSON.parse(readFileSync(resolve(siteRoot, "content/exhibit-manifest.json"), "utf8"));

function readExport(relativePath) {
  const path = resolve(outRoot, relativePath);
  assert.ok(existsSync(path), `missing exported route: ${relativePath}`);
  return readFileSync(path, "utf8");
}

function filesBelow(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : [path];
  });
}

test("every public route is present in the static export", () => {
  for (const route of [
    "index.html",
    "list.html",
    "archive.html",
    "raw.html",
    "contact.html",
    "disclaimer.html",
  ]) {
    readExport(route);
  }
  for (const collection of manifest.collections) {
    readExport(`portfolio/${collection.slug}.html`);
  }
});

test("home, raw, and every collection include their authored content hooks", () => {
  const home = readExport("index.html");
  assert.doesNotMatch(home, /data-exhibit-intro=""/);
  assert.match(home, /data-home-series=""/);

  const raw = readExport("raw.html");
  assert.match(raw, /data-raw-selected-count="104"/);

  for (const collection of manifest.collections) {
    const html = readExport(`portfolio/${collection.slug}.html`);
    assert.match(html, /data-project-essay=""/);
    assert.equal((html.match(/data-project-image=""/g) ?? []).length, 8, collection.slug);
    assert.equal((html.match(/data-mobile-caption=""/g) ?? []).length, 8, collection.slug);
    for (const image of collection.images) {
      assert.ok(html.includes(`data-asset-id="${image.assetId}"`), `${collection.slug}:${image.assetId}`);
    }
  }
});

test("the export contains exactly the selected responsive files and no private paths", () => {
  const generated = filesBelow(resolve(outRoot, "_generated"));
  assert.equal(generated.length, 104 * 4 * 2);
  generated.forEach((path) => assert.ok(statSync(path).size > 0, path));

  const textual = filesBelow(outRoot)
    .filter((path) => /\.(?:html|txt)$/u.test(path))
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");
  assert.doesNotMatch(textual, /\/Volumes\//);
  assert.doesNotMatch(textual, /#recycle/);
  assert.doesNotMatch(textual, /\/Users\/alokmadan/);
});
