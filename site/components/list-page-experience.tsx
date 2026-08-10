"use client";

import { useEffect, useState } from "react";
import { useTransitionRouter } from "next-transition-router";
import type { CuratedDisplayImage, SiteMeta } from "@/lib/types";
import { useUIStore } from "@/lib/ui-store";
import { formatSeriesIndex } from "@/lib/utils";
import { InfiniteVerticalSlider } from "@/components/infinite-vertical-slider";
import { PortfolioModeBar } from "@/components/portfolio-mode-bar";
import { ResponsivePhoto } from "@/components/responsive-photo";

type ListItem = {
  collection: {
    slug: string;
    title: string;
    portfolioIndex: number;
  };
  cover: CuratedDisplayImage;
};

export function ListPageExperience({
  items,
  siteMeta,
}: {
  items: ListItem[];
  siteMeta: SiteMeta;
}) {
  const router = useTransitionRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const setNumber = useUIStore((state) => state.setNumber);
  const setTitle = useUIStore((state) => state.setTitle);
  const setMobileTitle = useUIStore((state) => state.setMobileTitle);
  const [displayedIndex, setDisplayedIndex] = useState(0);
  const activeItem = items[activeIndex] ?? items[0];
  const displayedItem = items[displayedIndex] ?? items[0];

  useEffect(() => {
    setTitle(siteMeta.photographer);
  }, [setTitle, siteMeta.photographer]);

  useEffect(() => {
    if (!activeItem) {
      return;
    }
    setNumber(activeItem.collection.portfolioIndex);
    setMobileTitle(activeItem.collection.title);
  }, [activeIndex, activeItem, setMobileTitle, setNumber]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDisplayedIndex(activeIndex);
    }, 96);

    return () => window.clearTimeout(timeout);
  }, [activeIndex]);

  return (
    <main className="list-page-experience">
      {displayedItem ? (
        <div className="list-page-experience__background">
          <ResponsivePhoto
            key={displayedItem.cover.id}
            asset={displayedItem.cover}
            alt={displayedItem.cover.alt}
            variants={["hero"]}
            sizes="100vw"
            eager
            fetchPriority="high"
          />
        </div>
      ) : null}
      <PortfolioModeBar mode="list" showZoom={false} />
      <div className="list-page-experience__mask" />
      <InfiniteVerticalSlider
        items={items}
        rowHeight={26}
        className="list-page-experience__slider"
        itemClassName="list-page-experience__row"
        onActiveChange={setActiveIndex}
        renderRow={(item, _index, isActive) => (
          <button
            type="button"
            className="list-page-experience__link"
            data-active={String(isActive)}
            onClick={() => router.push(`/portfolio/${item.collection.slug}`)}
          >
            <span>{formatSeriesIndex(item.collection.portfolioIndex)}</span>
            <span>{item.collection.title}</span>
          </button>
        )}
      />
    </main>
  );
}
