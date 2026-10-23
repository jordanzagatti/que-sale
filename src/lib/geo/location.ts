import { headers } from "next/headers";

import {
  DEFAULT_CITY,
  resolveCityFromHeaders,
  type CityInfo,
} from "@/lib/geo/cities";

/**
 * Geolocalización aproximada por IP. En Vercel llegan estos headers en
 * producción; en local caemos a CABA. La ubicación precisa solo se pide
 * desde el cliente cuando la persona toca "Cerca mío".
 */
export async function getRequestCity(): Promise<CityInfo> {
  try {
    const store = await headers();
    return resolveCityFromHeaders(
      store.get("x-vercel-ip-city") ?? store.get("x-qs-city"),
      store.get("x-vercel-ip-latitude"),
      store.get("x-vercel-ip-longitude"),
    );
  } catch {
    return DEFAULT_CITY;
  }
}
