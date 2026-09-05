"use client";

import { useMemo, useState } from "react";
import type { CSSProperties, ImgHTMLAttributes } from "react";
import type { AssetVariantKey, AssetVariantSource, DisplayAsset } from "@/lib/types";

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
  pictureClassName,
  imgClassName,
  style,
  imgProps,
}: ResponsivePhotoProps) {
  const [failed, setFailed] = useState(false);
  const sources = useMemo(() => dedupeVariantSources(asset, variants), [asset, variants]);
  const fallbackSource = sources[sources.length - 1] ?? asset.variants.thumb;
  const webpSrcSet = sources.map((variant) => `${variant.webp} ${variant.width}w`).join(", ");
  const jpegSrcSet = sources.map((variant) => `${variant.jpeg} ${variant.width}w`).join(", ");

  return (
    <picture
      className={pictureClassName}
      data-image-error={failed ? "true" : undefined}
      style={{
        ...style,
      }}
    >
      <source type="image/webp" srcSet={webpSrcSet} sizes={sizes} />
      <source type="image/jpeg" srcSet={jpegSrcSet} sizes={sizes} />
      <img
        {...imgProps}
        alt={alt}
        src={fallbackSource.jpeg}
        width={asset.width}
        height={asset.height}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={fetchPriority}
        sizes={sizes}
        className={imgClassName}
        onError={() => {
          setFailed(true);
        }}
      />
    </picture>
  );
}
