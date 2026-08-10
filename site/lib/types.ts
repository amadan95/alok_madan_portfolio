export type Orientation = "landscape" | "portrait" | "square";
export type AssetVariantKey = "raw" | "thumb" | "rail" | "hero";

export interface AssetVariantSource {
  webp: string;
  jpeg: string;
  width: number;
  height: number;
}

export interface AssetVariants {
  raw: AssetVariantSource;
  thumb: AssetVariantSource;
  rail: AssetVariantSource;
  hero: AssetVariantSource;
}

export interface TechnicalAsset {
  id: string;
  sourceChecksum: string;
  variantVersion: number;
  width: number;
  height: number;
  aspectRatio: number;
  orientation: Orientation;
  averageColor: string;
  variants: AssetVariants;
}

export interface AssetCatalog {
  catalogVersion: 1;
  variantVersion: number;
  assetCount: number;
  assets: TechnicalAsset[];
}

export type DisplayAsset = Pick<
  TechnicalAsset,
  "id" | "width" | "height" | "aspectRatio" | "orientation" | "averageColor" | "variants"
>;

export type SequenceRole =
  | "threshold"
  | "development-1"
  | "development-2"
  | "development-3"
  | "hinge"
  | "rupture"
  | "echo-1"
  | "echo-2"
  | "release";

export interface ExhibitImage {
  assetId: string;
  title: string;
  prose: string;
  alt: string;
  sequenceRole: SequenceRole;
}

export interface ExhibitCollection {
  slug: string;
  title: string;
  subtitle: string;
  synopsis: string;
  essay: string;
  tags: string[];
  coverPhotoId: string;
  previewPhotoIds: [string, string, string, string, string];
  images: ExhibitImage[];
}

export interface ExhibitMetadata {
  title: string;
  subtitle: string;
  statement: string;
}

export type ExhibitIntroV2 = ExhibitMetadata;

export interface ExhibitManifestV2 {
  manifestVersion: 2;
  exhibit: ExhibitMetadata;
  introPhotoIds: string[];
  collections: ExhibitCollection[];
}

export interface CuratedDisplayImage extends DisplayAsset {
  assetId: string;
  title: string;
  prose: string;
  alt: string;
  sequenceRole: SequenceRole;
}

/**
 * Runtime collection shape. Editorial fields come directly from the manifest;
 * the remaining fields are deterministic conveniences for route rendering.
 */
export interface CuratedCollection extends ExhibitCollection {
  portfolioIndex: number;
  photoCount: number;
}

export interface IntroSlide {
  id: string;
  alt: string;
  averageColor: string;
  flash: AssetVariantSource;
  hold: AssetVariantSource;
}

export interface PortfolioPageEntry {
  collection: CuratedCollection;
  cover: CuratedDisplayImage;
  previews: CuratedDisplayImage[];
  photoCount: number;
}

export interface CollectionCoverEntry {
  collection: CuratedCollection;
  cover: CuratedDisplayImage;
}

export interface SiteMeta {
  title: string;
  description: string;
  photographer: string;
  intro: string;
  introDesktop: string;
  introMobile: string;
  contactEmail: string;
  cityLabel: string;
  timeZone: string;
  contactBio: string;
  contactRepresented: string;
  contactBackgroundPhotoId: string;
  disclaimerText: string;
  socialLinks: Array<{
    label: string;
    href: string;
  }>;
}
