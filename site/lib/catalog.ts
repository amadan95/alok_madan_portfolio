import photoCatalogJson from "@/content/photo-analysis.json";
import seriesCatalogJson from "@/content/series.json";
import siteMetaJson from "@/content/site-meta.json";
import type { PhotoAnalysis, PhotoAsset, PhotoCatalog, Series, SeriesCatalog, SiteMeta } from "@/lib/types";

const photoCatalog = photoCatalogJson as PhotoCatalog;
const seriesCatalog = seriesCatalogJson as SeriesCatalog;
const siteMeta = siteMetaJson as SiteMeta;

const assetMap = new Map(photoCatalog.assets.map((asset) => [asset.id, asset]));
const analysisMap = new Map(photoCatalog.analyses.map((analysis) => [analysis.photoId, analysis]));
const seriesMap = new Map(seriesCatalog.series.map((series) => [series.slug, series]));

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

export function getSeriesAssets(series: Series): Array<PhotoAsset & { analysis: PhotoAnalysis | null }> {
  return series.photoIds
    .map((id) => {
      const asset = getAsset(id);
      if (!asset) {
        return null;
      }

      return {
        ...asset,
        analysis: getAnalysis(id),
      };
    })
    .filter((item): item is PhotoAsset & { analysis: PhotoAnalysis | null } => item !== null);
}

export function getPreviewAssets(series: Series) {
  return series.previewPhotoIds
    .map((id) => getAsset(id))
    .filter((item): item is PhotoAsset => item !== null);
}

export function getAllCanonicalAssets() {
  return photoCatalog.assets;
}

export function getHomeSeriesEntries() {
  return seriesCatalog.series.map((series) => ({
    series,
    previews: getPreviewAssets(series),
    assets: getSeriesAssets(series),
  }));
}

export function getSeriesIndexBySlug(slug: string) {
  const index = seriesCatalog.series.findIndex((series) => series.slug === slug);
  return index >= 0 ? index : null;
}

export function getContactBackgroundAsset() {
  const meta = getSiteMeta();
  return getAsset(meta.contactBackgroundPhotoId) ?? getAsset(seriesCatalog.series[0]?.coverPhotoId ?? "") ?? null;
}
