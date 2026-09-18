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
  title: "Mirrorline · Hackathon Demo & Investigation Desk",
  description:
    "Milestone 11 of Mirrorline: reproducible demo mode, first-time user orientation, and hardened multi-symbol evidence comparison desk for Bitget Reality rTokens. Non-advisory.",
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
