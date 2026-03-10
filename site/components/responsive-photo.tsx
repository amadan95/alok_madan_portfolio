"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ImgHTMLAttributes } from "react";
import type { AssetVariantKey, AssetVariantSource, DisplayAsset } from "@/lib/types";

const TRANSPARENT_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=";

type ResponsivePhotoProps = {
  asset: DisplayAsset;
  alt: string;
  variants?: AssetVariantKey[];
  sizes?: string;
  eager?: boolean;
  fetchPriority?: "high" | "low" | "auto";
  rootMargin?: string;
  observerRoot?: Element | null;
  pictureClassName?: string;
  imgClassName?: string;
  style?: CSSProperties;
  imgProps?: Omit<
    ImgHTMLAttributes<HTMLImageElement> & Record<string, unknown>,
    "src" | "srcSet" | "sizes" | "width" | "height" | "loading" | "decoding" | "fetchPriority" | "alt"
  >;
};

function dedupeVariantSources(
  asset: DisplayAsset,
  variantKeys: AssetVariantKey[],
): AssetVariantSource[] {
  const seen = new Set<number>();
  const ordered: AssetVariantSource[] = [];

  variantKeys.forEach((key) => {
    const variant = asset.variants[key];
    if (!variant || seen.has(variant.width)) {
      return;
    }
    seen.add(variant.width);
    ordered.push(variant);
  });

  return ordered.sort((left, right) => left.width - right.width);
}

export function ResponsivePhoto({
  asset,
  alt,
  variants = ["thumb", "rail", "hero"],
  sizes,
  eager = false,
  fetchPriority = "auto",
  rootMargin = "150% 0px",
  observerRoot = null,
  pictureClassName,
  imgClassName,
  style,
  imgProps,
}: ResponsivePhotoProps) {
  const pictureRef = useRef<HTMLPictureElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(eager);
  const sources = useMemo(() => dedupeVariantSources(asset, variants), [asset, variants]);

  useEffect(() => {
    if (eager || shouldLoad || !pictureRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting || entry.intersectionRatio > 0)) {
          setShouldLoad(true);
        }
      },
      {
        root: observerRoot,
        rootMargin,
        threshold: 0.01,
      },
    );

    observer.observe(pictureRef.current);
    return () => observer.disconnect();
  }, [eager, observerRoot, rootMargin, shouldLoad]);

  const activeSources = shouldLoad || eager ? sources : [];
  const fallbackSource = activeSources[activeSources.length - 1] ?? sources[sources.length - 1];
  const webpSrcSet =
    activeSources.length > 0 ? activeSources.map((variant) => `${variant.webp} ${variant.width}w`).join(", ") : undefined;
  const jpegSrcSet =
    activeSources.length > 0 ? activeSources.map((variant) => `${variant.jpeg} ${variant.width}w`).join(", ") : undefined;

  return (
    <picture
      ref={pictureRef}
      className={pictureClassName}
      style={{
        backgroundColor: asset.averageColor,
        ...style,
      }}
    >
      {webpSrcSet ? <source type="image/webp" srcSet={webpSrcSet} sizes={sizes} /> : null}
      {jpegSrcSet ? <source type="image/jpeg" srcSet={jpegSrcSet} sizes={sizes} /> : null}
      <img
        {...imgProps}
        alt={alt}
        src={activeSources.length > 0 && fallbackSource ? fallbackSource.jpeg : TRANSPARENT_PIXEL}
        width={asset.width}
        height={asset.height}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={eager ? fetchPriority : "auto"}
        sizes={activeSources.length > 0 ? sizes : undefined}
        className={imgClassName}
      />
    </picture>
  );
}
