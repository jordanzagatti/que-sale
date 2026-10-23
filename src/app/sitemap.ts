import type { MetadataRoute } from "next";
import { connection } from "next/server";

import { getEventsFromDb } from "@/lib/events";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://quesale.ar"
).replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();

  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "hourly", priority: 1 },
    { url: `${siteUrl}/mapa`, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/fuentes`, changeFrequency: "monthly", priority: 0.4 },
    {
      url: `${siteUrl}/legales/terminos`,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${siteUrl}/legales/privacidad`,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  try {
    const events = await getEventsFromDb({ limit: 500 });
    const eventPages: MetadataRoute.Sitemap = events
      .filter((event) => event.slug)
      .map((event) => ({
        url: `${siteUrl}/eventos/${event.slug}`,
        changeFrequency: "weekly",
        priority: 0.6,
      }));

    return [...staticPages, ...eventPages];
  } catch {
    return staticPages;
  }
}
