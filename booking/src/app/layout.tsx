import type { Metadata, Viewport } from "next";
import "@fontsource-variable/cormorant-garamond";
import "@fontsource-variable/jost";
import "./globals.css";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: "Éclat · Szállás Balatonbogláron", template: "%s · Éclat Balatonboglár" },
  description: "Nyári szállás Balatonbogláron, a Balaton déli partján — foglaljon közvetlenül, közvetítő nélkül.",
  openGraph: { type: "website", locale: "hu_HU", siteName: "Éclat Balatonboglár" },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = { themeColor: "#f7f2ea", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu">
      <body>
        <a href="#tartalom" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-ink focus:px-4 focus:py-2 focus:text-ivory">
          Ugrás a tartalomra
        </a>
        {children}
      </body>
    </html>
  );
}
