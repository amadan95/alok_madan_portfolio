import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetailExperience } from "@/components/project-detail-experience";
import {
  getCollectionBySlug,
  getCollectionImages,
  getCollections,
} from "@/lib/catalog";

export function generateStaticParams() {
  return getCollections().map((collection) => ({ slug: collection.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collection = getCollectionBySlug(slug);
  if (!collection) {
    return {};
  }

  return {
    title: `${collection.title} | Portfolio`,
    description: collection.synopsis,
  };
}

export default async function PortfolioDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = getCollectionBySlug(slug);
  if (!collection) {
    notFound();
  }

  const images = getCollectionImages(collection);

  return <ProjectDetailExperience collection={collection} images={images} />;
}
