import Link from "next/link";
import type { DisplayAsset, Series } from "@/lib/types";
import { formatSeriesIndex } from "@/lib/utils";
import { ResponsivePhoto } from "@/components/responsive-photo";

export function PortfolioStrip({
  series,
  previews,
}: {
  series: Series;
  previews: DisplayAsset[];
}) {
  return (
    <section className="folio-entry" id={series.slug}>
      <div className="folio-entry__heading">
        <span className="folio-entry__index">{formatSeriesIndex(series.portfolioIndex)}</span>
        <div className="folio-entry__meta">
          <Link href={`/portfolio/${series.slug}`} className="folio-entry__title" aria-label={`Open ${series.title}`}>
            {series.title}
          </Link>
          <p className="folio-entry__subtitle">{series.subtitle}</p>
          <p className="folio-entry__summary">{series.synopsis}</p>
        </div>
      </div>

      <Link href={`/portfolio/${series.slug}`} className="folio-entry__images" aria-label={`Open ${series.title}`}>
        {previews.map((asset) => (
          <figure
            key={asset.id}
            className="folio-entry__frame"
            style={{ flex: `${Math.max(0.72, Math.min(asset.aspectRatio, 1.8))} 1 0%` }}
          >
            <ResponsivePhoto asset={asset} alt={series.title} variants={["thumb", "rail"]} sizes="30vw" />
          </figure>
        ))}
      </Link>

      <div className="folio-entry__foot">
        <span>{series.photoIds.length} photographs</span>
        {series.tags.slice(0, 3).map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
    </section>
  );
}
