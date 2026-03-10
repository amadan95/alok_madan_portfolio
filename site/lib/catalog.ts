import "server-only";

import photoCatalogJson from "@/content/photo-analysis.json";
import seriesCatalogJson from "@/content/series.json";
import siteMetaJson from "@/content/site-meta.json";
import type { DisplayAsset, IntroSlide, PhotoAnalysis, PhotoAsset, PhotoCatalog, Series, SeriesCatalog, SiteMeta } from "@/lib/types";

const photoCatalog = photoCatalogJson as unknown as PhotoCatalog;
const seriesCatalog = seriesCatalogJson as unknown as SeriesCatalog;
const siteMeta = siteMetaJson as unknown as SiteMeta;

const assetMap = new Map(photoCatalog.assets.map((asset) => [asset.id, asset]));
const analysisMap = new Map(photoCatalog.analyses.map((analysis) => [analysis.photoId, analysis]));
const seriesMap = new Map(seriesCatalog.series.map((series) => [series.slug, series]));

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
  return series.photoIds
    .map((id) => {
      const asset = getAsset(id);
      if (!asset) {
        return null;
      }

      return toDisplayAsset(asset);
    })
    .filter((item): item is DisplayAsset => item !== null);
}

export function getPreviewAssets(series: Series) {
  return series.previewPhotoIds
    .map((id) => getAsset(id))
    .filter((item): item is PhotoAsset => item !== null)
    .map(toDisplayAsset);
}

export function getAllCanonicalAssets() {
  return photoCatalog.assets;
}

export function getIntroSlides(): IntroSlide[] {
  return photoCatalog.assets.map((asset) => ({
    id: asset.id,
    averageColor: asset.averageColor,
    flash: asset.variants.thumb,
    hold: asset.variants.hero,
  }));
}

export function getRawSequenceIds() {
  return [...seriesCatalog.series.flatMap((series) => series.photoIds), ...seriesCatalog.rawOnlyPhotoIds];
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
      photoCount: series.photoIds.length,
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
