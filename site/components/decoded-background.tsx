"use client";

import { useEffect, useRef, useState } from "react";
import type { CuratedDisplayImage } from "@/lib/types";
import { ResponsivePhoto } from "@/components/responsive-photo";

export function DecodedBackground({ asset, className, imageClassName }: {
  asset: CuratedDisplayImage;
  className: string;
  imageClassName?: string;
}) {
  const [displayedAsset, setDisplayedAsset] = useState(asset);
  const requestRef = useRef(0);

  useEffect(() => {
    if (asset.id === displayedAsset.id) return;
    const request = ++requestRef.current;
    let cancelled = false;
    let triedFallback = false;
    const preload = new window.Image();
    const reveal = async () => {
      try { await preload.decode(); } catch { /* onload still confirms a usable image */ }
      if (!cancelled && requestRef.current === request) setDisplayedAsset(asset);
    };
    preload.onload = reveal;
    preload.onerror = () => {
      if (!triedFallback) {
        triedFallback = true;
        preload.src = asset.variants.hero.jpeg;
      }
    };
    preload.src = asset.variants.hero.webp || asset.variants.hero.jpeg;
    return () => { cancelled = true; };
  }, [asset, displayedAsset.id]);

  return (
    <div className={className} data-background-asset={displayedAsset.id}>
      <ResponsivePhoto asset={displayedAsset} alt="" variants={["rail", "hero"]} sizes="100vw" eager fetchPriority="high" imgClassName={imageClassName} imgProps={{ "aria-hidden": true }} />
    </div>
  );
}
