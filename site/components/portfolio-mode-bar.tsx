"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export function PortfolioModeBar({ mode }: { mode: "grid" | "list" }) {
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

    </div>
  );
}
