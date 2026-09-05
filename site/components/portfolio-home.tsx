"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { CuratedDisplayImage, SiteMeta } from "@/lib/types";
import { useReducedMotion } from "@/lib/client-hooks";
import { useUIStore } from "@/lib/ui-store";
import { formatSeriesIndex } from "@/lib/utils";
import { PortfolioModeBar } from "@/components/portfolio-mode-bar";
import { ResponsivePhoto } from "@/components/responsive-photo";

gsap.registerPlugin(ScrollTrigger);

type HomeEntry = {
  collection: {
    slug: string;
    title: string;
    synopsis: string;
    tags: string[];
    portfolioIndex: number;
    photoCount: number;
  };
  cover: CuratedDisplayImage;
  previews: CuratedDisplayImage[];
};

export function PortfolioHome({
  items,
  siteMeta,
}: {
  items: HomeEntry[];
  siteMeta: SiteMeta;
}) {
  const firstCollection = items[0]?.collection;
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
    if (!activeProjectSlug && scrollPosition <= 0 && firstCollection) {
      setMobileTitle(firstCollection.title);
      setNumber(firstCollection.portfolioIndex);
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
    firstCollection,
    reducedMotion,
    scrollPosition,
    setActiveProjectSlug,
    setMobileTitle,
    setNumber,
    setTitle,
    siteMeta.photographer,
  ]);

  useEffect(() => {
    const sections = Array.from(
      containerRef.current?.querySelectorAll<HTMLElement>("[data-home-series]") ?? [],
    );
    if (reducedMotion) {
      sections.forEach((section) => {
        const title = section.querySelector<HTMLElement>("[data-project-title]");
        const bodyNodes = Array.from(section.querySelectorAll<HTMLElement>("[data-project-body]"));
        if (title) {
          gsap.set(title, { clearProps: "all" });
        }
        bodyNodes.forEach((node) => {
          gsap.set(node, { clearProps: "all" });
        });
      });
      return;
    }

    const context = gsap.context(() => {
      sections.forEach((section) => {
        const title = section.querySelector<HTMLElement>("[data-project-title]");
        const bodyNodes = Array.from(section.querySelectorAll<HTMLElement>("[data-project-body]"));
        const copy = [title, ...bodyNodes].filter((node): node is HTMLElement => Boolean(node));
        gsap.set(copy, { autoAlpha: 0, y: 14 });

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: "top 72%",
            once: true,
          },
        });

        if (copy.length > 0) {
          timeline.to(copy, {
            autoAlpha: 1,
            y: 0,
            duration: 0.28,
            stagger: 0.04,
            ease: "power3.out",
          });
        }
      });
    }, containerRef);

    return () => {
      context.revert();
    };
  }, [items, reducedMotion]);

  const previewCount = zoomLevel === 1 ? 3 : 5;

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
        {items.map(({ collection, cover, previews }) => {
          const displayedPreviews = zoomLevel === 0 ? [cover] : previews.slice(0, previewCount);

          return (
            <section
              key={collection.slug}
              id={collection.slug}
              className="portfolio-home__section"
              data-home-series=""
              data-series-title={collection.title}
              data-series-index={collection.portfolioIndex}
              data-project={collection.slug}
            >
              <Link
                href={`/portfolio/${collection.slug}`}
                className="portfolio-home__rail"
                aria-label={`Open ${collection.title}`}
              >
                {displayedPreviews.map((asset) => (
                  <figure
                    key={asset.id}
                    className="portfolio-home__frame"
                    style={{
                      flex: `${Math.max(0.7, Math.min(asset.aspectRatio, 1.85))} 1 0%`,
                      aspectRatio: asset.aspectRatio,
                    }}
                  >
                    <ResponsivePhoto
                      asset={asset}
                      alt={asset.alt}
                      variants={["thumb", "rail"]}
                      sizes={zoomLevel === 0 ? "(min-width: 1024px) 72vw, 100vw" : "(min-width: 1024px) 24vw, 92vw"}
                    />
                  </figure>
                ))}
              </Link>

              <div className="portfolio-home__meta">
                <div className="portfolio-home__meta-top">
                  <span className="portfolio-home__index">
                    {formatSeriesIndex(collection.portfolioIndex)}
                  </span>
                  <div className="portfolio-home__title-block">
                    <Link
                      href={`/portfolio/${collection.slug}`}
                      className="portfolio-home__title"
                      data-project-title=""
                    >
                      {collection.title}
                    </Link>
                    <p className="portfolio-home__synopsis" data-project-body="">
                      {collection.synopsis}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
