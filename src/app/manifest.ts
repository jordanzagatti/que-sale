import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "¿Qué Sale? · Agenda de Argentina",
    short_name: "¿Qué Sale?",
    description:
      "Recitales, teatro, ferias, deportes y todos los eventos de Argentina en una sola agenda.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#09090b",
    theme_color: "#09090b",
    lang: "es-AR",
    categories: ["entertainment", "lifestyle", "travel"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Mi agenda",
        short_name: "Agenda",
        description: "Tus eventos guardados",
        url: "/cuenta",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Mapa",
        short_name: "Mapa",
        description: "Eventos cerca tuyo",
        url: "/mapa",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
