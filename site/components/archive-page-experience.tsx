"use client";

import { useEffect, useState } from "react";
import { useTransitionRouter } from "next-transition-router";
import type { PhotoAsset, Series, SiteMeta } from "@/lib/types";
import { useUIStore } from "@/lib/ui-store";
import { formatArchiveIndex } from "@/lib/utils";
import { InfiniteVerticalSlider } from "@/components/infinite-vertical-slider";

type ArchiveItem = {
  series: Series;
  previews: PhotoAsset[];
};

export function ArchivePageExperience({
  items,
  siteMeta,
}: {
  items: ArchiveItem[];
  siteMeta: SiteMeta;
}) {
  const router = useTransitionRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const setNumber = useUIStore((state) => state.setNumber);
  const setTitle = useUIStore((state) => state.setTitle);
  const activeItem = items[activeIndex] ?? items[0];
  const activeHero = activeItem?.previews[0] ?? null;

  useEffect(() => {
    setTitle(siteMeta.photographer);
  }, [setTitle, siteMeta.photographer]);

  useEffect(() => {
    setNumber(activeIndex + 1);
  }, [activeIndex, setNumber]);

  return (
    <main className="archive-page-experience">
      <div className="archive-page-experience__gradient" />
      {activeItem && activeHero ? (
        <div className="archive-page-experience__hero">
          <img
            key={activeHero.id}
            src={activeHero.displayPath}
            alt={activeItem.series.title}
            width={activeHero.width}
            height={activeHero.height}
            className="archive-page-experience__hero-image"
          />
        </div>
      ) : null}
      <InfiniteVerticalSlider
        items={items}
        rowHeight={28}
        className="archive-page-experience__slider"
        itemClassName="archive-page-experience__row"
        onActiveChange={setActiveIndex}
        renderRow={(item, index, isActive) => (
          <button
            type="button"
            className="archive-page-experience__link"
            data-active={String(isActive)}
            onClick={() => router.push(`/portfolio/${item.series.slug}`)}
          >
            <span>{formatArchiveIndex(index + 1)}</span>
            <span>{item.series.title}</span>
            <span>{item.series.archiveLabel}</span>
            <span>{item.series.archiveYear || "\u2014"}</span>
          </button>
        )}
      />
    </main>
  );
}
