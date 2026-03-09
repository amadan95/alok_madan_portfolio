"use client";

import { useMemo, useState } from "react";
import type { PhotoAsset } from "@/lib/types";
import { createSeededRandom } from "@/lib/utils";
import { InfiniteVerticalSlider } from "@/components/infinite-vertical-slider";

type RawRow = {
  id: string;
  assets: PhotoAsset[];
  align: "start" | "center" | "end";
  padLeft: number;
  padRight: number;
};

function buildRows(assets: PhotoAsset[]) {
  const random = createSeededRandom(assets.map((asset) => asset.id).join("|"));
  const shuffled = [...assets];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  const alignments: Array<RawRow["align"]> = ["start", "center", "end"];
  const paddingBuckets = [0, 100, 200, 300];
  const rows: RawRow[] = [];

  for (let index = 0; index < shuffled.length; index += 4) {
    rows.push({
      id: `raw-row-${index}`,
      assets: shuffled.slice(index, index + 4),
      align: alignments[Math.floor(random() * alignments.length)] ?? "center",
      padLeft: paddingBuckets[Math.floor(random() * paddingBuckets.length)] ?? 0,
      padRight: paddingBuckets[Math.floor(random() * paddingBuckets.length)] ?? 0,
    });
  }

  return rows;
}

export function RawPageExperience({ assets }: { assets: PhotoAsset[] }) {
  const [activeAsset, setActiveAsset] = useState<PhotoAsset | null>(null);
  const rows = useMemo(() => buildRows(assets), [assets]);

  return (
    <main className="raw-page-experience">
      <div className="raw-page-experience__gradient" />
      {activeAsset ? (
        <div className="raw-page-experience__overlay">
          <img src={activeAsset.displayPath} alt="" width={activeAsset.width} height={activeAsset.height} />
        </div>
      ) : null}
      <InfiniteVerticalSlider
        items={rows}
        rowHeight={136}
        className="raw-page-experience__slider"
        itemClassName="raw-page-experience__row"
        onActiveChange={() => {}}
        autoScrollSpeed={14}
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
              <figure key={asset.id} className="raw-page-experience__frame">
                <img
                  src={asset.displayPath}
                  alt=""
                  width={asset.width}
                  height={asset.height}
                  onMouseEnter={() => setActiveAsset(asset)}
                  onMouseLeave={() => setActiveAsset(null)}
                />
              </figure>
            ))}
          </div>
        )}
      />
    </main>
  );
}
