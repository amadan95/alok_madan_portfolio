"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { PortfolioPageEntry, SiteMeta } from "@/lib/types";
import { useReducedMotion } from "@/lib/client-hooks";
import { useUIStore } from "@/lib/ui-store";
import { formatSeriesIndex } from "@/lib/utils";
import { PortfolioModeBar } from "@/components/portfolio-mode-bar";
import { CollectionImageRail } from "@/components/collection-image-rail";

gsap.registerPlugin(ScrollTrigger);

export function PortfolioHome({
  items,
  siteMeta,
}: {
  items: PortfolioPageEntry[];
  siteMeta: SiteMeta;
}) {
  const firstCollection = items[0]?.collection;
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeProjectSlug = useUIStore((state) => state.activeProjectSlug);
  const mobileTitle = useUIStore((state) => state.mobileTitle);
  const scrollPosition = useUIStore((state) => state.scrollPosition);
  const setActiveProjectSlug = useUIStore((state) => state.setActiveProjectSlug);
  const setMobileTitle = useUIStore((state) => state.setMobileTitle);
  const setNumber = useUIStore((state) => state.setNumber);
  const setTitle = useUIStore((state) => state.setTitle);

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
    const bodies = Array.from(containerRef.current?.querySelectorAll<HTMLElement>("[data-project-body]") ?? []);
    if (reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = gsap.context(() => {
      bodies.forEach((body) => {
        // Create the reveal before hiding content; failed initialization stays readable.
        const animation = gsap.to(body, {
          opacity: 1, y: 0, duration: 0.35, ease: "power3.out", paused: true,
          onComplete: () => { gsap.set(body, { clearProps: "opacity,transform" }); },
        });
        const trigger = ScrollTrigger.create({
          trigger: body, start: "top 85%", once: true,
          onEnter: () => { animation.play(); },
        });
        if (body.getBoundingClientRect().top <= window.innerHeight * 0.85) {
          animation.play();
        } else {
          gsap.set(body, { opacity: 0, y: 8 });
        }
        return trigger;
      });
    }, containerRef);
    return () => context.revert();
  }, [items, reducedMotion]);

  return (
    <main className="portfolio-home" ref={containerRef}>
      <div className="portfolio-home__top-gradient" />
      <PortfolioModeBar mode="grid" />
      <div className="portfolio-home__mobile-title" data-mobile-project-title="">
        <p>{mobileTitle || siteMeta.photographer}</p>
      </div>

      <aside className="portfolio-home__name-rail" aria-label="Photographer">
        <Link href="/" className="portfolio-home__name">
          {siteMeta.photographer}
        </Link>
      </aside>

      <div className="portfolio-home__content">
        {items.map(({ collection, images }, index) => {
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
              <CollectionImageRail slug={collection.slug} title={collection.title} images={images} priority={index === 0} />

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
