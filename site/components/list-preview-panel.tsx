"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useState } from "react";
import type { PhotoAsset, Series } from "@/lib/types";
import { formatSeriesIndex } from "@/lib/utils";

type SeriesWithPreview = {
  series: Series;
  previews: PhotoAsset[];
};

export function ListPreviewPanel({ items }: { items: SeriesWithPreview[] }) {
  const [activeSlug, setActiveSlug] = useState(items[0]?.series.slug ?? "");
  const deferredSlug = useDeferredValue(activeSlug);
  const activeItem = items.find((item) => item.series.slug === deferredSlug) ?? items[0];

  return (
    <div className="list-layout">
      <div className="section-card p-5 md:p-7">
        {items.map(({ series }) => (
          <Link
            key={series.slug}
            href={`/portfolio/${series.slug}`}
            className="list-item"
            data-active={String(series.slug === deferredSlug)}
            onMouseEnter={() => {
              startTransition(() => setActiveSlug(series.slug));
            }}
            onFocus={() => {
              startTransition(() => setActiveSlug(series.slug));
            }}
          >
            <span className="eyebrow">{formatSeriesIndex(series.portfolioIndex)}</span>
            <span className="list-item__title">{series.title}</span>
            <span className="page-copy text-sm">{series.subtitle}</span>
          </Link>
        ))}
      </div>

      {activeItem ? (
        <div className="list-preview section-card p-5 md:p-7">
          <span className="eyebrow">Preview / {formatSeriesIndex(activeItem.series.portfolioIndex)}</span>
          <div className="grid gap-3">
            <h2 className="page-title text-[clamp(2.4rem,2rem+1vw,3.4rem)]">{activeItem.series.title}</h2>
            <p className="page-copy">{activeItem.series.synopsis}</p>
          </div>

          <div className="list-preview__strip">
            {activeItem.previews.slice(0, 3).map((asset) => (
              <figure
                key={asset.id}
                className="list-preview__frame"
                style={{ flex: `${Math.max(0.72, Math.min(asset.aspectRatio, 1.5))} 1 0%` }}
              >
                <img src={asset.displayPath} alt={activeItem.series.title} width={asset.width} height={asset.height} />
              </figure>
            ))}
          </div>

          <div className="tag-list">
            {activeItem.series.tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
