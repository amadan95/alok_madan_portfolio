import { RawPageExperience } from "@/components/raw-page-experience";
import { getRawSequenceAssets, getSiteMeta } from "@/lib/catalog";

export default function RawPage() {
  const assets = getRawSequenceAssets();
  const siteMeta = getSiteMeta();

  return <RawPageExperience assets={assets} photographerName={siteMeta.photographer} />;
}
