import Link from "next/link";

const links = [
  { href: "/contact", label: "Contact,", key: "contact" },
  { href: "/", label: "Portfolio,", key: "portfolio" },
  { href: "/list", label: "List,", key: "list" },
  { href: "/archive", label: "Archive,", key: "archive" },
  { href: "/raw", label: "Raw", key: "raw" },
] as const;

export function SiteNav({
  active,
}: {
  active: "portfolio" | "list" | "archive" | "raw" | "contact";
}) {
  return (
    <nav className="nav-links" aria-label="Primary">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="nav-link" data-active={String(link.key === active)}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
