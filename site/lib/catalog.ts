import "server-only";

import photoCatalogJson from "@/content/photo-analysis.json";
import seriesCatalogJson from "@/content/series.json";
import siteMetaJson from "@/content/site-meta.json";
import type { DisplayAsset, IntroSlide, PhotoAsset, PhotoCatalog, Series, SeriesCatalog, SiteMeta } from "@/lib/types";

const photoCatalog = photoCatalogJson as unknown as PhotoCatalog;
const seriesCatalog = seriesCatalogJson as unknown as SeriesCatalog;
const siteMeta = siteMetaJson as unknown as SiteMeta;

const assetMap = new Map(photoCatalog.assets.map((asset) => [asset.id, asset]));
const analysisMap = new Map(photoCatalog.analyses.map((analysis) => [analysis.photoId, analysis]));
const seriesMap = new Map(seriesCatalog.series.map((series) => [series.slug, series]));

function hammingDistance(left: string, right: string) {
  const length = Math.min(left.length, right.length);
  let distance = Math.abs(left.length - right.length) * 4;

  for (let index = 0; index < length; index += 1) {
    const leftValue = parseInt(left[index] ?? "0", 16);
    const rightValue = parseInt(right[index] ?? "0", 16);
    const delta = leftValue ^ rightValue;
    distance += delta.toString(2).replace(/0/g, "").length;
  }

  return distance;
}

function normalizeBasename(value: string) {
  return value
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/(?:-enhanced(?:-nr)?|-edited?|-hdr|-pano|-copy|-final|-web|-large|-small|\(\d+\)|-\d+)$/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function areAssetsNearDuplicate(left: PhotoAsset, right: PhotoAsset) {
  const hashDistance = hammingDistance(left.perceptualHash, right.perceptualHash);
  const aspectGap = Math.abs(left.aspectRatio - right.aspectRatio);
  const brightnessGap = Math.abs(left.brightness - right.brightness);
  const sameOrientation = left.orientation === right.orientation;
  const sameTopLevel = left.provenance.topLevel === right.provenance.topLevel;
  const sameStem = normalizeBasename(left.provenance.basename) === normalizeBasename(right.provenance.basename);

  if (left.id === right.id || left.variantGroupId === right.variantGroupId) {
    return true;
  }
  if (sameStem && hashDistance <= 10) {
    return true;
  }
  if (hashDistance <= 3 && aspectGap < 0.1 && brightnessGap < 0.12) {
    return true;
  }
  if (sameOrientation && sameTopLevel && hashDistance <= 5 && aspectGap < 0.08 && brightnessGap < 0.08) {
    return true;
  }

  return false;
}

function filterNearDuplicateAssets(assets: PhotoAsset[], compareAgainst: PhotoAsset[] = []) {
  const accepted = [...compareAgainst];
  const unique: PhotoAsset[] = [];

  assets.forEach((asset) => {
    if (accepted.some((current) => areAssetsNearDuplicate(asset, current))) {
      return;
    }

    accepted.push(asset);
    unique.push(asset);
  });

  return unique;
}

function pickPreviewAssets(assets: PhotoAsset[], count = 5) {
  if (assets.length <= count) {
    return assets;
  }

  const selected: PhotoAsset[] = [];
  const seen = new Set<string>();
  for (let step = 0; step < count; step += 1) {
    const index = Math.round((step / (count - 1)) * (assets.length - 1));
    const asset = assets[index];
    if (!asset || seen.has(asset.id)) {
      continue;
    }
    selected.push(asset);
    seen.add(asset.id);
  }

  if (selected.length >= count) {
    return selected;
  }

  for (const asset of assets) {
    if (seen.has(asset.id)) {
      continue;
    }
    selected.push(asset);
    seen.add(asset.id);
    if (selected.length >= count) {
      break;
    }
  }

  return selected;
}

const filteredSeriesAssetsBySlug = new Map(
  seriesCatalog.series.map((series) => {
    const fullAssets = series.photoIds
      .map((id) => assetMap.get(id))
      .filter((item): item is PhotoAsset => item !== undefined);
    return [series.slug, filterNearDuplicateAssets(fullAssets)];
  }),
);

const filteredRawOnlyAssets = filterNearDuplicateAssets(
  seriesCatalog.rawOnlyPhotoIds
    .map((id) => assetMap.get(id))
    .filter((item): item is PhotoAsset => item !== undefined),
  [...filteredSeriesAssetsBySlug.values()].flat(),
);

function toDisplayAsset(asset: PhotoAsset): DisplayAsset {
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

export function getSiteMeta() {
  const fallbackCover = seriesCatalog.series[0]?.coverPhotoId ?? "";

  return {
    ...siteMeta,
    introDesktop: siteMeta.introDesktop || siteMeta.intro,
    introMobile: siteMeta.introMobile || siteMeta.intro,
    cityLabel: siteMeta.cityLabel || "New York",
    timeZone: siteMeta.timeZone || "America/New_York",
    contactBio: siteMeta.contactBio || siteMeta.intro,
    contactRepresented: siteMeta.contactRepresented || siteMeta.contactEmail,
    contactBackgroundPhotoId: siteMeta.contactBackgroundPhotoId || fallbackCover,
    disclaimerText:
      siteMeta.disclaimerText ||
      "All photographs are presented for editorial review and commission inquiry. Reproduction requires written permission.",
  } satisfies SiteMeta;
}

export function getSeries() {
  return seriesCatalog.series;
}

export function getSeriesBySlug(slug: string) {
  return seriesMap.get(slug) ?? null;
}

export function getAsset(id: string) {
  return assetMap.get(id) ?? null;
}

export function getAnalysis(id: string) {
  return analysisMap.get(id) ?? null;
}

export function getSeriesAssets(series: Series): DisplayAsset[] {
  return (filteredSeriesAssetsBySlug.get(series.slug) ?? [])
    .map(toDisplayAsset);
}

export function getPreviewAssets(series: Series) {
  return pickPreviewAssets(filteredSeriesAssetsBySlug.get(series.slug) ?? [])
    .map(toDisplayAsset);
}

export function getAllCanonicalAssets() {
  return photoCatalog.assets;
}

export function getIntroSlides(): IntroSlide[] {
  return filterNearDuplicateAssets(photoCatalog.assets).map((asset) => ({
    id: asset.id,
    averageColor: asset.averageColor,
    flash: asset.variants.hero,
    hold: asset.variants.hero,
  }));
}

export function getRawSequenceIds() {
  return [
    ...seriesCatalog.series.flatMap((series) => (filteredSeriesAssetsBySlug.get(series.slug) ?? []).map((asset) => asset.id)),
    ...filteredRawOnlyAssets.map((asset) => asset.id),
  ];
}

export function getRawSequenceAssets() {
  const order = getRawSequenceIds();
  return photoCatalog.assets
    .slice()
    .sort((left, right) => order.indexOf(left.id) - order.indexOf(right.id) || left.sourcePath.localeCompare(right.sourcePath))
    .map(toDisplayAsset);
}

export function getHomeSeriesEntries() {
  return seriesCatalog.series.map((series) => ({
    series,
    previews: getPreviewAssets(series),
  }));
}

export function getPortfolioPageEntries() {
  return seriesCatalog.series.map((series) => ({
    series: {
      slug: series.slug,
      title: series.title,
      subtitle: series.subtitle,
      synopsis: series.synopsis,
      tags: series.tags,
      portfolioIndex: series.portfolioIndex,
      photoCount: (filteredSeriesAssetsBySlug.get(series.slug) ?? []).length,
    },
    previews: getPreviewAssets(series),
  }));
}

export function getListPageEntries() {
  return seriesCatalog.series.map((series) => ({
    series: {
      slug: series.slug,
      title: series.title,
      portfolioIndex: series.portfolioIndex,
    },
    previews: getPreviewAssets(series),
  }));
}

export function getArchivePageEntries() {
  return seriesCatalog.series.map((series) => ({
    series: {
      slug: series.slug,
      title: series.title,
      archiveLabel: series.archiveLabel,
      archiveYear: series.archiveYear,
    },
    previews: getPreviewAssets(series),
  }));
}

export function getSeriesIndexBySlug(slug: string) {
  const index = seriesCatalog.series.findIndex((series) => series.slug === slug);
  return index >= 0 ? index : null;
}

export function getContactBackgroundAsset() {
  const meta = getSiteMeta();
  const asset = getAsset(meta.contactBackgroundPhotoId) ?? getAsset(seriesCatalog.series[0]?.coverPhotoId ?? "");
  return asset ? toDisplayAsset(asset) : null;
}
