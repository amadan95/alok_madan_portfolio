"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import Link from "next/link";
import gsap from "gsap";
import type { CuratedDisplayImage } from "@/lib/types";
import { useReducedMotion, useViewportWidth } from "@/lib/client-hooks";
import { useUIStore } from "@/lib/ui-store";
import { ResponsivePhoto } from "@/components/responsive-photo";

type ActiveRailCopy = {
  number: string;
  title: string;
  prose: string;
};

export function ProjectDetailExperience({
  collection,
  images,
}: {
  collection: { slug: string; title: string; synopsis: string };
  images: CuratedDisplayImage[];
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const railUpdateRef = useRef<HTMLDivElement | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const viewportWidth = useViewportWidth();
  const reducedMotion = useReducedMotion();
  const isMobile = viewportWidth > 0 && viewportWidth < 1024;
  const setActiveProjectSlug = useUIStore((state) => state.setActiveProjectSlug);
  const setNumber = useUIStore((state) => state.setNumber);
  const setTitle = useUIStore((state) => state.setTitle);

  const activeRailCopy = useMemo<ActiveRailCopy>(() => {
    const imageIndex = Math.min(activeSlideIndex, Math.max(images.length - 1, 0));
    const image = images[imageIndex];
    return image
      ? {
          number: `${String(imageIndex + 1).padStart(2, "0")} / ${String(images.length).padStart(2, "0")}`,
          title: image.title,
          prose: image.prose,
        }
      : {
          number: "01 / 00",
          title: collection.title,
          prose: collection.synopsis,
        };
  }, [activeSlideIndex, collection.synopsis, collection.title, images]);

  const getSlides = useCallback(() => {
    return Array.from(
      scrollerRef.current?.querySelectorAll<HTMLElement>("[data-project-slide]") ?? [],
    );
  }, []);

  const updateActiveSlideFromElements = useCallback(() => {
    const scroller = scrollerRef.current;
    const slides = getSlides();
    if (!scroller || slides.length === 0) {
      return;
    }

    const scrollerRect = scroller.getBoundingClientRect();
    const viewportCenter = isMobile
      ? window.innerHeight / 2
      : scrollerRect.left + scroller.clientWidth / 2;

    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    slides.forEach((slide, index) => {
      const rect = slide.getBoundingClientRect();
      const slideCenter = isMobile
        ? rect.top + rect.height / 2
        : rect.left + rect.width / 2;
      const distance = Math.abs(slideCenter - viewportCenter);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    setActiveSlideIndex((currentIndex) =>
      currentIndex === nearestIndex ? currentIndex : nearestIndex,
    );
  }, [getSlides, isMobile]);

  const scrollToSlide = useCallback(
    (nextIndex: number) => {
      const scroller = scrollerRef.current;
      const slides = getSlides();
      if (!scroller || slides.length === 0) {
        return;
      }

      const boundedIndex = Math.min(slides.length - 1, Math.max(0, nextIndex));
      const nextSlide = slides[boundedIndex];
      if (!nextSlide) {
        return;
      }

      setActiveSlideIndex(boundedIndex);
      if (isMobile) {
        nextSlide.scrollIntoView({
          behavior: reducedMotion ? "auto" : "smooth",
          block: "start",
        });
        return;
      }

      scroller.scrollTo({
        left: nextSlide.offsetLeft,
        behavior: reducedMotion ? "auto" : "smooth",
      });
    },
    [getSlides, isMobile, reducedMotion],
  );

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (target.closest("a, button, input, select, textarea")) {
        return;
      }

      let nextIndex: number | null = null;
      switch (event.key) {
        case "Home":
          nextIndex = 0;
          break;
        case "End":
          nextIndex = images.length - 1;
          break;
        case "PageUp":
          nextIndex = activeSlideIndex - 1;
          break;
        case "PageDown":
          nextIndex = activeSlideIndex + 1;
          break;
        case "ArrowLeft":
          if (!isMobile) {
            nextIndex = activeSlideIndex - 1;
          }
          break;
        case "ArrowRight":
          if (!isMobile) {
            nextIndex = activeSlideIndex + 1;
          }
          break;
        case "ArrowUp":
          if (isMobile) {
            nextIndex = activeSlideIndex - 1;
          }
          break;
        case "ArrowDown":
          if (isMobile) {
            nextIndex = activeSlideIndex + 1;
          }
          break;
        default:
          break;
      }

      if (nextIndex === null) {
        return;
      }

      event.preventDefault();
      scrollToSlide(nextIndex);
    },
    [activeSlideIndex, images.length, isMobile, scrollToSlide],
  );

  useEffect(() => {
    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("a, button, input, select, textarea")) return;

      let nextIndex: number | null = null;
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        nextIndex = activeSlideIndex - 1;
      } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        nextIndex = activeSlideIndex + 1;
      }
      if (nextIndex === null) return;

      event.preventDefault();
      scrollToSlide(nextIndex);
    };

    window.addEventListener("keydown", onWindowKeyDown);
    return () => window.removeEventListener("keydown", onWindowKeyDown);
  }, [activeSlideIndex, scrollToSlide]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller) {
      if (isMobile) {
        window.scrollTo({ top: 0, behavior: "auto" });
      } else {
        scroller.scrollTo({ left: 0, behavior: "auto" });
      }
    }

    setTitle(collection.title);
    setNumber(1);
    setActiveProjectSlug(collection.slug);
    setActiveSlideIndex(0);
  }, [
    collection.slug,
    collection.title,
    images.length,
    isMobile,
    setActiveProjectSlug,
    setNumber,
    setTitle,
  ]);

  useEffect(() => {
    setNumber(activeSlideIndex + 1);
  }, [activeSlideIndex, setNumber]);

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
      scroller.scrollBy({ left: event.deltaY, behavior: "auto" });
    };

    scroller.addEventListener("wheel", onWheel, { passive: false });
    return () => scroller.removeEventListener("wheel", onWheel);
  }, [isMobile]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const slides = getSlides();
    if (!scroller || slides.length === 0) {
      return;
    }

    let frameHandle = 0;
    const scheduleUpdate = () => {
      if (frameHandle) {
        return;
      }
      frameHandle = window.requestAnimationFrame(() => {
        frameHandle = 0;
        updateActiveSlideFromElements();
      });
    };

    const scrollTarget: HTMLElement | Window = isMobile ? window : scroller;
    const observer =
      "IntersectionObserver" in window
        ? new IntersectionObserver(scheduleUpdate, {
            root: isMobile ? null : scroller,
            rootMargin: isMobile ? "-20% 0px -20%" : "0px -20%",
            threshold: [0, 0.25, 0.5, 0.75, 1],
          })
        : null;

    slides.forEach((slide) => observer?.observe(slide));
    updateActiveSlideFromElements();
    scrollTarget.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      if (frameHandle) {
        window.cancelAnimationFrame(frameHandle);
      }
      observer?.disconnect();
      scrollTarget.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [getSlides, isMobile, updateActiveSlideFromElements]);

  useEffect(() => {
    const railUpdate = railUpdateRef.current;
    if (!railUpdate) {
      return;
    }

    if (reducedMotion) {
      gsap.set(railUpdate, { clearProps: "all" });
      return;
    }

    const tween = gsap.fromTo(
      railUpdate,
      { autoAlpha: 0, y: 12 },
      { autoAlpha: 1, y: 0, duration: 0.24, ease: "power3.out" },
    );
    return () => {
      tween.revert();
    };
  }, [activeRailCopy, reducedMotion]);

  return (
    <main className="project-detail-experience">
      <aside
        className="project-detail-experience__name-rail"
        aria-label="Active collection passage"
        data-desktop-rail=""
      >
        <div
          ref={railUpdateRef}
          className="project-detail-experience__rail-content"
        >
          <p className="project-detail-experience__rail-number">
            {activeRailCopy.number}
          </p>
          <p className="project-detail-experience__rail-title" data-image-title="">
            {activeRailCopy.title}
          </p>
          <p className="project-detail-experience__rail-copy" data-image-prose="">
            {activeRailCopy.prose}
          </p>
        </div>
        <nav className="project-detail-experience__navigation" aria-label="Gallery controls">
          <Link href="/" className="project-detail-experience__return">Collections</Link>
          <div className="project-detail-experience__step-controls">
            <button type="button" onClick={() => scrollToSlide(activeSlideIndex - 1)} disabled={activeSlideIndex === 0}>
              Previous
            </button>
            <button type="button" onClick={() => scrollToSlide(activeSlideIndex + 1)} disabled={activeSlideIndex === images.length - 1}>
              Next
            </button>
          </div>
        </nav>
      </aside>

      <div
        ref={scrollerRef}
        className="project-detail-experience__scroller-wrap"
        tabIndex={0}
        aria-label={`${collection.title} ${isMobile ? "vertical" : "horizontal"} gallery. Use arrow, Page Up, Page Down, Home, or End keys to navigate.`}
        onKeyDown={onKeyDown}
      >
        <div className="project-detail-experience__scroller">
          {images.map((image, index) => {
            const number = `${String(index + 1).padStart(2, "0")} / ${String(images.length).padStart(2, "0")}`;
            const slideIndex = index;

            return (
              <figure
                key={image.id}
                className="project-detail-experience__frame project-detail-experience__image-frame"
                data-project-slide=""
                data-project-frame=""
                data-project-image=""
                data-slide-index={slideIndex}
                data-asset-id={image.id}
                aria-current={activeSlideIndex === slideIndex ? "true" : undefined}
              >
                <ResponsivePhoto
                  asset={image}
                  alt={image.alt}
                  variants={["rail", "hero"]}
                  sizes="(min-width: 1024px) calc(100vw - 18rem), 100vw"
                  eager={index === 0}
                  fetchPriority={index === 0 ? "high" : "auto"}
                  pictureClassName="project-detail-experience__picture"
                  imgClassName="project-detail-experience__image"
                  imgProps={{
                    "data-orientation": image.orientation,
                    "data-asset-id": image.id,
                    style: { objectFit: "contain" },
                  }}
                />
                <figcaption
                  className="project-detail-experience__mobile-caption"
                  data-mobile-caption=""
                >
                  <p className="project-detail-experience__mobile-caption-number">{number}</p>
                  <p
                    className="project-detail-experience__mobile-caption-title"
                    data-image-title=""
                  >
                    {image.title}
                  </p>
                  <p
                    className="project-detail-experience__mobile-caption-prose"
                    data-image-prose=""
                  >
                    {image.prose}
                  </p>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
      <nav className="project-detail-experience__mobile-navigation" aria-label="Gallery controls">
        <Link href="/">Collections</Link>
        <button type="button" onClick={() => scrollToSlide(activeSlideIndex - 1)} disabled={activeSlideIndex === 0}>Previous</button>
        <button type="button" onClick={() => scrollToSlide(activeSlideIndex + 1)} disabled={activeSlideIndex === images.length - 1}>Next</button>
      </nav>
    </main>
  );
}
