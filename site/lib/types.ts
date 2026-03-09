export type Orientation = "landscape" | "portrait" | "square";

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
  displayPath: string;
  thumbPath: string;
  width: number;
  height: number;
  aspectRatio: number;
  orientation: Orientation;
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

export type IntroSlide = Pick<PhotoAsset, "id" | "displayPath" | "width" | "height">;

export interface PhotoAnalysis {
  photoId: string;
  sceneType: string;
  locationCue: string | null;
  narrativeKeywords: string[];
  moodKeywords: string[];
  duplicateConfidence: number;
  sequenceRole: SequenceRole;
  confidence: number;
  analysisMode: "ai" | "heuristic";
  rationale: string;
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
  series: Series[];
}
