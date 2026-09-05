"use client";

import { useEffect, useState } from "react";
import { useTransitionRouter } from "next-transition-router";
import type { CuratedDisplayImage, SiteMeta } from "@/lib/types";
import { useViewportWidth } from "@/lib/client-hooks";
import { useUIStore } from "@/lib/ui-store";
import { formatArchiveIndex } from "@/lib/utils";
import { InfiniteVerticalSlider } from "@/components/infinite-vertical-slider";
import { DecodedBackground } from "@/components/decoded-background";

type ArchiveItem = {
  collection: {
    slug: string;
    title: string;
    portfolioIndex: number;
  };
  cover: CuratedDisplayImage;
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
  const setNumber = useUIStore((state) => state.setNumber);
  const setTitle = useUIStore((state) => state.setTitle);
  const activeItem = items[activeIndex] ?? items[0];
  const activeHero = activeItem?.cover ?? null;

  useEffect(() => {
    setTitle(siteMeta.photographer);
  }, [setTitle, siteMeta.photographer]);

  useEffect(() => {
    if (activeItem) {
      setNumber(activeItem.collection.portfolioIndex);
    }
  }, [activeItem, setNumber]);

  return (
    <main className="archive-page-experience">
      <div className="archive-page-experience__gradient" />
      {activeItem && activeHero ? (
        <DecodedBackground asset={activeHero} className="archive-page-experience__hero" imageClassName="archive-page-experience__hero-image" />
      ) : null}
      <InfiniteVerticalSlider
        items={items}
        rowHeight={isMobile ? 64 : 28}
        className="archive-page-experience__slider"
        itemClassName="archive-page-experience__row"
        onActiveChange={setActiveIndex}
        renderRow={(item, _index, isActive) => (
          <button
            type="button"
            className="archive-page-experience__link"
            data-active={String(isActive)}
            onClick={() => router.push(`/portfolio/${item.collection.slug}`)}
          >
            <span>{formatArchiveIndex(item.collection.portfolioIndex)}</span>
            <span>{item.collection.title}</span>
          </button>
        )}
      />
    </main>
  );
}
