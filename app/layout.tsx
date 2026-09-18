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

export const metadata: Metadata = {
  title: "Mirrorline · Evidence-First Trading Desk for Bitget Reality rTokens",
  description:
    "Evidence-first, non-advisory decision support for 24/7 Bitget Reality rTokens. Stress-test interpretations, structured claims, revision diffs, and multi-symbol evidence comparison.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#080A0F] text-[#F5F7FA]">{children}</body>
    </html>
  );
}
