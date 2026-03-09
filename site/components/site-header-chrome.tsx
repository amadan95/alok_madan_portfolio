"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import type { SiteMeta } from "@/lib/types";
import type { RouteKind } from "@/lib/route-kind";
import { useUIStore } from "@/lib/ui-store";
import { formatArchiveIndex, formatSeriesIndex } from "@/lib/utils";

export const sitePrimaryNavLinks = [
  { href: "/contact", label: "Contact," },
  { href: "/", label: "Portfolio," },
  { href: "/archive", label: "Archive," },
  { href: "/raw", label: "Raw" },
] as const;

export function SiteHeaderChrome({
  routeKind,
  siteMeta,
}: {
  routeKind: RouteKind;
  siteMeta: SiteMeta;
}) {
  const navRef = useRef<HTMLElement | null>(null);
  const numberRef = useRef<HTMLParagraphElement | null>(null);
  const title = useUIStore((state) => state.title);
  const moveNavToTop = useUIStore((state) => state.moveNavToTop);
  const number = useUIStore((state) => state.number);

  useEffect(() => {
    const y = routeKind === "home" && !moveNavToTop ? window.innerHeight * 0.34 : 0;
    const duration = routeKind === "home" ? 1 : 0.35;

    const context = gsap.context(() => {
      gsap.to([navRef.current, numberRef.current], {
        y,
        duration,
        ease: "expo.inOut",
      });
    });

    return () => context.revert();
  }, [moveNavToTop, routeKind]);

  const headerTitle = routeKind === "project" ? title : siteMeta.photographer;
  const displayNumber = routeKind === "archive" ? formatArchiveIndex(number) : formatSeriesIndex(number);

  return (
    <header className="site-header-chrome" data-route-kind={routeKind}>
      <Link href="/" className="site-header-chrome__brand" aria-label={siteMeta.photographer} data-logo="">
        <span className="site-header-chrome__name">{headerTitle}</span>
      </Link>

      <nav ref={navRef} className="site-header-chrome__nav" aria-label="Primary">
        {sitePrimaryNavLinks.map((link) => (
          <Link key={link.href} href={link.href} className="site-header-chrome__nav-link">
            {link.label}
          </Link>
        ))}
      </nav>

      {(routeKind === "home" || routeKind === "list" || routeKind === "archive" || routeKind === "project") ? (
        <p ref={numberRef} className="site-header-chrome__number">
          {displayNumber}
        </p>
      ) : null}
    </header>
  );
}
