import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stanley Cup Wager Tracker",
  description: "Golden Knights vs Hurricanes wager tracker for Brett and Dad.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Cup Wager",
    statusBarStyle: "black-translucent"
  }
};

export const viewport: Viewport = {
  themeColor: "#111111",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
