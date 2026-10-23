import type { NextRequest } from "next/server";

import { normalizeText } from "@/lib/categories";
import { getEventsFromDb } from "@/lib/events";
import { getCity } from "@/lib/geo/cities";
import { getEventosLive } from "@/lib/getEventos";
import type { NormalizedEvent } from "@/lib/types";

function numberParam(value: string | null): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function filterFallback(
  events: NormalizedEvent[],
  params: {
    city?: string;
    q?: string;
    category?: string;
    lat?: number;
    lng?: number;
    radiusKm?: number;
  },
) {
  const targetCity = params.city ? getCity(params.city) : null;
  const term = normalizeText(params.q);

  return events.filter((event) => {
    if (targetCity) {
      const eventCity = event.ciudad ? getCity(event.ciudad).name : null;
      if (eventCity && eventCity !== targetCity.name) return false;
    }

    if (params.category && event.categoria !== params.category) return false;

    if (term) {
      const haystack = normalizeText(
        `${event.titulo} ${event.lugar} ${event.barrio} ${event.ciudad ?? ""} ${
          event.descripcion ?? ""
        }`,
      );
      if (!haystack.includes(term)) return false;
    }

    if (
      typeof params.lat === "number" &&
      typeof params.lng === "number" &&
      (typeof event.lat !== "number" || typeof event.lng !== "number")
    ) {
      return false;
    }

    if (
      typeof params.lat === "number" &&
      typeof params.lng === "number" &&
      typeof event.lat === "number" &&
      typeof event.lng === "number"
    ) {
      const km = distanceKm(
        { lat: params.lat, lng: params.lng },
        { lat: event.lat, lng: event.lng },
      );
      if (km > (params.radiusKm ?? 25)) return false;
      event.distanciaM = km * 1000;
    }

    return true;
  });
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const city = params.get("city")?.trim() || undefined;
  const category = params.get("category")?.trim() || undefined;
  const q = params.get("q")?.trim() || undefined;
  const lat = numberParam(params.get("lat"));
  const lng = numberParam(params.get("lng"));
  const radiusM = numberParam(params.get("radius"));
  const limit = Math.min(
    Math.max(numberParam(params.get("limit")) ?? 120, 1),
    500,
  );

  try {
    const events = await getEventsFromDb({
      city,
      category,
      q,
      lat,
      lng,
      radiusM,
      limit,
    });

    return Response.json(events, {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
      },
    });
  } catch {
    const live = await getEventosLive();
    const events = filterFallback(live, {
      city,
      category,
      q,
      lat,
      lng,
      radiusKm: radiusM ? radiusM / 1000 : 25,
    }).slice(0, limit);

    return Response.json(events, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  }
}
