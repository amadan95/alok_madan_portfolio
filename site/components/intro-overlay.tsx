"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import type { IntroSlide, SiteMeta } from "@/lib/types";
import { useReducedMotion } from "@/lib/client-hooks";
import { useUIStore } from "@/lib/ui-store";
import { sitePrimaryNavLinks } from "@/components/site-header-chrome";

const slideDurationMs = 165;
const INTRO_PLACEHOLDER =
  "data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=";

function preloadVariant(webp: string, jpeg: string) {
  return new Promise<void>((resolve) => {
    const image = new window.Image();

    image.onload = () => resolve();
    image.onerror = () => {
      if (image.src !== jpeg) {
        image.src = jpeg;
        return;
      }

      resolve();
    };
    image.src = webp || jpeg;
  });
}

export function IntroOverlay({
  slides,
  siteMeta,
  visible,
  activeProjectSlug,
}: {
  slides: IntroSlide[];
  siteMeta: SiteMeta;
  visible: boolean;
  activeProjectSlug: string | null;
}) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const hasDismissed = useRef(false);
  const reducedMotion = useReducedMotion();
  const [sequenceSlides, setSequenceSlides] = useState<IntroSlide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sequenceComplete, setSequenceComplete] = useState(false);
  const [sequenceReady, setSequenceReady] = useState(false);
  const setHideIntro = useUIStore((state) => state.setHideIntro);
  const setMoveNavToTop = useUIStore((state) => state.setMoveNavToTop);
  const setNumber = useUIStore((state) => state.setNumber);
  const activeSlide = useMemo(
    () => sequenceSlides[Math.min(currentIndex, Math.max(sequenceSlides.length - 1, 0))] ?? null,
    [currentIndex, sequenceSlides],
  );

  const dismiss = useCallback((mode: "fade" | "scroll" = "fade") => {
    if (!visible || hasDismissed.current) {
      return;
    }

    hasDismissed.current = true;
    setNumber(1);

    if (reducedMotion) {
      document.body.style.overflow = "";
      setMoveNavToTop(true);
      setHideIntro(true);
      return;
    }

    const stage = document.querySelector<HTMLElement>("[data-route-stage]");
    const timeline = gsap.timeline({
      onStart: () => {
        setMoveNavToTop(true);
      },
      onComplete: () => {
        document.body.style.overflow = "";
        setHideIntro(true);
      },
    });

    if (mode === "scroll" && stage) {
      timeline.set(stage, { y: 72, autoAlpha: 0.82 });
      timeline.to(
        overlayRef.current,
        {
          yPercent: -100,
          duration: 0.82,
          ease: "expo.inOut",
        },
        0,
      );
      timeline.to(
        stage,
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.82,
          ease: "expo.out",
          clearProps: "transform,opacity,visibility",
        },
        0.06,
      );
      return;
    }

    timeline.to(overlayRef.current, {
      autoAlpha: 0,
      duration: 0.42,
      ease: "expo.out",
    });
  }, [reducedMotion, setHideIntro, setMoveNavToTop, setNumber, visible]);

  useEffect(() => {
    if (!visible || activeProjectSlug || slides.length === 0) {
      return;
    }

    let cancelled = false;
    const selectedSlides = [...slides];
    const initialIndex = reducedMotion ? selectedSlides.length - 1 : 0;

    setSequenceReady(false);
    setSequenceSlides(selectedSlides);
    setCurrentIndex(initialIndex);
    setSequenceComplete(reducedMotion || selectedSlides.length <= 1);

    Promise.all(
      selectedSlides.map((slide, index) => {
        const variant =
          reducedMotion || index === selectedSlides.length - 1 ? slide.hold : slide.flash;
        return preloadVariant(variant.webp, variant.jpeg);
      }),
    ).then(() => {
      if (cancelled) {
        return;
      }

      setSequenceReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [activeProjectSlug, reducedMotion, slides, visible]);

  useEffect(() => {
    if (!visible || activeProjectSlug || sequenceSlides.length === 0 || !sequenceReady) {
      return;
    }

    hasDismissed.current = false;
    setCurrentIndex(reducedMotion ? sequenceSlides.length - 1 : 0);
    setSequenceComplete(reducedMotion || sequenceSlides.length <= 1);
    setMoveNavToTop(false);
    document.body.style.overflow = "hidden";

    if (reducedMotion || sequenceSlides.length <= 1) {
      return () => {
        document.body.style.overflow = "";
      };
    }

    const interval = window.setInterval(() => {
      setCurrentIndex((value) => {
        if (value >= sequenceSlides.length - 1) {
          return value;
        }
        return value + 1;
      });
    }, slideDurationMs);

    const completeTimeout = window.setTimeout(() => {
      window.clearInterval(interval);
      setCurrentIndex(sequenceSlides.length - 1);
      setSequenceComplete(true);
    }, Math.max(0, sequenceSlides.length - 1) * slideDurationMs);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(completeTimeout);
      document.body.style.overflow = "";
    };
  }, [activeProjectSlug, reducedMotion, sequenceReady, sequenceSlides, setMoveNavToTop, visible]);

  useEffect(() => {
    if (visible) {
      setNumber(currentIndex + 1);
    }
  }, [currentIndex, setNumber, visible]);

  useEffect(() => {
    if (!visible || sequenceSlides.length === 0) {
      return;
    }

    setSequenceComplete(currentIndex >= sequenceSlides.length - 1);
  }, [currentIndex, sequenceSlides.length, visible]);

  useEffect(() => {
    if (!visible || !sequenceComplete) {
      return;
    }

    const onWheel = (event: WheelEvent) => {
      if (event.deltaY <= 0) {
        return;
      }

      event.preventDefault();
      dismiss("scroll");
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [dismiss, sequenceComplete, visible]);

  if (!visible || activeProjectSlug || sequenceSlides.length === 0 || !activeSlide) {
    return null;
  }

  return (
    <div
      ref={overlayRef}
      className="intro-overlay"
      data-complete={String(sequenceComplete)}
      data-reduced-motion={String(reducedMotion)}
      role="region"
      aria-label="Portfolio introduction"
    >
      <div className="intro-overlay__media">
        {sequenceSlides.map((slide, index) => {
          const isActive = index === currentIndex;
          const variant =
            reducedMotion || index === sequenceSlides.length - 1 ? slide.hold : slide.flash;
          return (
            <picture
              key={slide.id}
              className="intro-overlay__image"
              data-active={String(isActive)}
              style={{ backgroundColor: slide.averageColor }}
            >
              <source type="image/webp" srcSet={`${variant.webp} ${variant.width}w`} sizes="100vw" />
              <source type="image/jpeg" srcSet={`${variant.jpeg} ${variant.width}w`} sizes="100vw" />
              <img
                src={(sequenceReady && variant.jpeg) || INTRO_PLACEHOLDER}
                alt={isActive ? slide.alt : ""}
                width={variant.width}
                height={variant.height}
                fetchPriority={index <= 1 ? "high" : "auto"}
                decoding="sync"
              />
            </picture>
          );
        })}
      </div>
      <div className="intro-overlay__copy">
        <p className="intro-overlay__desktop">{siteMeta.introDesktop}</p>
        <p className="intro-overlay__mobile">{siteMeta.introMobile}</p>
      </div>

      <aside className="intro-overlay__name-rail" aria-label="Photographer">
        <span className="intro-overlay__name">{siteMeta.photographer}</span>
      </aside>

      <nav
        className="intro-overlay__final-nav"
        aria-label="Portfolio intro navigation"
        aria-hidden={!sequenceComplete}
      >
        {sitePrimaryNavLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="intro-overlay__final-link"
            tabIndex={sequenceComplete ? undefined : -1}
            onClick={(event) => {
              if (link.href === "/") {
                event.preventDefault();
                dismiss();
              }
            }}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
