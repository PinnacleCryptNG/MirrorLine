import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mirroline.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Mirrorline · Check If Your Trading Idea Matches Bitget's Real Data",
    template: "%s · Mirrorline",
  },
  description:
    "Mirrorline helps you check what Bitget's Reality rToken market data supports—and what it doesn't—before you act. Free research tool with no buy/sell signals or trade execution.",
  keywords: [
    "Bitget",
    "Reality Token",
    "rToken",
    "Trading Desk",
    "Market Evidence",
    "Crypto Trading",
    "Thesis Verification",
    "Non-advisory",
  ],
  authors: [{ name: "Mirrorline Team" }],
  creator: "Mirrorline",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    title: "Mirrorline · Check If Your Trading Idea Matches Bitget's Real Data",
    description:
      "Mirrorline helps you verify what Reality rToken market data supports—and what it doesn't—before you act. Free research tool with no buy/sell signals or trade execution.",
    siteName: "Mirrorline Research Desk",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mirrorline · Check If Your Trading Idea Matches Bitget's Real Data",
    description:
      "Mirrorline helps you verify what Reality rToken market data supports—and what it doesn't—before you act. Free research tool.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--bg-primary)] text-[var(--text-primary)]">{children}</body>
    </html>
  );
}
