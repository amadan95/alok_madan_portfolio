"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { DisplayAsset, Series } from "@/lib/types";
import { useViewportWidth } from "@/lib/client-hooks";
import { useUIStore } from "@/lib/ui-store";
import { ResponsivePhoto } from "@/components/responsive-photo";

export function ProjectDetailExperience({
  series,
  assets,
  photographerName,
}: {
  series: Series;
  assets: DisplayAsset[];
  photographerName: string;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const viewportWidth = useViewportWidth();
  const isMobile = viewportWidth > 0 && viewportWidth < 1024;
  const setActiveProjectSlug = useUIStore((state) => state.setActiveProjectSlug);
  const setNumber = useUIStore((state) => state.setNumber);
  const setTitle = useUIStore((state) => state.setTitle);

  useEffect(() => {
    if (scrollerRef.current) {
      if (isMobile) {
        scrollerRef.current.scrollTop = 0;
      } else {
        scrollerRef.current.scrollLeft = 0;
      }
    }
    setTitle(series.title);
    setNumber(assets.length);
    setActiveProjectSlug(series.slug);
  }, [assets.length, isMobile, series.slug, series.title, setActiveProjectSlug, setNumber, setTitle]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || isMobile) {
      return;
    }

    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
        return;
      }

      event.preventDefault();
      scroller.scrollBy({
        left: event.deltaY,
        behavior: "auto",
      });
    };

    scroller.addEventListener("wheel", onWheel, { passive: false });
    return () => scroller.removeEventListener("wheel", onWheel);
  }, [isMobile]);

  return (
    <main className="project-detail-experience">
      <aside className="project-detail-experience__name-rail" aria-label="Photographer">
        <div className="project-detail-experience__rail-content">
          <Link href="/" className="project-detail-experience__name">
            {photographerName}
          </Link>
          {series.projectInformation ? (
            <p className="project-detail-experience__rail-copy">{series.projectInformation}</p>
          ) : null}
        </div>
      </aside>

      <div
        ref={scrollerRef}
        className="project-detail-experience__scroller-wrap"
        tabIndex={0}
        aria-label={`${series.title} ${isMobile ? "vertical" : "horizontal"} reel`}
      >
        <div className="project-detail-experience__scroller">
          {assets.map((asset, index) => (
            <figure key={asset.id} className="project-detail-experience__frame">
              <ResponsivePhoto
                asset={asset}
                alt={`${series.title} ${index + 1}`}
                variants={["rail", "hero"]}
                sizes="100vw"
                eager={index < 2}
                fetchPriority={index === 0 ? "high" : "auto"}
                observerRoot={isMobile ? null : scrollerRef.current}
                rootMargin={isMobile ? "120% 0px" : "0px 120% 0px 120%"}
                imgProps={{
                  "data-orientation": asset.orientation,
                }}
              />
            </figure>
          ))}
        </div>
      </div>
    </main>
  );
}
