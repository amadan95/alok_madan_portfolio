import "server-only";

import assetCatalogJson from "@/content/asset-catalog.json";
import exhibitManifestJson from "@/content/exhibit-manifest.json";
import siteMetaJson from "@/content/site-meta.json";
import { parseExhibitContent, parseSiteMeta } from "@/lib/exhibit-schema";
import type {
  CollectionCoverEntry,
  CuratedCollection,
  CuratedDisplayImage,
  DisplayAsset,
  ExhibitCollection,
  ExhibitImage,
  IntroSlide,
  PortfolioPageEntry,
  SiteMeta,
  TechnicalAsset,
} from "@/lib/types";

const { manifest, assetCatalog } = parseExhibitContent(exhibitManifestJson, assetCatalogJson);
const parsedSiteMeta = parseSiteMeta(siteMetaJson);

const technicalAssetMap = new Map<string, TechnicalAsset>(
  assetCatalog.assets.map((asset) => [asset.id, asset]),
);
function toDisplayAsset(asset: TechnicalAsset): DisplayAsset {
  return {
    id: asset.id,
    width: asset.width,
    height: asset.height,
    aspectRatio: asset.aspectRatio,
    orientation: asset.orientation,
    averageColor: asset.averageColor,
    variants: asset.variants,
  };
}

function joinImage(image: ExhibitImage): CuratedDisplayImage {
  const asset = technicalAssetMap.get(image.assetId);
  if (!asset) {
    throw new Error(`Selected image ${JSON.stringify(image.assetId)} has no technical asset`);
  }

  return {
    ...toDisplayAsset(asset),
    assetId: image.assetId,
    title: image.title,
    prose: image.prose,
    alt: image.alt,
    sequenceRole: image.sequenceRole,
  };
}

const collections: CuratedCollection[] = manifest.collections.map((collection, index) => ({
  ...collection,
  portfolioIndex: index + 1,
  photoCount: collection.images.length,
}));

const collectionMap = new Map(collections.map((collection) => [collection.slug, collection]));
const collectionImagesMap = new Map(
  collections.map((collection) => [
    collection.slug,
    collection.images.map((image) => joinImage(image)),
  ]),
);
const selectedSequenceImages = collections.flatMap(
  (collection) => collectionImagesMap.get(collection.slug) ?? [],
);
const selectedImageMap = new Map(selectedSequenceImages.map((image) => [image.id, image]));
const selectedIdSet = new Set(selectedSequenceImages.map((image) => image.id));

function requireCollection(collection: ExhibitCollection): CuratedCollection {
  const current = collectionMap.get(collection.slug);
  if (!current) {
    throw new Error(`Unknown exhibit collection ${JSON.stringify(collection.slug)}`);
  }
  return current;
}

function requireSelectedImage(id: string, context: string): CuratedDisplayImage {
  const image = selectedImageMap.get(id);
  if (!image) {
    throw new Error(`${context} references missing or unselected image ${JSON.stringify(id)}`);
  }
  return image;
}

export function getExhibitManifest() {
  return manifest;
}

export function getExhibit() {
  return manifest.exhibit;
}

export function getSiteMeta(): SiteMeta {
  const selectedFallbackId = manifest.introPhotoIds[0] ?? collections[0]?.coverPhotoId;
  const configuredId = parsedSiteMeta.contactBackgroundPhotoId;
  const contactBackgroundPhotoId =
    configuredId && selectedIdSet.has(configuredId) ? configuredId : selectedFallbackId;

  if (!contactBackgroundPhotoId || !selectedIdSet.has(contactBackgroundPhotoId)) {
    throw new Error("No selected photograph is available for the contact background");
  }

  return {
    ...parsedSiteMeta,
    contactBackgroundPhotoId,
  };
}

export function getCollections(): CuratedCollection[] {
  return collections;
}

export function getCollectionBySlug(slug: string): CuratedCollection | null {
  return collectionMap.get(slug) ?? null;
}

export function getCollectionImages(collection: ExhibitCollection): CuratedDisplayImage[] {
  const current = requireCollection(collection);
  const images = collectionImagesMap.get(current.slug);
  if (!images || images.length !== current.images.length) {
    throw new Error(`Collection ${JSON.stringify(current.slug)} could not be resolved in authored order`);
  }
  return images;
}

export function getCollectionCover(collection: ExhibitCollection): CuratedDisplayImage {
  const current = requireCollection(collection);
  return requireSelectedImage(current.coverPhotoId, `Collection ${JSON.stringify(current.slug)} cover`);
}

export function getPreviewImages(collection: ExhibitCollection): CuratedDisplayImage[] {
  const current = requireCollection(collection);
  return current.previewPhotoIds.map((id, index) =>
    requireSelectedImage(id, `Collection ${JSON.stringify(current.slug)} preview ${index + 1}`),
  );
}

export function getSelectedSequenceImages(): CuratedDisplayImage[] {
  return selectedSequenceImages;
}

export function getSelectedSequenceIds(): string[] {
  return selectedSequenceImages.map((image) => image.id);
}

export function getAsset(id: string): TechnicalAsset | null {
  return technicalAssetMap.get(id) ?? null;
}

export function getSelectedImage(id: string): CuratedDisplayImage | null {
  return selectedImageMap.get(id) ?? null;
}

export function getIntroSlides(): IntroSlide[] {
  return manifest.introPhotoIds.map((id, index) => {
    const image = requireSelectedImage(id, `Intro image ${index + 1}`);
    return {
      id: image.id,
      alt: image.alt,
      averageColor: image.averageColor,
      flash: image.variants.rail,
      hold: image.variants.hero,
    };
  });
}

export function getPortfolioPageEntries(): PortfolioPageEntry[] {
  return collections.map((collection) => ({
    collection,
    cover: getCollectionCover(collection),
    previews: getPreviewImages(collection),
    photoCount: collection.photoCount,
  }));
}

export function getListPageEntries(): CollectionCoverEntry[] {
  return collections.map((collection) => ({
    collection,
    cover: getCollectionCover(collection),
  }));
}

export function getArchivePageEntries(): CollectionCoverEntry[] {
  return collections.map((collection) => ({
    collection,
    cover: getCollectionCover(collection),
  }));
}

export function getContactBackgroundAsset(): CuratedDisplayImage {
  const meta = getSiteMeta();
  return requireSelectedImage(meta.contactBackgroundPhotoId, "Contact background");
}
