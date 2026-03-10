import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Acil Alan Takip",
  description: "Acil servis alan takip PWA uygulaması",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Acil Alan Takip",
    statusBarStyle: "default"
  }
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
