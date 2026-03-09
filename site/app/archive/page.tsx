import { ArchivePageExperience } from "@/components/archive-page-experience";
import { getHomeSeriesEntries, getSiteMeta } from "@/lib/catalog";

export default function ArchivePage() {
  const items = getHomeSeriesEntries();
  const siteMeta = getSiteMeta();

  return <ArchivePageExperience items={items} siteMeta={siteMeta} />;
}
