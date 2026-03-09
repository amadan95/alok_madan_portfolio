import type { ReactNode } from "react";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { getSiteMeta } from "@/lib/catalog";

export function SiteShell({
  active,
  children,
}: {
  active: "portfolio" | "list" | "archive" | "raw" | "contact";
  children: ReactNode;
}) {
  const siteMeta = getSiteMeta();

  return (
    <div className="site-shell">
      <header className="site-header">
        <Link href="/" className="brand" aria-label={siteMeta.photographer}>
          <span className="brand__micro">{siteMeta.photographer}</span>
          <span className="brand__name">{siteMeta.photographer}</span>
        </Link>
        <SiteNav active={active} />
      </header>
      <div className="page-wrap">{children}</div>
    </div>
  );
}
