"use client";

import Link from "next/link";
import { useTransitionRouter } from "next-transition-router";
import { cn } from "@/lib/utils";

export function PortfolioModeBar({
  mode,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  showZoom = true,
}: {
  mode: "grid" | "list";
  zoomLevel?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  showZoom?: boolean;
}) {
  const router = useTransitionRouter();

  return (
    <div className="portfolio-mode-bar">
      <div className="portfolio-mode-bar__links">
        <Link href="/list" className={cn("portfolio-mode-bar__link", mode === "list" && "is-active")}>
          List
        </Link>
        <span>/</span>
        <Link href="/" className={cn("portfolio-mode-bar__link", mode === "grid" && "is-active")}>
          Grid
        </Link>
      </div>

      {showZoom ? (
        <div className="portfolio-mode-bar__zoom">
          <button
            type="button"
            className={cn("portfolio-mode-bar__button", zoomLevel === 2 && "is-disabled")}
            onClick={() => {
              if (zoomLevel === 2) {
                return;
              }
              onZoomOut?.();
            }}
            aria-label="Zoom out"
          >
            +
          </button>
          <button
            type="button"
            className={cn("portfolio-mode-bar__button", zoomLevel === 0 && "is-edge")}
            onClick={() => {
              if (zoomLevel === 0 && mode === "grid") {
                router.push("/list");
                return;
              }
              onZoomIn?.();
            }}
            aria-label="Zoom in"
          >
            -
          </button>
        </div>
      ) : null}
    </div>
  );
}
