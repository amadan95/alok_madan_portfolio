import { PortfolioHome } from "@/components/portfolio-home";
import { getHomeSeriesEntries, getSiteMeta } from "@/lib/catalog";

export default function HomePage() {
  const items = getHomeSeriesEntries();
  const siteMeta = getSiteMeta();

  return <PortfolioHome items={items} siteMeta={siteMeta} />;
}
