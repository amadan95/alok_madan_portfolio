import type { Metadata } from "next";
import { Cormorant_Garamond } from "next/font/google";
import "@/app/globals.css";
import { AppShell } from "@/components/app-shell";
import { getAllCanonicalAssets, getSiteMeta } from "@/lib/catalog";
import type { IntroSlide } from "@/lib/types";

const siteMeta = getSiteMeta();
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-editorial",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: siteMeta.title,
  description: siteMeta.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const introSlides = getAllCanonicalAssets()
    .map(
      (asset) =>
      ({
        id: asset.id,
        displayPath: asset.displayPath,
        width: asset.width,
        height: asset.height,
      }) satisfies IntroSlide,
    );

  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth" className={cormorant.variable}>
      <body>
        <AppShell siteMeta={siteMeta} introSlides={introSlides}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
