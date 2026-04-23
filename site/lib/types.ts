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

export type SequenceRole =
  | "anchor"
  | "bridge"
  | "pivot"
  | "texture"
  | "release"
  | "coda";

export interface PhotoAsset {
  id: string;
  sourcePath: string;
  canonicalPath: string;
  width: number;
  height: number;
  aspectRatio: number;
  orientation: Orientation;
  variants: AssetVariants;
  checksum: string;
  perceptualHash: string;
  averageColor: string;
  brightness: number;
  variantGroupId: string;
  captureYear: string;
  provenance: {
    topLevel: string;
    pathParts: string[];
    basename: string;
  };
}

export type DisplayAsset = Pick<PhotoAsset, "id" | "width" | "height" | "aspectRatio" | "orientation" | "averageColor" | "variants">;

export interface IntroSlide {
  id: string;
  averageColor: string;
  flash: AssetVariantSource;
  hold: AssetVariantSource;
}

export interface PhotoAnalysis {
  photoId: string;
  sceneType: string;
  locationCue: string | null;
  narrativeKeywords: string[];
  moodKeywords: string[];
  duplicateConfidence: number;
  sequenceRole: SequenceRole;
  confidence: number;
  lightMode: "daylight" | "twilight" | "night";
  humanPresence: "none" | "trace" | "present" | "dominant";
  subjectDistance: "far" | "mid" | "close";
  energyScore: number;
  intimacyScore: number;
  surrealnessScore: number;
  toneTags: string[];
  analysisMode: "ai" | "heuristic";
  rationale: string;
  needsReview: boolean;
}

export interface Series {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  synopsis: string;
  tags: string[];
  coverPhotoId: string;
  previewPhotoIds: string[];
  photoIds: string[];
  portfolioIndex: number;
  archiveLabel: string;
  archiveYear: string;
  credits: string;
  projectInformation: string;
  primaryTone: string;
  roomStatement: string;
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

export interface PhotoCatalog {
  generatedAt: string;
  canonicalPhotoCount: number;
  variantGroupCount: number;
  assets: PhotoAsset[];
  analyses: PhotoAnalysis[];
  hiddenVariantPaths: string[];
}

export interface SeriesCatalog {
  generatedAt: string;
  totalSeries: number;
  exhibitPhotoCount: number;
  rawOnlyPhotoIds: string[];
  series: Series[];
}
