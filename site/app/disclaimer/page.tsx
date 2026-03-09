import { TextPageExperience } from "@/components/text-page-experience";
import { getContactBackgroundAsset, getSiteMeta } from "@/lib/catalog";

export default function DisclaimerPage() {
  const siteMeta = getSiteMeta();
  const backgroundAsset = getContactBackgroundAsset();

  return <TextPageExperience kind="disclaimer" siteMeta={siteMeta} backgroundAsset={backgroundAsset} />;
}
