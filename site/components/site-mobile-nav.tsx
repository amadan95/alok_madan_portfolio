"use client";

import Link from "next/link";
import type { RouteKind } from "@/lib/route-kind";
import { cn } from "@/lib/utils";

const mobileNavLinks = [
  {
    href: "/",
    label: "Portfolio",
    activeKinds: ["home", "list", "project"] satisfies RouteKind[],
  },
  {
    href: "/archive",
    label: "Archive",
    activeKinds: ["archive"] satisfies RouteKind[],
  },
  {
    href: "/raw",
    label: "Raw",
    activeKinds: ["raw"] satisfies RouteKind[],
  },
  {
    href: "/contact",
    label: "Contact",
    activeKinds: ["contact", "disclaimer"] satisfies RouteKind[],
  },
] as const;

export function SiteMobileNav({ routeKind }: { routeKind: RouteKind }) {
  return (
    <nav className="site-mobile-nav" aria-label="Mobile">
      {mobileNavLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn("site-mobile-nav__link", link.activeKinds.includes(routeKind) && "is-active")}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
