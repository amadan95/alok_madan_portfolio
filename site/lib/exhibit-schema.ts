import type {
  AssetCatalog,
  AssetVariantKey,
  AssetVariantSource,
  AssetVariants,
  ExhibitCollection,
  ExhibitImage,
  ExhibitManifestV2,
  ExhibitMetadata,
  Orientation,
  SequenceRole,
  SiteMeta,
  TechnicalAsset,
} from "@/lib/types";

const COLLECTION_COUNT_RANGE = { minimum: 12, maximum: 13 } as const;
const COLLECTION_IMAGE_COUNT_RANGE = { minimum: 7, maximum: 8 } as const;
const EXHIBIT_IMAGE_COUNT_RANGE = { minimum: 96, maximum: 104 } as const;
const INTRO_IMAGE_COUNT_RANGE = { minimum: 1, maximum: 13 } as const;
const VARIANT_KEYS: AssetVariantKey[] = ["raw", "thumb", "rail", "hero"];
const VARIANT_MAX_DIMENSIONS: Record<AssetVariantKey, number> = {
  raw: 360,
  thumb: 800,
  rail: 1600,
  hero: 2400,
};
const SEQUENCE_ROLES: SequenceRole[] = [
  "threshold",
  "development-1",
  "development-2",
  "development-3",
  "hinge",
  "rupture",
  "echo-1",
  "echo-2",
  "release",
];

type UnknownRecord = Record<string, unknown>;

export class ExhibitSchemaError extends Error {
  constructor(path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = "ExhibitSchemaError";
  }
}

function fail(path: string, message: string): never {
  throw new ExhibitSchemaError(path, message);
}

function readRecord(value: unknown, path: string): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(path, "expected an object");
  }
  return value as UnknownRecord;
}

function assertExactKeys(record: UnknownRecord, keys: readonly string[], path: string) {
  const expected = new Set(keys);
  const unexpected = Object.keys(record).filter((key) => !expected.has(key));
  const missing = keys.filter((key) => !(key in record));

  if (missing.length > 0) {
    fail(path, `missing ${missing.map((key) => JSON.stringify(key)).join(", ")}`);
  }
  if (unexpected.length > 0) {
    fail(path, `unexpected ${unexpected.map((key) => JSON.stringify(key)).join(", ")}`);
  }
}

function readArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    fail(path, "expected an array");
  }
  return value;
}

function readString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(path, "expected a non-empty string");
  }
  if (value !== value.trim()) {
    fail(path, "must not contain leading or trailing whitespace");
  }
  return value;
}

function readOptionalString(value: unknown, path: string, fallback: string): string {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  return readString(value, path);
}

function readInteger(value: unknown, path: string, minimum = 0): number {
  if (!Number.isInteger(value) || (value as number) < minimum) {
    fail(path, `expected an integer greater than or equal to ${minimum}`);
  }
  return value as number;
}

function readFiniteNumber(value: unknown, path: string, minimum = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum) {
    fail(path, `expected a finite number greater than or equal to ${minimum}`);
  }
  return value;
}

function assertCount(value: unknown[], minimum: number, maximum: number, path: string) {
  if (value.length < minimum || value.length > maximum) {
    fail(path, `expected ${minimum}–${maximum} items, received ${value.length}`);
  }
}

function wordCount(value: string) {
  return value.split(/\s+/u).filter(Boolean).length;
}

function assertWordCount(value: string, minimum: number, maximum: number, path: string) {
  const count = wordCount(value);
  if (count < minimum || count > maximum) {
    fail(path, `expected ${minimum}–${maximum} words, received ${count}`);
  }
}

function assertUnique(values: string[], path: string) {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value)) {
      fail(`${path}[${index}]`, `duplicate value ${JSON.stringify(value)}`);
    }
    seen.add(value);
  });
}

function readStringArray(value: unknown, path: string): string[] {
  return readArray(value, path).map((item, index) => readString(item, `${path}[${index}]`));
}

function parseExhibitMetadata(value: unknown, path: string): ExhibitMetadata {
  const record = readRecord(value, path);
  assertExactKeys(record, ["title", "subtitle", "statement"], path);

  const title = readString(record.title, `${path}.title`);
  const subtitle = readString(record.subtitle, `${path}.subtitle`);
  const statement = readString(record.statement, `${path}.statement`);
  if (wordCount(statement) < 80) {
    fail(`${path}.statement`, "expected a substantive exhibit statement of at least 80 words");
  }

  return { title, subtitle, statement };
}

function parseSequenceRole(value: unknown, path: string): SequenceRole {
  const role = readString(value, path);
  if (!SEQUENCE_ROLES.includes(role as SequenceRole)) {
    fail(path, `expected one of ${SEQUENCE_ROLES.join(", ")}`);
  }
  return role as SequenceRole;
}

function parseExhibitImage(value: unknown, path: string): ExhibitImage {
  const record = readRecord(value, path);
  assertExactKeys(record, ["assetId", "title", "prose", "alt", "sequenceRole"], path);

  const assetId = readString(record.assetId, `${path}.assetId`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)+$/u.test(assetId)) {
    fail(`${path}.assetId`, "must be a stable lowercase, hyphen-separated ID");
  }

  const title = readString(record.title, `${path}.title`);
  const prose = readString(record.prose, `${path}.prose`);
  const alt = readString(record.alt, `${path}.alt`);
  assertWordCount(title, 1, 6, `${path}.title`);
  assertWordCount(prose, 20, 40, `${path}.prose`);
  assertWordCount(alt, 12, 25, `${path}.alt`);
  if (alt.includes("\n")) {
    fail(`${path}.alt`, "literal alt text must be a single line");
  }
  if (alt === prose || alt === title) {
    fail(`${path}.alt`, "literal alt text must be distinct from title and prose");
  }

  return {
    assetId,
    title,
    prose,
    alt,
    sequenceRole: parseSequenceRole(record.sequenceRole, `${path}.sequenceRole`),
  };
}

function parseCollection(value: unknown, path: string): ExhibitCollection {
  const record = readRecord(value, path);
  assertExactKeys(
    record,
    [
      "slug",
      "title",
      "subtitle",
      "synopsis",
      "essay",
      "tags",
      "coverPhotoId",
      "previewPhotoIds",
      "images",
    ],
    path,
  );

  const slug = readString(record.slug, `${path}.slug`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug)) {
    fail(`${path}.slug`, "must be a lowercase URL slug");
  }

  const title = readString(record.title, `${path}.title`);
  const subtitle = readString(record.subtitle, `${path}.subtitle`);
  const synopsis = readString(record.synopsis, `${path}.synopsis`);
  const essay = readString(record.essay, `${path}.essay`);
  assertWordCount(title, 2, 5, `${path}.title`);
  assertWordCount(synopsis, 15, 25, `${path}.synopsis`);
  assertWordCount(essay, 120, 180, `${path}.essay`);

  const tags = readStringArray(record.tags, `${path}.tags`);
  assertCount(tags, 1, 6, `${path}.tags`);
  assertUnique(tags, `${path}.tags`);

  const coverPhotoId = readString(record.coverPhotoId, `${path}.coverPhotoId`);
  const previewPhotoIds = readStringArray(record.previewPhotoIds, `${path}.previewPhotoIds`);
  if (previewPhotoIds.length !== 5) {
    fail(`${path}.previewPhotoIds`, `expected exactly 5 IDs, received ${previewPhotoIds.length}`);
  }
  assertUnique(previewPhotoIds, `${path}.previewPhotoIds`);

  const images = readArray(record.images, `${path}.images`).map((item, index) =>
    parseExhibitImage(item, `${path}.images[${index}]`),
  );
  assertCount(
    images,
    COLLECTION_IMAGE_COUNT_RANGE.minimum,
    COLLECTION_IMAGE_COUNT_RANGE.maximum,
    `${path}.images`,
  );

  const imageIds = images.map((image) => image.assetId);
  assertUnique(imageIds, `${path}.images[].assetId`);
  const imageIdSet = new Set(imageIds);
  if (!imageIdSet.has(coverPhotoId)) {
    fail(`${path}.coverPhotoId`, `${JSON.stringify(coverPhotoId)} is not a member of this collection`);
  }
  previewPhotoIds.forEach((id, index) => {
    if (!imageIdSet.has(id)) {
      fail(`${path}.previewPhotoIds[${index}]`, `${JSON.stringify(id)} is not a member of this collection`);
    }
  });

  const roles = images.map((image) => image.sequenceRole);
  assertUnique(roles, `${path}.images[].sequenceRole`);
  if (roles[0] !== "threshold") {
    fail(`${path}.images[0].sequenceRole`, "the first image must be the threshold");
  }
  if (roles[roles.length - 1] !== "release") {
    fail(`${path}.images[${roles.length - 1}].sequenceRole`, "the final image must be the release");
  }
  const hingeCount = roles.filter((role) => role === "hinge" || role === "rupture").length;
  if (hingeCount !== 1) {
    fail(`${path}.images[].sequenceRole`, "expected exactly one hinge or rupture");
  }

  return {
    slug,
    title,
    subtitle,
    synopsis,
    essay,
    tags,
    coverPhotoId,
    previewPhotoIds: previewPhotoIds as [string, string, string, string, string],
    images,
  };
}

export function parseExhibitManifest(value: unknown): ExhibitManifestV2 {
  const path = "exhibit-manifest";
  const record = readRecord(value, path);
  assertExactKeys(record, ["manifestVersion", "exhibit", "introPhotoIds", "collections"], path);

  if (record.manifestVersion !== 2) {
    fail(`${path}.manifestVersion`, "expected 2");
  }

  const exhibit = parseExhibitMetadata(record.exhibit, `${path}.exhibit`);
  const introPhotoIds = readStringArray(record.introPhotoIds, `${path}.introPhotoIds`);
  assertCount(
    introPhotoIds,
    INTRO_IMAGE_COUNT_RANGE.minimum,
    INTRO_IMAGE_COUNT_RANGE.maximum,
    `${path}.introPhotoIds`,
  );
  assertUnique(introPhotoIds, `${path}.introPhotoIds`);

  const collections = readArray(record.collections, `${path}.collections`).map((item, index) =>
    parseCollection(item, `${path}.collections[${index}]`),
  );
  assertCount(
    collections,
    COLLECTION_COUNT_RANGE.minimum,
    COLLECTION_COUNT_RANGE.maximum,
    `${path}.collections`,
  );
  assertUnique(
    collections.map((collection) => collection.slug),
    `${path}.collections[].slug`,
  );
  assertUnique(
    collections.map((collection) => collection.title),
    `${path}.collections[].title`,
  );

  const selectedIds = collections.flatMap((collection) => collection.images.map((image) => image.assetId));
  assertCount(
    selectedIds,
    EXHIBIT_IMAGE_COUNT_RANGE.minimum,
    EXHIBIT_IMAGE_COUNT_RANGE.maximum,
    `${path}.collections[].images`,
  );
  assertUnique(selectedIds, `${path}.collections[].images[].assetId`);

  const selectedIdSet = new Set(selectedIds);
  introPhotoIds.forEach((id, index) => {
    if (!selectedIdSet.has(id)) {
      fail(`${path}.introPhotoIds[${index}]`, `${JSON.stringify(id)} is not a selected photograph`);
    }
  });

  return { manifestVersion: 2, exhibit, introPhotoIds, collections };
}

function parseOrientation(value: unknown, path: string): Orientation {
  if (value !== "landscape" && value !== "portrait" && value !== "square") {
    fail(path, "expected landscape, portrait, or square");
  }
  return value;
}

function parseVariant(
  value: unknown,
  path: string,
  assetId: string,
  key: AssetVariantKey,
  assetAspectRatio: number,
): AssetVariantSource {
  const record = readRecord(value, path);
  assertExactKeys(record, ["jpeg", "webp", "width", "height"], path);

  const jpeg = readString(record.jpeg, `${path}.jpeg`);
  const webp = readString(record.webp, `${path}.webp`);
  const expectedJpeg = `/_generated/${key}/${assetId}.jpg`;
  const expectedWebp = `/_generated/${key}/${assetId}.webp`;
  if (jpeg !== expectedJpeg) {
    fail(`${path}.jpeg`, `expected ${JSON.stringify(expectedJpeg)}`);
  }
  if (webp !== expectedWebp) {
    fail(`${path}.webp`, `expected ${JSON.stringify(expectedWebp)}`);
  }

  const width = readInteger(record.width, `${path}.width`, 1);
  const height = readInteger(record.height, `${path}.height`, 1);
  const maximumDimension = Math.max(width, height);
  if (maximumDimension > VARIANT_MAX_DIMENSIONS[key]) {
    fail(path, `${key} variant exceeds its ${VARIANT_MAX_DIMENSIONS[key]}px maximum dimension`);
  }
  const variantAspectRatio = width / height;
  if (Math.abs(variantAspectRatio - assetAspectRatio) > 0.02) {
    fail(path, "variant dimensions do not preserve the asset aspect ratio");
  }

  return { jpeg, webp, width, height };
}

function parseTechnicalAsset(value: unknown, path: string, catalogVariantVersion: number): TechnicalAsset {
  const record = readRecord(value, path);
  assertExactKeys(
    record,
    [
      "id",
      "sourceChecksum",
      "variantVersion",
      "width",
      "height",
      "aspectRatio",
      "orientation",
      "averageColor",
      "variants",
    ],
    path,
  );

  const id = readString(record.id, `${path}.id`);
  const sourceChecksum = readString(record.sourceChecksum, `${path}.sourceChecksum`);
  if (!/^[a-f0-9]{64}$/iu.test(sourceChecksum)) {
    fail(`${path}.sourceChecksum`, "expected a SHA-256 checksum");
  }

  const variantVersion = readInteger(record.variantVersion, `${path}.variantVersion`, 1);
  if (variantVersion !== catalogVariantVersion) {
    fail(`${path}.variantVersion`, `expected catalog variant version ${catalogVariantVersion}`);
  }

  const width = readInteger(record.width, `${path}.width`, 1);
  const height = readInteger(record.height, `${path}.height`, 1);
  const aspectRatio = readFiniteNumber(record.aspectRatio, `${path}.aspectRatio`, 0.01);
  if (Math.abs(width / height - aspectRatio) > 0.001) {
    fail(`${path}.aspectRatio`, "does not match width divided by height");
  }

  const orientation = parseOrientation(record.orientation, `${path}.orientation`);
  const ratio = width / height;
  const expectedOrientation: Orientation =
    Math.abs(ratio - 1) < 0.04 ? "square" : ratio > 1 ? "landscape" : "portrait";
  if (orientation !== expectedOrientation) {
    fail(`${path}.orientation`, `expected ${expectedOrientation} for ${width}×${height}`);
  }

  const averageColor = readString(record.averageColor, `${path}.averageColor`);
  if (!/^#[a-f0-9]{6}$/iu.test(averageColor)) {
    fail(`${path}.averageColor`, "expected a six-digit hexadecimal color");
  }

  const variantsRecord = readRecord(record.variants, `${path}.variants`);
  assertExactKeys(variantsRecord, VARIANT_KEYS, `${path}.variants`);
  const variants = Object.fromEntries(
    VARIANT_KEYS.map((key) => [
      key,
      parseVariant(variantsRecord[key], `${path}.variants.${key}`, id, key, aspectRatio),
    ]),
  ) as unknown as AssetVariants;

  return {
    id,
    sourceChecksum,
    variantVersion,
    width,
    height,
    aspectRatio,
    orientation,
    averageColor,
    variants,
  };
}

export function parseAssetCatalog(value: unknown, manifest: ExhibitManifestV2): AssetCatalog {
  const path = "asset-catalog";
  const record = readRecord(value, path);
  assertExactKeys(record, ["catalogVersion", "variantVersion", "assetCount", "assets"], path);

  if (record.catalogVersion !== 1) {
    fail(`${path}.catalogVersion`, "expected 1");
  }
  const variantVersion = readInteger(record.variantVersion, `${path}.variantVersion`, 1);
  const assetCount = readInteger(record.assetCount, `${path}.assetCount`, 1);
  const assets = readArray(record.assets, `${path}.assets`).map((item, index) =>
    parseTechnicalAsset(item, `${path}.assets[${index}]`, variantVersion),
  );
  if (assetCount !== assets.length) {
    fail(`${path}.assetCount`, `declares ${assetCount}, but assets contains ${assets.length} records`);
  }

  const catalogIds = assets.map((asset) => asset.id);
  assertUnique(catalogIds, `${path}.assets[].id`);
  const selectedIds = manifest.collections.flatMap((collection) =>
    collection.images.map((image) => image.assetId),
  );
  const catalogIdSet = new Set(catalogIds);
  const selectedIdSet = new Set(selectedIds);
  const missing = selectedIds.filter((id) => !catalogIdSet.has(id));
  const unselected = catalogIds.filter((id) => !selectedIdSet.has(id));
  if (missing.length > 0 || unselected.length > 0) {
    const details = [
      missing.length > 0 ? `missing selected IDs: ${missing.join(", ")}` : "",
      unselected.length > 0 ? `contains unselected IDs: ${unselected.join(", ")}` : "",
    ].filter(Boolean);
    fail(`${path}.assets`, details.join("; "));
  }
  if (assetCount !== selectedIds.length) {
    fail(`${path}.assetCount`, `expected exactly ${selectedIds.length} selected assets, received ${assetCount}`);
  }

  const variantPaths = assets.flatMap((asset) =>
    VARIANT_KEYS.flatMap((key) => [asset.variants[key].jpeg, asset.variants[key].webp]),
  );
  assertUnique(variantPaths, `${path}.assets[].variants`);

  return { catalogVersion: 1, variantVersion, assetCount, assets };
}

export function parseSiteMeta(value: unknown): SiteMeta {
  const path = "site-meta";
  const record = readRecord(value, path);
  const title = readString(record.title, `${path}.title`);
  const description = readString(record.description, `${path}.description`);
  const photographer = readString(record.photographer, `${path}.photographer`);
  const intro = readString(record.intro, `${path}.intro`);
  const contactEmail = readString(record.contactEmail, `${path}.contactEmail`);
  if (!/^\S+@\S+\.\S+$/u.test(contactEmail)) {
    fail(`${path}.contactEmail`, "expected an email address");
  }

  const socialLinks = readArray(record.socialLinks ?? [], `${path}.socialLinks`).map((value, index) => {
    const linkPath = `${path}.socialLinks[${index}]`;
    const link = readRecord(value, linkPath);
    return {
      label: readString(link.label, `${linkPath}.label`),
      href: readString(link.href, `${linkPath}.href`),
    };
  });

  return {
    title,
    description,
    photographer,
    intro,
    introDesktop: readOptionalString(record.introDesktop, `${path}.introDesktop`, intro),
    introMobile: readOptionalString(record.introMobile, `${path}.introMobile`, intro),
    contactEmail,
    cityLabel: readOptionalString(record.cityLabel, `${path}.cityLabel`, "New York"),
    timeZone: readOptionalString(record.timeZone, `${path}.timeZone`, "America/New_York"),
    contactBio: readOptionalString(record.contactBio, `${path}.contactBio`, intro),
    contactRepresented: readOptionalString(record.contactRepresented, `${path}.contactRepresented`, contactEmail),
    contactBackgroundPhotoId: readOptionalString(
      record.contactBackgroundPhotoId,
      `${path}.contactBackgroundPhotoId`,
      "",
    ),
    disclaimerText: readOptionalString(
      record.disclaimerText,
      `${path}.disclaimerText`,
      "All photographs are presented for editorial review. Reproduction requires written permission.",
    ),
    socialLinks,
  };
}

export function parseExhibitContent(manifestValue: unknown, catalogValue: unknown) {
  const manifest = parseExhibitManifest(manifestValue);
  const assetCatalog = parseAssetCatalog(catalogValue, manifest);
  return { manifest, assetCatalog };
}
