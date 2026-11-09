import type { Metadata, Viewport } from "next";
import "@fontsource/bricolage-grotesque/latin-500.css";
import "@fontsource/bricolage-grotesque/latin-700.css";
import "@fontsource/bricolage-grotesque/latin-800.css";
import "@fontsource/atkinson-hyperlegible/latin-400.css";
import "@fontsource/atkinson-hyperlegible/latin-700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quiero Spanish",
  description: "Learn Mexican Spanish starting from the most-used words, with retrieval practice.",
};

export const viewport: Viewport = { themeColor: "#0e7c66", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
