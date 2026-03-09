import type { Metadata } from "next";
import { Cormorant_Garamond } from "next/font/google";
import "@/app/globals.css";
import { AppShell } from "@/components/app-shell";
import { getIntroSlides, getSiteMeta } from "@/lib/catalog";

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
  const introSlides = getIntroSlides();

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
