import { cacheLife, cacheTag } from "next/cache";

import {
  fetchEventbrite,
  fetchGCBA,
  fetchPassline,
  fetchTicketmaster,
} from "@/lib/eventSources";
import { getEventsFromDb } from "@/lib/events";
import { getCity } from "@/lib/geo/cities";
import { normalizePartialEvent } from "@/lib/normalizeEvents";
import type { Evento, EventSource, NormalizedEvent } from "@/lib/types";

const CACHE_PROFILE = {
  stale: 300,
  revalidate: 1800,
  expire: 86400,
};

function dedupeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeAndSort(events: NormalizedEvent[]): NormalizedEvent[] {
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  const unique: NormalizedEvent[] = [];

  for (const event of events) {
    const titleKey = `${dedupeKey(event.titulo)}|${event.fecha}|${dedupeKey(
      event.ciudad ?? "",
    )}`;

    if (seenIds.has(event.id) || seenTitles.has(titleKey)) continue;

    seenIds.add(event.id);
    seenTitles.add(titleKey);
    unique.push(event);
  }

  return unique.sort(
    (a, b) =>
      a.fecha.localeCompare(b.fecha) ||
      a.titulo.localeCompare(b.titulo, "es"),
  );
}

/**
 * Fallback de transición: si Supabase todavía no tiene las tablas o está
 * caído, la home sigue mostrando datos reales consultando las fuentes.
 * En producción, una vez corrida la migración, el camino normal es la DB.
 */
export async function getEventosLive(): Promise<NormalizedEvent[]> {
  const [gcbaResult, ebResult, passlineResult, tmResult] =
    await Promise.allSettled([
      fetchGCBA().catch(() => []),
      fetchEventbrite().catch(() => []),
      fetchPassline().catch(() => []),
      fetchTicketmaster().catch(() => []),
    ]);

  const gcba: Partial<Evento>[] =
    gcbaResult.status === "fulfilled" ? gcbaResult.value : [];
  const eb: Partial<Evento>[] =
    ebResult.status === "fulfilled" ? ebResult.value : [];
  const passline: Partial<Evento>[] =
    passlineResult.status === "fulfilled" ? passlineResult.value : [];
  const tm: Partial<Evento>[] =
    tmResult.status === "fulfilled" ? tmResult.value : [];

  console.log("Fuentes live:", {
    gcba: gcba.length,
    eb: eb.length,
    passline: passline.length,
    tm: tm.length,
  });

  const events: NormalizedEvent[] = [];

  const add = (items: Partial<Evento>[], fuente: EventSource) => {
    for (const item of items) {
      const event = normalizePartialEvent(item, fuente);
      if (event) events.push(event);
    }
  };

  add(gcba, "gcba");
  add(eb, "eventbrite");
  add(passline, "passline");
  add(tm, "ticketmaster");

  return dedupeAndSort(events);
}

export type GetEventosOptions = {
  city?: string | null;
  category?: string | null;
  query?: string | null;
  limit?: number;
  lat?: number;
  lng?: number;
  radiusM?: number;
};

export async function getEventos(
  options: GetEventosOptions = {},
): Promise<NormalizedEvent[]> {
  "use cache";
  cacheLife(CACHE_PROFILE);
  cacheTag("events");

  try {
    const events = await getEventsFromDb({
      city: options.city ?? null,
      category: options.category ?? null,
      q: options.query ?? null,
      limit: options.limit ?? 120,
      lat: options.lat,
      lng: options.lng,
      radiusM: options.radiusM,
    });

    // Si la DB responde, esa es la fuente de verdad aunque esté vacía. El
    // fallback live solo se usa cuando la DB falla.
    return events;
  } catch (error) {
    console.warn(
      "[getEventos] DB no disponible, usando fuentes live:",
      error instanceof Error ? error.message : error,
    );

    try {
      const live = await getEventosLive();
      if (!options.city) return live;

      const target = getCity(options.city);
      const inCity = live.filter(
        (event) => !event.ciudad || getCity(event.ciudad).name === target.name,
      );

      return inCity.length > 0 ? inCity : live;
    } catch (liveError) {
      console.error("[getEventos] fallback live falló:", liveError);
      return [];
    }
  }
}
