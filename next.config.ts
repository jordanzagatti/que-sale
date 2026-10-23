import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Vercel Hobby incluye 5.000 transformaciones por mes. Las imágenes de
    // terceros se sirven tal cual vienen desde la fuente.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "buenosaires.gob.ar",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "img.evbuc.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "imagenes.passline.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "s1.ticketm.net",
        pathname: "/**",
      },
    ],
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
