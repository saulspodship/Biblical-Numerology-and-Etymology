import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gematria-lab.saulspodship.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Gematria Lab — words, numbers & evidence",
    template: "%s · Gematria Lab",
  },
  description: "A source-first research lab for Hebrew gematria, ancient number systems, etymology, scripture search, and carefully graded historical claims.",
  applicationName: "Gematria Lab",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Gematria Lab",
    title: "Gematria Lab — words, numbers & evidence",
    description: "Deterministic calculations. Cited language history. Coincidence baselines.",
    url: "/",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#f5f1e8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
