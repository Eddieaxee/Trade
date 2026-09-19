import type { Metadata } from "next";
// @ts-ignore: allow importing global CSS without type declarations
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import { ThemeScript } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "FX Pulse — Forex Market Intelligence",
  description:
    "Currency-strength, Smart Money Concepts, Candle Range Theory and technical-confluence dashboards for the FX market. Analysis only — not a trading terminal.",
  metadataBase: new URL("https://forex-intelligence.example"),
  themeColor: "#0b0e14",
  openGraph: {
    title: "FX Pulse",
    description: "Currency Strength · SMC · Indicators · CRT — dedicated FX analysis",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <ThemeScript />
      </head>
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
