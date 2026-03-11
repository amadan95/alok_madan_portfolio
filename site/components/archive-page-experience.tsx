"use client";

import { useEffect, useState } from "react";
import { useTransitionRouter } from "next-transition-router";
import type { DisplayAsset, SiteMeta } from "@/lib/types";
import { useViewportWidth } from "@/lib/client-hooks";
import { useUIStore } from "@/lib/ui-store";
import { formatArchiveIndex } from "@/lib/utils";
import { InfiniteVerticalSlider } from "@/components/infinite-vertical-slider";
import { ResponsivePhoto } from "@/components/responsive-photo";

type ArchiveItem = {
  series: {
    slug: string;
    title: string;
  };
  previews: DisplayAsset[];
};

export function ArchivePageExperience({
  items,
  siteMeta,
}: {
  items: ArchiveItem[];
  siteMeta: SiteMeta;
}) {
  const router = useTransitionRouter();
  const viewportWidth = useViewportWidth();
  const isMobile = viewportWidth > 0 && viewportWidth < 1024;
  const [activeIndex, setActiveIndex] = useState(0);
  const [displayedIndex, setDisplayedIndex] = useState(0);
  const setNumber = useUIStore((state) => state.setNumber);
  const setTitle = useUIStore((state) => state.setTitle);
  const activeItem = items[activeIndex] ?? items[0];
  const displayedItem = items[displayedIndex] ?? items[0];
  const activeHero = displayedItem?.previews[0] ?? null;

  useEffect(() => {
    setTitle(siteMeta.photographer);
  }, [setTitle, siteMeta.photographer]);

  useEffect(() => {
    setNumber(activeIndex + 1);
  }, [activeIndex, setNumber]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDisplayedIndex(activeIndex);
    }, 96);

    return () => window.clearTimeout(timeout);
  }, [activeIndex]);

  return (
    <main className="archive-page-experience">
      <div className="archive-page-experience__gradient" />
      {displayedItem && activeHero ? (
        <div className="archive-page-experience__hero">
          <ResponsivePhoto
            key={activeHero.id}
            asset={activeHero}
            alt={displayedItem.series.title}
            variants={["hero"]}
            sizes="100vw"
            eager
            fetchPriority="high"
            imgClassName="archive-page-experience__hero-image"
          />
        </div>
      ) : null}
      <InfiniteVerticalSlider
        items={items}
        rowHeight={isMobile ? 64 : 28}
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
          </button>
        )}
      />
    </main>
  );
}
