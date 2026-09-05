"use client";

import { useEffect, useState } from "react";
import { useTransitionRouter } from "next-transition-router";
import type { CuratedDisplayImage, SiteMeta } from "@/lib/types";
import { useUIStore } from "@/lib/ui-store";
import { formatSeriesIndex } from "@/lib/utils";
import { InfiniteVerticalSlider } from "@/components/infinite-vertical-slider";
import { PortfolioModeBar } from "@/components/portfolio-mode-bar";
import { DecodedBackground } from "@/components/decoded-background";

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
  const activeItem = items[activeIndex] ?? items[0];

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

  return (
    <main className="list-page-experience">
      {activeItem ? (
        <DecodedBackground asset={activeItem.cover} className="list-page-experience__background" />
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
