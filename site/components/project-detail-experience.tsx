"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [activeIndex, setActiveIndex] = useState(0);
  const viewportWidth = useViewportWidth();
  const reducedMotion = useReducedMotion();
  const isMobile = viewportWidth > 0 && viewportWidth < 1024;
  const setActiveProjectSlug = useUIStore((state) => state.setActiveProjectSlug);
  const setNumber = useUIStore((state) => state.setNumber);
  const setTitle = useUIStore((state) => state.setTitle);
  const photoCopies = useMemo(
    () => assets.map((asset) => series.photoCaptions?.[asset.id] || series.projectInformation),
    [assets, series.photoCaptions, series.projectInformation],
  );
  const activeAsset = assets[Math.min(activeIndex, Math.max(assets.length - 1, 0))] ?? null;
  const activeCopy = useMemo(
    () => (activeAsset ? photoCopies[activeIndex] : null) || series.projectInformation,
    [activeAsset, activeIndex, photoCopies, series.projectInformation],
  );

  const updateRailCopy = useCallback((nextIndex: number) => {
    const nextCopy = photoCopies[nextIndex] || series.projectInformation;
    if (bodyRef.current && nextCopy && bodyRef.current.textContent !== nextCopy) {
      bodyRef.current.textContent = nextCopy;
    }
  }, [photoCopies, series.projectInformation]);

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
    setActiveIndex(0);
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
      const firstFrame = scroller.querySelector<HTMLElement>("[data-project-frame]");
      const frameSize = firstFrame?.offsetWidth ?? scroller.clientWidth;
      const nextScrollLeft = scroller.scrollLeft + event.deltaY;
      const nextIndex = Math.min(
        assets.length - 1,
        Math.max(0, Math.round(nextScrollLeft / Math.max(frameSize, 1))),
      );

      updateRailCopy(nextIndex);
      setActiveIndex((currentIndex) => (currentIndex === nextIndex ? currentIndex : nextIndex));
      scroller.scrollBy({
        left: event.deltaY,
        behavior: "auto",
      });
    };

    scroller.addEventListener("wheel", onWheel, { passive: false });
    return () => scroller.removeEventListener("wheel", onWheel);
  }, [assets.length, isMobile, updateRailCopy]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || assets.length <= 1) {
      return;
    }

    let frameHandle = 0;

    const updateActiveIndex = () => {
      frameHandle = 0;
      const firstFrame = scroller.querySelector<HTMLElement>("[data-project-frame]");
      const scrollPosition = isMobile ? window.scrollY : scroller.scrollLeft;
      const frameSize = isMobile ? window.innerHeight : firstFrame?.offsetWidth ?? scroller.clientWidth;
      const nextIndex = Math.min(
        assets.length - 1,
        Math.max(0, Math.round(scrollPosition / Math.max(frameSize, 1))),
      );

      updateRailCopy(nextIndex);
      setActiveIndex((currentIndex) => (currentIndex === nextIndex ? currentIndex : nextIndex));
    };

    const scheduleUpdate = () => {
      if (frameHandle) {
        return;
      }
      frameHandle = window.requestAnimationFrame(updateActiveIndex);
    };

    const scrollTarget: HTMLElement | Window = isMobile ? window : scroller;
    const observer =
      "IntersectionObserver" in window
        ? new IntersectionObserver(
            () => {
              scheduleUpdate();
            },
            {
              root: isMobile ? null : scroller,
              threshold: [0.4, 0.6, 0.8, 1],
            },
          )
        : null;

    scroller.querySelectorAll<HTMLElement>("[data-project-frame]").forEach((frame) => {
      observer?.observe(frame);
    });

    updateActiveIndex();
    scrollTarget.addEventListener("scroll", scheduleUpdate, { passive: true });
    scroller.addEventListener("wheel", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      if (frameHandle) {
        window.cancelAnimationFrame(frameHandle);
      }
      observer?.disconnect();
      scrollTarget.removeEventListener("scroll", scheduleUpdate);
      scroller.removeEventListener("wheel", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [assets.length, isMobile, updateRailCopy]);

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
  }, [activeCopy, reducedMotion, series.title]);

  return (
    <main className="project-detail-experience">
      <aside className="project-detail-experience__name-rail" aria-label="Project details">
        <div className="project-detail-experience__rail-content">
          <p ref={titleRef} className="project-detail-experience__rail-title">
            {series.title}
          </p>
          {activeCopy ? (
            <p ref={bodyRef} className="project-detail-experience__rail-copy">
              {activeCopy}
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
            <figure key={asset.id} className="project-detail-experience__frame" data-project-frame="">
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
