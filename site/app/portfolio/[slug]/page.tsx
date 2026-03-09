import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetailExperience } from "@/components/project-detail-experience";
import { getSeries, getSeriesAssets, getSeriesBySlug, getSiteMeta } from "@/lib/catalog";

export function generateStaticParams() {
  return getSeries().map((series) => ({ slug: series.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const series = getSeriesBySlug(slug);
  if (!series) {
    return {};
  }

  return {
    title: `${series.title} | Portfolio`,
    description: series.synopsis,
  };
}

export default async function PortfolioDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const series = getSeriesBySlug(slug);
  if (!series) {
    notFound();
  }

  const assets = getSeriesAssets(series);
  const siteMeta = getSiteMeta();

  return <ProjectDetailExperience series={series} assets={assets} photographerName={siteMeta.photographer} />;
}
