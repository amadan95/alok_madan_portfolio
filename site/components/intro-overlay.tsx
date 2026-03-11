"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import type { IntroSlide, SiteMeta } from "@/lib/types";
import { useUIStore } from "@/lib/ui-store";
import { sitePrimaryNavLinks } from "@/components/site-header-chrome";

const slideDurationMs = 165;
const flashSlideCount = 9;
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

function buildRandomIntroSequence(pool: IntroSlide[]) {
  if (pool.length <= 1) {
    return pool;
  }

  const shuffled = [...pool];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  const temporarySlide = shuffled[0];
  const flashSlides = shuffled.slice(1, Math.min(shuffled.length, flashSlideCount + 1));

  return [...flashSlides, temporarySlide];
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

  useEffect(() => {
    if (!visible || activeProjectSlug || slides.length === 0) {
      return;
    }

    let cancelled = false;
    const selectedSlides = buildRandomIntroSequence(slides);

    setSequenceReady(false);
    setSequenceSlides(selectedSlides);
    setCurrentIndex(0);
    setSequenceComplete(false);

    Promise.all(
      selectedSlides.map((slide, index) => {
        const variant = index === selectedSlides.length - 1 ? slide.hold : slide.flash;
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
  }, [activeProjectSlug, slides, visible]);

  useEffect(() => {
    if (!visible || activeProjectSlug || sequenceSlides.length === 0 || !sequenceReady) {
      return;
    }

    hasDismissed.current = false;
    setCurrentIndex(0);
    setSequenceComplete(false);
    setMoveNavToTop(false);
    document.body.style.overflow = "hidden";

    if (sequenceSlides.length <= 1) {
      setSequenceComplete(true);
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
  }, [activeProjectSlug, sequenceReady, sequenceSlides, setMoveNavToTop, visible]);

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
  }, [sequenceComplete, visible]);

  const dismiss = (mode: "fade" | "scroll" = "fade") => {
    if (!visible || hasDismissed.current) {
      return;
    }

    hasDismissed.current = true;
    setNumber(1);

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
  };

  if (!visible || activeProjectSlug || sequenceSlides.length === 0 || !activeSlide) {
    return null;
  }

  return (
    <div ref={overlayRef} className="intro-overlay" data-complete={String(sequenceComplete)} role="presentation">
      <div className="intro-overlay__media">
        {sequenceSlides.map((slide, index) => {
          const variant = index === sequenceSlides.length - 1 ? slide.hold : slide.flash;
          return (
            <picture
              key={slide.id}
              className="intro-overlay__image"
              data-active={String(index === currentIndex)}
              style={{ backgroundColor: slide.averageColor }}
            >
              <source type="image/webp" srcSet={`${variant.webp} ${variant.width}w`} sizes="100vw" />
              <source type="image/jpeg" srcSet={`${variant.jpeg} ${variant.width}w`} sizes="100vw" />
              <img
                src={(sequenceReady && variant.jpeg) || INTRO_PLACEHOLDER}
                alt=""
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

      <nav className="intro-overlay__final-nav" aria-label="Portfolio intro navigation">
        {sitePrimaryNavLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="intro-overlay__final-link"
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
