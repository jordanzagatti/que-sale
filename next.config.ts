import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
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
};

export default nextConfig;
