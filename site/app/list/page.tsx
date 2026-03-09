import { ListPageExperience } from "@/components/list-page-experience";
import { getHomeSeriesEntries, getSiteMeta } from "@/lib/catalog";

export default function ListPage() {
  const items = getHomeSeriesEntries();
  const siteMeta = getSiteMeta();

  return <ListPageExperience items={items} siteMeta={siteMeta} />;
}
