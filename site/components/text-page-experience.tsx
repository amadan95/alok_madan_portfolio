"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import type { DisplayAsset, SiteMeta } from "@/lib/types";
import { splitParagraphs } from "@/lib/utils";
import { ResponsivePhoto } from "@/components/responsive-photo";

export function TextPageExperience({
  kind,
  siteMeta,
  backgroundAsset,
}: {
  kind: "contact" | "disclaimer";
  siteMeta: SiteMeta;
  backgroundAsset: DisplayAsset | null;
}) {
  const [clock, setClock] = useState("");
  const textRef = useRef<HTMLDivElement | null>(null);
  const sideRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);

  const mainParagraphs = useMemo(
    () => splitParagraphs(kind === "contact" ? siteMeta.contactBio : siteMeta.disclaimerText),
    [kind, siteMeta.contactBio, siteMeta.disclaimerText],
  );
  const sideParagraphs = useMemo(
    () => splitParagraphs(kind === "contact" ? siteMeta.contactRepresented : "For licensing, permissions, commissions, or print inquiries."),
    [kind, siteMeta.contactRepresented],
  );

  useEffect(() => {
    const updateClock = () => {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: siteMeta.timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      setClock(`${siteMeta.cityLabel}, ${formatter.format(new Date()).toLowerCase()}`);
    };

    updateClock();
    const interval = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(interval);
  }, [siteMeta.cityLabel, siteMeta.timeZone]);

  useEffect(() => {
    const targets = [textRef.current, sideRef.current, footerRef.current].filter(Boolean) as HTMLElement[];
    const animation = gsap.fromTo(
      targets,
      { autoAlpha: 0, y: 10 },
      { autoAlpha: 1, y: 0, duration: 0.28, stagger: 0.05, ease: "power2.out" },
    );

    return () => {
      animation.kill();
    };
  }, [kind, mainParagraphs, sideParagraphs]);

  return (
    <main className="text-page-experience" data-kind={kind}>
      {backgroundAsset ? (
        <div className="text-page-experience__background">
          <ResponsivePhoto asset={backgroundAsset} alt="" variants={["hero"]} sizes="100vw" eager fetchPriority="high" />
        </div>
      ) : null}

      <div className="text-page-experience__clock">{clock}</div>

      <section className="text-page-experience__content">
        <div ref={textRef} className="text-page-experience__column is-main">
          {mainParagraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <div ref={sideRef} className="text-page-experience__column is-side">
          {sideParagraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      <footer ref={footerRef} className="text-page-experience__footer">
        {kind === "contact" ? (
          <div className="text-page-experience__socials">
            <span>{siteMeta.contactEmail}</span>
            {siteMeta.socialLinks.map((link) => (
              <a key={link.label} href={link.href} target="_blank" rel="noreferrer">
                {link.label}
              </a>
            ))}
          </div>
        ) : (
          <div className="text-page-experience__socials">
            <Link href="/contact">Contact</Link>
          </div>
        )}
        <div className="text-page-experience__legal">
          {kind === "contact" ? <Link href="/disclaimer">Disclaimer</Link> : <span>All rights reserved</span>}
        </div>
      </footer>
    </main>
  );
}
