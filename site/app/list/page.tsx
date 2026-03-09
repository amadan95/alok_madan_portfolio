import { ListPageExperience } from "@/components/list-page-experience";
import { getListPageEntries, getSiteMeta } from "@/lib/catalog";

export default function ListPage() {
  const items = getListPageEntries();
  const siteMeta = getSiteMeta();

  return <ListPageExperience items={items} siteMeta={siteMeta} />;
}
