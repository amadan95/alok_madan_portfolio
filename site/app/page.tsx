import { PortfolioHome } from "@/components/portfolio-home";
import { getPortfolioPageEntries, getSiteMeta } from "@/lib/catalog";

export default function HomePage() {
  const items = getPortfolioPageEntries();
  const siteMeta = getSiteMeta();

  return <PortfolioHome items={items} siteMeta={siteMeta} />;
}
