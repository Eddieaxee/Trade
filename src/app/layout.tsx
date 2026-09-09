import type { Metadata } from "next";
// @ts-ignore: allow importing global CSS without type declarations
import "./globals.css";
import NavBar from "@/components/NavBar";
import MarketSessions from "@/components/MarketSessions";

export const metadata: Metadata = {
  title: "FX Pulse — Forex Market Intelligence",
  description:
    "Currency-strength, Smart Money Concepts, Candle Range Theory and technical-confluence dashboards for the FX market. Analysis only — not a trading terminal.",
  metadataBase: new URL("https://forex-intelligence.example"),
  openGraph: {
    title: "FX Pulse",
    description: "SMC · CRT · Currency Strength · Confluence dashboards",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="app-header">
          <div className="brand">
            <a href="/" style={{ color: "inherit" }}>
              <span className="fx">FX</span> Pulse
            </a>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}> · forex intelligence platform</span>
          </div>
          <NavBar />
          <MarketSessions />
        </header>
        {children}
      </body>
    </html>
  );
}
