import { ArchivePageExperience } from "@/components/archive-page-experience";
import { getArchivePageEntries, getSiteMeta } from "@/lib/catalog";

export default function ArchivePage() {
  const items = getArchivePageEntries();
  const siteMeta = getSiteMeta();

  return <ArchivePageExperience items={items} siteMeta={siteMeta} />;
}
