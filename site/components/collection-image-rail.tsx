"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { CSSProperties } from "react";
import gsap from "gsap";
import { useReducedMotion } from "@/lib/client-hooks";
import type { CuratedDisplayImage } from "@/lib/types";
import { nextRailOffset } from "@/lib/rail-navigation.mjs";
import { ResponsivePhoto } from "@/components/responsive-photo";

export function CollectionImageRail({ slug, title, images, priority = false }: {
  slug: string;
  title: string;
  images: CuratedDisplayImage[];
  priority?: boolean;
}) {
  const aspectSum = images.slice(0, 3).reduce((sum, image) => sum + image.aspectRatio, 0) || 1;
  const railRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<gsap.core.Tween | null>(null);
  const destinationRef = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();
  const [loaded, setLoaded] = useState<Set<number>>(() => new Set(priority ? [0] : []));
  const [edges, setEdges] = useState({ start: true, end: images.length <= 1 });
  const [position, setPosition] = useState(1);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const frames = Array.from(rail.querySelectorAll<HTMLElement>("[data-rail-image]"));
    let nearby = false;
    const prepareImages = () => {
      if (!nearby) return;
      const bounds = rail.getBoundingClientRect();
      const visible = frames.flatMap((frame, index) => {
        const rect = frame.getBoundingClientRect();
        return rect.right > bounds.left + 1 && rect.left < bounds.right - 1 ? [index] : [];
      });
      const next = [...visible];
      if (visible.length) {
        if (visible[0] > 0) next.push(visible[0] - 1);
        if (visible[visible.length - 1] < frames.length - 1) next.push(visible[visible.length - 1] + 1);
      }
      setLoaded((previous) => {
        if (next.every((index) => previous.has(index))) return previous;
        return new Set([...previous, ...next]);
      });
    };
    const update = () => {
      const max = Math.max(0, rail.scrollWidth - rail.clientWidth);
      setEdges({ start: rail.scrollLeft <= 2, end: rail.scrollLeft >= max - 2 });
      const first = frames.findIndex((frame) => frame.offsetLeft >= rail.scrollLeft - 2);
      setPosition(first < 0 ? frames.length : first + 1);
      prepareImages();
    };
    const stop = () => {
      animationRef.current?.kill();
      animationRef.current = null;
      destinationRef.current = null;
      rail.style.scrollSnapType = "";
    };
    const observer = new IntersectionObserver(([entry]) => {
      nearby = entry.isIntersecting;
      if (nearby) update();
    }, { rootMargin: "300px 0px" });
    observer.observe(rail);
    const resize = new ResizeObserver(() => { stop(); update(); });
    resize.observe(rail);
    rail.addEventListener("scroll", update, { passive: true });
    rail.addEventListener("wheel", stop, { passive: true });
    rail.addEventListener("pointerdown", stop, { passive: true });
    update();
    return () => {
      observer.disconnect();
      resize.disconnect();
      rail.removeEventListener("scroll", update);
      rail.removeEventListener("wheel", stop);
      rail.removeEventListener("pointerdown", stop);
      stop();
    };
  }, [images]);

  useEffect(() => {
    if (reducedMotion) {
      animationRef.current?.kill();
      destinationRef.current = null;
      if (railRef.current) railRef.current.style.scrollSnapType = "";
    }
  }, [reducedMotion]);

  const move = (direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;
    const offsets = Array.from(rail.querySelectorAll<HTMLElement>("[data-rail-image]"), (frame) => frame.offsetLeft);
    const target = nextRailOffset(offsets, Math.max(0, rail.scrollWidth - rail.clientWidth), destinationRef.current ?? rail.scrollLeft, direction);
    animationRef.current?.kill();
    destinationRef.current = target;
    rail.style.scrollSnapType = "none";
    const complete = () => {
      destinationRef.current = null;
      rail.style.scrollSnapType = "";
      animationRef.current = null;
    };
    if (reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      rail.scrollLeft = target;
      complete();
    } else {
      animationRef.current = gsap.to(rail, { scrollLeft: target, duration: 0.32, ease: "power2.out", onComplete: complete });
    }
  };

  return (
    <div className="collection-image-rail" role="region" aria-label={`${title} photographs`}>
      <div
        ref={railRef}
        id={`rail-${slug}`}
        className="portfolio-home__rail"
        style={{ "--rail-aspect-sum": aspectSum } as CSSProperties}
        tabIndex={0}
        aria-label={`${title}: use left and right arrows to browse`}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          move(event.key === "ArrowRight" ? 1 : -1);
        }}
      >
        {images.map((asset, index) => (
          <Link
            key={asset.id}
            href={`/portfolio/${slug}`}
            className="portfolio-home__frame"
            data-rail-image=""
            data-asset-id={asset.id}
            aria-label={`Open ${title}: ${asset.title}`}
            style={{ "--placeholder-color": asset.averageColor, "--image-aspect": asset.aspectRatio } as CSSProperties}
          >
            {loaded.has(index) ? (
              <ResponsivePhoto
                asset={asset}
                alt={asset.alt}
                variants={["raw", "thumb", "rail"]}
                sizes={`(min-width: 1531px) calc((100vw - 22rem - 3.6rem - 1rem) * ${asset.aspectRatio / aspectSum}), (min-width: 1024px) calc((77vw - 3.6rem - 1rem) * ${asset.aspectRatio / aspectSum}), (min-width: 768px) calc((100vw - 2.8rem) * 0.92), calc((100vw - 2rem) * 0.92)`}
                eager={priority && index === 0}
                fetchPriority={priority && index === 0 ? "high" : "auto"}
              />
            ) : (
              <>
                <span className="collection-image-rail__placeholder" aria-hidden="true" />
                {index === 0 ? <noscript>
                  <style>{".collection-image-rail__placeholder,.collection-image-rail__arrow{display:none}"}</style>
                  <ResponsivePhoto asset={asset} alt={asset.alt} variants={["thumb", "rail"]} sizes="(min-width: 1024px) 40vw, 92vw" />
                </noscript> : null}
              </>
            )}
          </Link>
        ))}
      </div>
      <button type="button" className="collection-image-rail__arrow collection-image-rail__arrow--previous" disabled={edges.start} aria-label={`Previous photograph in ${title}`} aria-controls={`rail-${slug}`} onClick={() => move(-1)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6M8 12h12" /></svg>
      </button>
      <button type="button" className="collection-image-rail__arrow collection-image-rail__arrow--next" disabled={edges.end} aria-label={`Next photograph in ${title}`} aria-controls={`rail-${slug}`} onClick={() => move(1)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6M4 12h12" /></svg>
      </button>
      <span className="sr-only" aria-live="polite" aria-atomic="true">{title}, photograph {position} of {images.length}</span>
    </div>
  );
}
