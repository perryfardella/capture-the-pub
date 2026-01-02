import "./globals.css";
import { GameStatusBanner } from "@/components/GameStateBanner";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Capture the Pub",
  description: "Mobile-first bucks party game - capture pubs, complete challenges, and compete in real-time",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Capture the Pub",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="bg-background text-foreground">
        <div className="mx-auto max-w-md min-h-dvh">
          <GameStatusBanner />
          {children}
        </div>
      </body>
    </html>
  );
}
