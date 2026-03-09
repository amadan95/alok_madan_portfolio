"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import SplitType from "split-type";
import type { DisplayAsset, Series } from "@/lib/types";
import { useUIStore } from "@/lib/ui-store";

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
  const infoRef = useRef<HTMLParagraphElement | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const setActiveProjectSlug = useUIStore((state) => state.setActiveProjectSlug);
  const setNumber = useUIStore((state) => state.setNumber);
  const setTitle = useUIStore((state) => state.setTitle);

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollLeft = 0;
    }
    setTitle(series.title);
    setNumber(assets.length);
    setActiveProjectSlug(series.slug);
  }, [assets.length, series.slug, series.title, setActiveProjectSlug, setNumber, setTitle]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
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
  }, []);

  useEffect(() => {
    if (!showInfo || !infoRef.current) {
      return;
    }

    const split = new SplitType(infoRef.current, { types: "chars,words" });
    gsap.set(split.chars, { opacity: 0 });
    gsap.to(split.chars, {
      opacity: 1,
      duration: 0,
      stagger: 0.008,
    });

    return () => {
      split.revert();
    };
  }, [showInfo]);

  return (
    <main className="project-detail-experience">
      <aside className="project-detail-experience__name-rail" aria-label="Photographer">
        <Link href="/" className="project-detail-experience__name">
          {photographerName}
        </Link>
      </aside>

      <div className="project-detail-experience__controls">
        <div className="project-detail-experience__info-controls">
          {series.projectInformation ? (
            <button type="button" onClick={() => setShowInfo((value) => !value)}>
              Information
            </button>
          ) : (
            <span />
          )}
          <p>{series.archiveLabel}</p>
        </div>
      </div>

      {showInfo ? (
        <div className="project-detail-experience__information" onClick={() => setShowInfo(false)} role="presentation">
          <p ref={infoRef}>{series.projectInformation}</p>
        </div>
      ) : null}

      <div
        ref={scrollerRef}
        className="project-detail-experience__scroller-wrap"
        tabIndex={0}
        aria-label={`${series.title} horizontal reel`}
      >
        <div className="project-detail-experience__scroller">
          {assets.map((asset, index) => (
            <figure key={asset.id} className="project-detail-experience__frame">
              <img
                src={asset.displayPath}
                alt={`${series.title} ${index + 1}`}
                width={asset.width}
                height={asset.height}
                data-orientation={asset.orientation}
                loading={index === 0 ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={index === 0 ? "high" : "auto"}
              />
            </figure>
          ))}
        </div>
      </div>
    </main>
  );
}
