import { RawPageExperience } from "@/components/raw-page-experience";
import { getAllCanonicalAssets, getSeries } from "@/lib/catalog";

export default function RawPage() {
  const orderedIds = getSeries().flatMap((series) => series.photoIds);
  const assets = getAllCanonicalAssets().sort(
    (left, right) => orderedIds.indexOf(left.id) - orderedIds.indexOf(right.id) || left.sourcePath.localeCompare(right.sourcePath),
  );

  return <RawPageExperience assets={assets} />;
}
