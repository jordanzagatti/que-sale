import { cacheLife } from "next/cache";

import {
  fetchEventbrite,
  fetchGCBA,
  fetchPassline,
  fetchTicketmaster,
} from "@/lib/eventSources";
import { normalizePartialEvent } from "@/lib/normalizeEvents";
import type { Evento, EventSource, NormalizedEvent } from "@/lib/types";

const CACHE_PROFILE = {
  stale: 300,
  revalidate: 3600,
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
    const titleKey = `${dedupeKey(event.titulo)}|${event.fecha}`;

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

export async function getEventos(): Promise<NormalizedEvent[]> {
  "use cache";
  cacheLife(CACHE_PROFILE);

  // allSettled + catch por fuente: una API caída no rompe el resto.
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

  console.log("Fuentes:", {
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
