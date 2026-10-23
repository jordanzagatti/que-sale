import { categoryImage, normalizeCategory } from "@/lib/categories";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import type { EventCategory, EventSource, NormalizedEvent } from "@/lib/types";

export type EventRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  starts_at: string;
  ends_at: string | null;
  timezone?: string | null;
  all_day?: boolean | null;
  venue_name: string | null;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  province: string | null;
  latitude: number | null;
  longitude: number | null;
  price_text: string | null;
  price_min: number | null;
  currency: string | null;
  is_free: boolean | null;
  image_url: string | null;
  source: string | null;
  source_id?: string | null;
  source_url: string | null;
  ticket_url: string | null;
  featured: boolean | null;
  tags?: string[] | null;
  series_id?: string | null;
  distance_m?: number | null;
};

export type EventFilters = {
  city?: string | null;
  province?: string | null;
  category?: string | null;
  q?: string | null;
  from?: string | null;
  to?: string | null;
  limit?: number;
  lat?: number | null;
  lng?: number | null;
  radiusM?: number | null;
};

const AR_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Argentina/Buenos_Aires",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const AR_TIME = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function dateOnly(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return AR_DATE.format(date);
}

function timeOnly(value: string, allDay?: boolean | null): string | undefined {
  if (allDay) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  const formatted = AR_TIME.format(date);
  return formatted === "00:00" ? undefined : formatted;
}

function priceFromRow(row: EventRow): string {
  if (row.price_text) return row.price_text;
  if (row.is_free) return "Entrada libre";
  if (row.price_min && row.price_min > 0) {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: row.currency || "ARS",
      maximumFractionDigits: 0,
    }).format(row.price_min);
  }
  return "Consultar";
}

export function mapEventRow(row: EventRow): NormalizedEvent {
  const categoria = normalizeCategory(row.category) as EventCategory;
  const image = row.image_url || categoryImage(categoria);

  return {
    id: row.id,
    slug: row.slug,
    titulo: row.title,
    fecha: dateOnly(row.starts_at),
    startsAt: row.starts_at,
    endsAt: row.ends_at ?? undefined,
    hora: timeOnly(row.starts_at, row.all_day),
    lugar: row.venue_name || row.address || row.city || "Argentina",
    barrio: row.neighborhood || row.city || "Argentina",
    ciudad: row.city ?? undefined,
    provincia: row.province ?? undefined,
    categoria,
    precio: priceFromRow(row),
    imagen: image,
    destacado: row.featured === true,
    fuente: (row.source as EventSource | null) ?? "unknown",
    descripcion: row.description ?? undefined,
    urlFuente: row.source_url ?? undefined,
    urlEntrada: row.ticket_url ?? row.source_url ?? undefined,
    lat: row.latitude ?? undefined,
    lng: row.longitude ?? undefined,
    distanciaM:
      typeof row.distance_m === "number" ? row.distance_m : undefined,
    esGratis: row.is_free ?? undefined,
    seriesId: row.series_id ?? undefined,
    sourceId: row.source_id ?? undefined,
  };
}

function iso(value: string | null | undefined, fallback: Date): string {
  if (!value) return fallback.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString();
}

export async function getEventsFromDb(
  filters: EventFilters = {},
): Promise<NormalizedEvent[]> {
  const supabase = createSupabasePublicClient();
  const from = iso(filters.from, new Date());
  const to = iso(
    filters.to,
    new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  );
  const limit = Math.min(Math.max(filters.limit ?? 120, 1), 500);

  if (
    typeof filters.lat === "number" &&
    typeof filters.lng === "number" &&
    Number.isFinite(filters.lat) &&
    Number.isFinite(filters.lng)
  ) {
    const { data, error } = await supabase.rpc("nearby_events", {
      p_lat: filters.lat,
      p_lng: filters.lng,
      p_radius_m: Math.min(Math.max(filters.radiusM ?? 10000, 100), 100000),
      p_from: from,
      p_to: to,
      p_limit: limit,
    });

    if (error) throw new Error(`nearby_events: ${error.message}`);

    const events = ((data ?? []) as EventRow[]).map(mapEventRow);
    return filters.category
      ? events.filter((event) => event.categoria === filters.category)
      : events;
  }

  const { data, error } = await supabase.rpc("search_events", {
    p_query: filters.q?.trim() ?? "",
    p_city: filters.city ?? null,
    p_category: filters.category ?? null,
    p_from: from,
    p_to: to,
    p_limit: limit,
  });

  if (!error) {
    return ((data ?? []) as EventRow[]).map(mapEventRow);
  }

  // Fallback si la función todavía no existe (por ejemplo, antes de correr
  // la migración). La tabla puede existir igual.
  let query = supabase
    .from("events")
    .select("*")
    .eq("status", "active")
    .eq("is_private", false)
    .gte("starts_at", from)
    .lte("starts_at", to)
    .order("starts_at", { ascending: true })
    .limit(limit);

  if (filters.city) query = query.eq("city", filters.city);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.q?.trim()) query = query.ilike("title", `%${filters.q.trim()}%`);

  const fallback = await query;
  if (fallback.error) {
    throw new Error(fallback.error.message);
  }

  return ((fallback.data ?? []) as EventRow[]).map(mapEventRow);
}

export async function getEventBySlug(
  slug: string,
): Promise<NormalizedEvent | null> {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new Error(`events/${slug}: ${error.message}`);
  }

  if (!data) return null;
  return mapEventRow(data as EventRow);
}

export async function getRelatedOccurrences(
  seriesId: string,
  excludeId: string,
): Promise<NormalizedEvent[]> {
  if (!seriesId) return [];
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("series_id", seriesId)
    .eq("status", "active")
    .neq("id", excludeId)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(12);

  if (error || !data) return [];
  return (data as EventRow[]).map(mapEventRow);
}

export async function getAttendanceCount(
  eventId: string,
): Promise<{ going: number; interested: number }> {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("event_attendance_counts")
    .select("going_count, interested_count")
    .eq("event_id", eventId)
    .maybeSingle();

  if (error || !data) return { going: 0, interested: 0 };
  return {
    going: Number(data.going_count ?? 0),
    interested: Number(data.interested_count ?? 0),
  };
}
