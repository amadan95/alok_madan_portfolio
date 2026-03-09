"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { TransitionRouter } from "next-transition-router";
import gsap from "gsap";
import type { IntroSlide, SiteMeta } from "@/lib/types";
import { getRouteKind } from "@/lib/route-kind";
import { useUIStore } from "@/lib/ui-store";
import { cn } from "@/lib/utils";
import { DarkLightSwitch } from "@/components/dark-light-switch";
import { IntroOverlay } from "@/components/intro-overlay";
import { SiteHeaderChrome } from "@/components/site-header-chrome";

export function AppShell({
  children,
  siteMeta,
  introSlides,
}: {
  children: React.ReactNode;
  siteMeta: SiteMeta;
  introSlides: IntroSlide[];
}) {
  const pathname = usePathname();
  const routeKind = getRouteKind(pathname);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const didHydrateTheme = useRef(false);
  const [hasMounted, setHasMounted] = useState(false);

  const activeProjectSlug = useUIStore((state) => state.activeProjectSlug);
  const hideIntro = useUIStore((state) => state.hideIntro);
  const isDarkMode = useUIStore((state) => state.isDarkMode);
  const setHideIntro = useUIStore((state) => state.setHideIntro);
  const setIsDarkMode = useUIStore((state) => state.setIsDarkMode);
  const setIsWhite = useUIStore((state) => state.setIsWhite);
  const setMoveNavToTop = useUIStore((state) => state.setMoveNavToTop);
  const setScrollPosition = useUIStore((state) => state.setScrollPosition);
  const setTitle = useUIStore((state) => state.setTitle);
  const setZoomLevel = useUIStore((state) => state.setZoomLevel);

  const showHeader =
    routeKind === "home" ||
    routeKind === "list" ||
    routeKind === "archive" ||
    routeKind === "raw" ||
    routeKind === "project";

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (didHydrateTheme.current) {
      return;
    }

    didHydrateTheme.current = true;
    const storedTheme = window.localStorage.getItem("portfolio-theme");
    if (storedTheme === "dark") {
      setIsDarkMode(true);
    }
    setHideIntro(pathname !== "/");
  }, [pathname, setHideIntro, setIsDarkMode]);

  useEffect(() => {
    document.documentElement.dataset.theme = isDarkMode ? "dark" : "light";
    window.localStorage.setItem("portfolio-theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    setIsWhite(routeKind === "home" || routeKind === "list" || routeKind === "raw" || routeKind === "project");
    setMoveNavToTop(routeKind !== "home" || hideIntro);

    if (routeKind !== "project") {
      setTitle(siteMeta.photographer);
    }

    if (routeKind === "home") {
      setZoomLevel(1);
    }
  }, [hideIntro, routeKind, setIsWhite, setMoveNavToTop, setTitle, setZoomLevel, siteMeta.photographer]);

  const transitionCallbacks = useMemo(
    () => ({
      leave: (next: () => void, from?: string, to?: string) => {
        if (from?.startsWith("/portfolio/") && to === "/") {
          setScrollPosition(window.scrollY);
        }

        const tween = gsap.to(stageRef.current, {
          autoAlpha: 0,
          duration: 0.28,
          ease: "power2.out",
          onComplete: next,
        });
        return () => tween.kill();
      },
      enter: (next: () => void) => {
        const tween = gsap.fromTo(
          stageRef.current,
          { autoAlpha: 0 },
          {
            autoAlpha: 1,
            duration: 0.42,
            ease: "power2.out",
            clearProps: "opacity,visibility",
            onComplete: next,
          },
        );
        return () => tween.kill();
      },
    }),
    [setScrollPosition],
  );

  return (
    <TransitionRouter auto leave={transitionCallbacks.leave} enter={transitionCallbacks.enter}>
      <div className={cn("app-shell", `app-shell--${routeKind}`)} data-route-kind={routeKind}>
        {showHeader ? <SiteHeaderChrome routeKind={routeKind} siteMeta={siteMeta} /> : null}
        <DarkLightSwitch routeKind={routeKind} />
        {hasMounted && routeKind === "home" ? (
          <IntroOverlay
            slides={introSlides}
            siteMeta={siteMeta}
            visible={!hideIntro}
            activeProjectSlug={activeProjectSlug}
          />
        ) : null}
        <div
          ref={stageRef}
          className={cn("route-stage", !showHeader && "route-stage--bare")}
          data-route-stage=""
        >
          {children}
        </div>
      </div>
    </TransitionRouter>
  );
}
