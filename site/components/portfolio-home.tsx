"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { PhotoAsset, Series, SiteMeta } from "@/lib/types";
import { useReducedMotion } from "@/lib/client-hooks";
import { useUIStore } from "@/lib/ui-store";
import { formatSeriesIndex } from "@/lib/utils";
import { PortfolioModeBar } from "@/components/portfolio-mode-bar";

gsap.registerPlugin(ScrollTrigger);

type HomeEntry = {
  series: Series;
  previews: PhotoAsset[];
};

export function PortfolioHome({
  items,
  siteMeta,
}: {
  items: HomeEntry[];
  siteMeta: SiteMeta;
}) {
  const firstSeries = items[0]?.series;
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeProjectSlug = useUIStore((state) => state.activeProjectSlug);
  const mobileTitle = useUIStore((state) => state.mobileTitle);
  const scrollPosition = useUIStore((state) => state.scrollPosition);
  const zoomLevel = useUIStore((state) => state.zoomLevel);
  const setActiveProjectSlug = useUIStore((state) => state.setActiveProjectSlug);
  const setMobileTitle = useUIStore((state) => state.setMobileTitle);
  const setNumber = useUIStore((state) => state.setNumber);
  const setTitle = useUIStore((state) => state.setTitle);
  const setZoomLevel = useUIStore((state) => state.setZoomLevel);

  useEffect(() => {
    setTitle(siteMeta.photographer);
    if (!activeProjectSlug && scrollPosition <= 0 && firstSeries) {
      setMobileTitle(firstSeries.title);
      setNumber(firstSeries.portfolioIndex);
    }

    const sections = Array.from(
      containerRef.current?.querySelectorAll<HTMLElement>("[data-home-series]") ?? [],
    );
    const triggers = sections.map((section) =>
      ScrollTrigger.create({
        trigger: section,
        start: "top center",
        end: "bottom center",
        onEnter: () => {
          setMobileTitle(section.dataset.seriesTitle ?? "");
          setNumber(Number(section.dataset.seriesIndex ?? 1));
        },
        onEnterBack: () => {
          setMobileTitle(section.dataset.seriesTitle ?? "");
          setNumber(Number(section.dataset.seriesIndex ?? 1));
        },
      }),
    );

    if (activeProjectSlug) {
      const target = containerRef.current?.querySelector<HTMLElement>(`#${CSS.escape(activeProjectSlug)}`);
      if (target) {
        target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
        if (scrollPosition > 0) {
          window.scrollTo({ top: Math.max(0, target.offsetTop - window.innerHeight * 0.18), behavior: reducedMotion ? "auto" : "smooth" });
        }
      }
      window.setTimeout(() => {
        setActiveProjectSlug(null);
      }, reducedMotion ? 40 : 320);
    }

    return () => {
      triggers.forEach((trigger) => trigger.kill());
    };
  }, [
    activeProjectSlug,
    firstSeries,
    reducedMotion,
    scrollPosition,
    setActiveProjectSlug,
    setMobileTitle,
    setNumber,
    setTitle,
    siteMeta.photographer,
  ]);

  const previewCount = zoomLevel === 0 ? 1 : zoomLevel === 1 ? 3 : 5;

  return (
    <main className="portfolio-home" ref={containerRef}>
      <div className="portfolio-home__top-gradient" />
      <PortfolioModeBar
        mode="grid"
        zoomLevel={zoomLevel}
        onZoomIn={() => setZoomLevel(Math.max(0, zoomLevel - 1))}
        onZoomOut={() => setZoomLevel(Math.min(2, zoomLevel + 1))}
      />
      <div className="portfolio-home__mobile-title" data-mobile-project-title="">
        <p>{mobileTitle || siteMeta.photographer}</p>
      </div>

      <aside className="portfolio-home__name-rail" aria-label="Photographer">
        <Link href="/" className="portfolio-home__name">
          {siteMeta.photographer}
        </Link>
      </aside>

      <div className="portfolio-home__content">
        {items.map(({ series, previews }) => (
          <section
            key={series.slug}
            id={series.slug}
            className="portfolio-home__section"
            data-home-series=""
            data-series-title={series.title}
            data-series-index={series.portfolioIndex}
            data-project={series.slug}
          >
            <Link href={`/portfolio/${series.slug}`} className="portfolio-home__rail" aria-label={`Open ${series.title}`}>
              {previews.slice(0, previewCount).map((asset) => (
                <figure
                  key={asset.id}
                  className="portfolio-home__frame"
                  style={{ flex: `${Math.max(0.7, Math.min(asset.aspectRatio, 1.85))} 1 0%` }}
                >
                  <img src={asset.displayPath} alt={series.title} width={asset.width} height={asset.height} />
                </figure>
              ))}
            </Link>

            <div className="portfolio-home__meta">
              <div className="portfolio-home__meta-top">
                <span className="portfolio-home__index">{formatSeriesIndex(series.portfolioIndex)}</span>
                <div className="portfolio-home__title-block">
                  <Link href={`/portfolio/${series.slug}`} className="portfolio-home__title" data-project-title="">
                    {series.title}
                  </Link>
                  <p className="portfolio-home__subtitle">{series.subtitle}</p>
                  <p className="portfolio-home__synopsis">{series.synopsis}</p>
                </div>
              </div>
              <div className="portfolio-home__meta-foot">
                <span>{series.photoIds.length} photographs</span>
                {series.tags.slice(0, 3).map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
