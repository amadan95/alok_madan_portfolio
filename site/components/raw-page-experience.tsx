"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import type { CuratedDisplayImage } from "@/lib/types";
import { createSeededRandom } from "@/lib/utils";
import { InfiniteVerticalSlider } from "@/components/infinite-vertical-slider";
import { ResponsivePhoto } from "@/components/responsive-photo";

type RawRow = {
  id: string;
  assets: CuratedDisplayImage[];
  align: "start" | "center" | "end";
  padLeft: number;
  padRight: number;
};

function buildRows(assets: CuratedDisplayImage[]) {
  const random = createSeededRandom(assets.map((asset) => asset.id).join("|"));

  const alignments: Array<RawRow["align"]> = ["start", "center", "end"];
  const paddingBuckets = [0, 100, 200, 300];
  const rows: RawRow[] = [];

  for (let index = 0; index < assets.length; index += 4) {
    rows.push({
      id: `raw-row-${index}`,
      assets: assets.slice(index, index + 4),
      align: alignments[Math.floor(random() * alignments.length)] ?? "center",
      padLeft: paddingBuckets[Math.floor(random() * paddingBuckets.length)] ?? 0,
      padRight: paddingBuckets[Math.floor(random() * paddingBuckets.length)] ?? 0,
    });
  }

  return rows;
}

export function RawPageExperience({
  assets,
  photographerName,
}: {
  assets: CuratedDisplayImage[];
  photographerName: string;
}) {
  const [activeAsset, setActiveAsset] = useState<CuratedDisplayImage | null>(null);
  const rows = useMemo(() => buildRows(assets), [assets]);

  const handleThumbnailKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Escape") {
      event.currentTarget.blur();
      setActiveAsset(null);
    }
  };

  return (
    <main
      className="raw-page-experience"
      data-raw-selected-count={assets.length}
      data-raw-selected-view=""
    >
      <div className="raw-page-experience__gradient" />
      <aside className="raw-page-experience__name-rail" aria-label="Photographer">
        <Link href="/" className="raw-page-experience__name">
          {photographerName}
        </Link>
      </aside>
      {activeAsset ? (
        <div
          className="raw-page-experience__overlay"
          data-active-photo-id={activeAsset.id}
          data-raw-overlay=""
        >
          <ResponsivePhoto
            asset={activeAsset}
            alt=""
            variants={["hero"]}
            sizes="82vw"
            eager
            fetchPriority="high"
            imgProps={{ "aria-hidden": true }}
          />
        </div>
      ) : null}
      <InfiniteVerticalSlider
        items={rows}
        rowHeight={136}
        className="raw-page-experience__slider"
        itemClassName="raw-page-experience__row"
        onActiveChange={() => {}}
        autoScrollSpeed={activeAsset ? 0 : 14}
        maxRenderedRows={12}
        renderRow={(row) => (
          <div
            className="raw-page-experience__strip"
            style={{
              justifyContent: row.align,
              paddingLeft: `${row.padLeft}px`,
              paddingRight: `${row.padRight}px`,
            }}
          >
            {row.assets.map((asset) => (
              <figure
                key={asset.id}
                className="raw-page-experience__frame"
                data-raw-photo-id={asset.id}
              >
                <button
                  type="button"
                  className="raw-page-experience__thumbnail"
                  data-raw-thumbnail=""
                  data-active={String(activeAsset?.id === asset.id)}
                  onClick={() => setActiveAsset(asset)}
                  onFocus={() => setActiveAsset(asset)}
                  onBlur={() => setActiveAsset(null)}
                  onPointerEnter={() => setActiveAsset(asset)}
                  onPointerLeave={(event) => {
                    if (document.activeElement !== event.currentTarget) {
                      setActiveAsset(null);
                    }
                  }}
                  onKeyDown={handleThumbnailKeyDown}
                >
                  <ResponsivePhoto
                    asset={asset}
                    alt={asset.alt}
                    variants={["raw"]}
                    sizes="20vw"
                    rootMargin="120% 0px"
                  />
                </button>
              </figure>
            ))}
          </div>
        )}
      />
    </main>
  );
}
