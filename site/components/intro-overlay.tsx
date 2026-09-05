"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import type { IntroSlide, SiteMeta } from "@/lib/types";
import { useReducedMotion } from "@/lib/client-hooks";
import { useUIStore } from "@/lib/ui-store";
import { sitePrimaryNavLinks } from "@/components/site-header-chrome";

const slideDurationMs = 280;
const INTRO_SESSION_KEY = "portfolio-intro-seen";

function rememberIntro() {
  try {
    window.sessionStorage?.setItem(INTRO_SESSION_KEY, "true");
  } catch {
    // The intro remains dismissible when storage is blocked.
  }
}

export function IntroOverlay({ slides, siteMeta, visible, activeProjectSlug }: {
  slides: IntroSlide[];
  siteMeta: SiteMeta;
  visible: boolean;
  activeProjectSlug: string | null;
}) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const introNavRef = useRef<HTMLAnchorElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const hasDismissed = useRef(false);
  const reducedMotion = useReducedMotion();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const [nextReady, setNextReady] = useState(false);
  const [sequenceComplete, setSequenceComplete] = useState(slides.length <= 1);
  const setHideIntro = useUIStore((state) => state.setHideIntro);
  const setMoveNavToTop = useUIStore((state) => state.setMoveNavToTop);
  const setNumber = useUIStore((state) => state.setNumber);
  const activeSlide = slides[currentIndex] ?? slides[0] ?? null;
  const visibleSlides = useMemo(
    () => [previousIndex, currentIndex].filter((index, position, values): index is number => index !== null && values.indexOf(index) === position),
    [currentIndex, previousIndex],
  );

  const dismiss = useCallback((mode: "fade" | "scroll" = "fade") => {
    if (!visible || hasDismissed.current) return;
    hasDismissed.current = true;
    rememberIntro();
    setNumber(1);
    if (reducedMotion) {
      setMoveNavToTop(true);
      setHideIntro(true);
      return;
    }

    const stage = document.querySelector<HTMLElement>("[data-route-stage]");
    const timeline = gsap.timeline({
      onStart: () => setMoveNavToTop(true),
      onComplete: () => setHideIntro(true),
    });
    if (mode === "scroll" && stage) {
      timeline.to(overlayRef.current, { yPercent: -100, duration: 0.62, ease: "expo.inOut" }, 0);
      timeline.fromTo(stage, { y: 48, autoAlpha: 0.86 }, { y: 0, autoAlpha: 1, duration: 0.56, ease: "expo.out", clearProps: "transform,opacity,visibility" }, 0.05);
    } else {
      timeline.to(overlayRef.current, { autoAlpha: 0, duration: 0.24, ease: "power3.out" });
    }
  }, [reducedMotion, setHideIntro, setMoveNavToTop, setNumber, visible]);

  useEffect(() => {
    if (!visible || activeProjectSlug || slides.length === 0) return;
    hasDismissed.current = false;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    rememberIntro();
    const stage = document.querySelector<HTMLElement>("[data-route-stage]");
    if (stage) {
      stage.inert = true;
      stage.setAttribute("aria-hidden", "true");
    }
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => introNavRef.current?.focus({ preventScroll: true }));
    return () => {
      document.body.style.overflow = "";
      if (stage) {
        stage.inert = false;
        stage.removeAttribute("aria-hidden");
      }
      previousFocusRef.current?.focus({ preventScroll: true });
    };
  }, [activeProjectSlug, slides.length, visible]);

  useEffect(() => {
    if (!visible || !reducedMotion || slides.length === 0) return;
    setPreviousIndex(null);
    setCurrentIndex(slides.length - 1);
    setSequenceComplete(true);
  }, [reducedMotion, slides.length, visible]);

  useEffect(() => {
    if (!visible || reducedMotion || currentIndex >= slides.length - 1) {
      if (currentIndex >= slides.length - 1) setSequenceComplete(true);
      return;
    }
    let cancelled = false;
    const nextIndex = currentIndex + 1;
    const nextSlide = slides[nextIndex];
    const nextVariant = nextIndex === slides.length - 1 ? nextSlide.hold : nextSlide.flash;
    const image = new window.Image();
    let triedFallback = false;
    setNextReady(false);
    image.onload = () => { if (!cancelled) setNextReady(true); };
    image.onerror = () => {
      if (!triedFallback) {
        triedFallback = true;
        image.src = nextVariant.jpeg;
      }
    };
    image.src = nextVariant.webp || nextVariant.jpeg;
    return () => { cancelled = true; };
  }, [currentIndex, reducedMotion, slides, visible]);

  useEffect(() => {
    if (!visible || reducedMotion || !nextReady || sequenceComplete) return;
    const timeout = window.setTimeout(() => {
      setPreviousIndex(currentIndex);
      setCurrentIndex((index) => Math.min(index + 1, slides.length - 1));
    }, slideDurationMs);
    return () => window.clearTimeout(timeout);
  }, [currentIndex, nextReady, reducedMotion, sequenceComplete, slides.length, visible]);

  useEffect(() => {
    if (visible) setNumber(currentIndex + 1);
  }, [currentIndex, setNumber, visible]);

  useEffect(() => {
    if (!visible || !sequenceComplete) return;
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY > 0) {
        event.preventDefault();
        dismiss("scroll");
      }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [dismiss, sequenceComplete, visible]);

  if (!visible || activeProjectSlug || !activeSlide) return null;

  return (
    <div ref={overlayRef} className="intro-overlay" data-complete={String(sequenceComplete)} data-reduced-motion={String(reducedMotion)} role="dialog" aria-modal="true" aria-label="Portfolio introduction">
      <div className="intro-overlay__media" aria-hidden="true">
        {visibleSlides.map((index) => {
          const slide = slides[index];
          const variant = index === slides.length - 1 ? slide.hold : slide.flash;
          return (
            <picture key={slide.id} className="intro-overlay__image" data-active={String(index === currentIndex)} style={{ backgroundColor: slide.averageColor }}>
              <source type="image/webp" srcSet={`${variant.webp} ${variant.width}w`} sizes="100vw" />
              <source type="image/jpeg" srcSet={`${variant.jpeg} ${variant.width}w`} sizes="100vw" />
              <img src={variant.jpeg} alt="" width={variant.width} height={variant.height} fetchPriority={index === 0 ? "high" : "auto"} loading={index === 0 ? "eager" : "lazy"} decoding="async" />
            </picture>
          );
        })}
      </div>
      <div className="intro-overlay__copy">
        <p className="intro-overlay__desktop">{siteMeta.introDesktop}</p>
        <p className="intro-overlay__mobile">{siteMeta.introMobile}</p>
      </div>
      <aside className="intro-overlay__name-rail" aria-label="Photographer"><span className="intro-overlay__name">{siteMeta.photographer}</span></aside>
      <nav className="intro-overlay__final-nav" aria-label="Portfolio intro navigation">
        {sitePrimaryNavLinks.map((link, index) => (
          <Link ref={index === 0 ? introNavRef : undefined} key={link.href} href={link.href} className="intro-overlay__final-link" onClick={(event) => {
            if (link.href === "/") { event.preventDefault(); dismiss(); }
          }}>{link.label}</Link>
        ))}
      </nav>
    </div>
  );
}
