import { RawPageExperience } from "@/components/raw-page-experience";
import { getRawSequenceAssets } from "@/lib/catalog";

export default function RawPage() {
  const assets = getRawSequenceAssets();

  return <RawPageExperience assets={assets} />;
}
