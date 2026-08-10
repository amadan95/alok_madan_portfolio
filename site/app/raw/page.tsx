import { RawPageExperience } from "@/components/raw-page-experience";
import { getSelectedSequenceImages, getSiteMeta } from "@/lib/catalog";

export default function RawPage() {
  const assets = getSelectedSequenceImages();
  const siteMeta = getSiteMeta();

  return <RawPageExperience assets={assets} photographerName={siteMeta.photographer} />;
}
