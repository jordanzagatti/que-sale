import type { Metadata, Viewport } from "next";

import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://quesale.ar";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "¿Qué Sale? · Agenda de eventos de Argentina",
    template: "%s · ¿Qué Sale?",
  },
  description:
    "Recitales, teatro, ferias, deportes, gastronomía y planes en CABA, Córdoba, Rosario, Mendoza y todo el país. Guardá eventos y recibí recordatorios.",
  applicationName: "¿Qué Sale?",
  manifest: "/manifest.webmanifest",
  keywords: [
    "eventos Argentina",
    "agenda cultural",
    "qué hacer en Buenos Aires",
    "recitales",
    "teatro",
    "ferias",
    "CABA",
    "Córdoba",
    "Rosario",
    "Mendoza",
  ],
  authors: [{ name: "¿Qué Sale?" }],
  creator: "¿Qué Sale?",
  category: "entertainment",
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: siteUrl,
    siteName: "¿Qué Sale?",
    title: "¿Qué Sale? · Agenda de eventos de Argentina",
    description:
      "Todos los planes en una sola agenda. Descubrí qué hacer cerca tuyo y guardá tus eventos favoritos.",
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "¿Qué Sale?",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "¿Qué Sale? · Agenda de Argentina",
    description:
      "Recitales, teatro, ferias y planes en todo el país, en una sola agenda.",
    images: ["/icons/icon-512.png"],
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcut: ["/icons/icon-192.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "¿Qué Sale?",
  },
  formatDetection: { telephone: false },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#09090b",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-AR">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
