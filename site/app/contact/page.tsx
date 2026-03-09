import { TextPageExperience } from "@/components/text-page-experience";
import { getContactBackgroundAsset, getSiteMeta } from "@/lib/catalog";

export default function ContactPage() {
  const siteMeta = getSiteMeta();
  const backgroundAsset = getContactBackgroundAsset();

  return <TextPageExperience kind="contact" siteMeta={siteMeta} backgroundAsset={backgroundAsset} />;
}
