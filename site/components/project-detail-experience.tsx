"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import SplitType from "split-type";
import type { DisplayAsset, Series } from "@/lib/types";
import { useReducedMotion, useViewportWidth } from "@/lib/client-hooks";
import { useUIStore } from "@/lib/ui-store";
import { ResponsivePhoto } from "@/components/responsive-photo";

export function ProjectDetailExperience({
  series,
  assets,
}: {
  series: Series;
  assets: DisplayAsset[];
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLParagraphElement | null>(null);
  const bodyRef = useRef<HTMLParagraphElement | null>(null);
  const viewportWidth = useViewportWidth();
  const reducedMotion = useReducedMotion();
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

  useEffect(() => {
    const titleNode = titleRef.current;
    const bodyNode = bodyRef.current;

    if (!titleNode || !bodyNode || reducedMotion) {
      if (titleNode) {
        gsap.set(titleNode, { clearProps: "all" });
      }
      if (bodyNode) {
        gsap.set(bodyNode, { clearProps: "all" });
      }
      return;
    }

    const split = new SplitType(bodyNode, { types: "chars,words" });
    const characters = split.chars ?? [];

    const context = gsap.context(() => {
      gsap.set(titleNode, { autoAlpha: 0, y: 22 });
      gsap.set(characters, { opacity: 0 });

      const timeline = gsap.timeline();
      timeline.to(titleNode, {
        autoAlpha: 1,
        y: 0,
        duration: 0.48,
        ease: "power2.out",
      });

      if (characters.length > 0) {
        timeline.to(
          characters,
          {
            opacity: 1,
            duration: 0,
            stagger: 0.007,
          },
          "-=0.16",
        );
      }
    });

    return () => {
      context.revert();
      split.revert();
    };
  }, [reducedMotion, series.projectInformation, series.title]);

  return (
    <main className="project-detail-experience">
      <aside className="project-detail-experience__name-rail" aria-label="Project details">
        <div className="project-detail-experience__rail-content">
          <p ref={titleRef} className="project-detail-experience__rail-title">
            {series.title}
          </p>
          {series.projectInformation ? (
            <p ref={bodyRef} className="project-detail-experience__rail-copy">
              {series.projectInformation}
            </p>
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
