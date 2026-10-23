import type { SupabaseClient } from "@supabase/supabase-js";

import { categoryImage, inferCategory, normalizeText } from "@/lib/categories";
import { geocodeAddress } from "@/lib/geo/georef";
import { findCity, inferCity, type CityInfo } from "@/lib/geo/cities";
import { normalizePartialEvent } from "@/lib/normalizeEvents";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  eventFingerprint,
  eventSlug,
  shortHash,
  slugify,
  stableUuid,
} from "@/lib/slug";
import { getSources, findSource } from "@/lib/sources/registry";
import type { IngestMode, SourceAdapter } from "@/lib/sources/types";
import type { Evento } from "@/lib/types";

type GeocodeBudget = { remaining: number };

/**
 * Guardamos solo un extracto corto y factual. La descripción completa, si
 * existe, vive en la fuente original y se enlaza desde el detalle del evento.
 */
function descriptionExcerpt(value: unknown, maxLength = 360) {
  const text = String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return null;
  if (text.length <= maxLength) return text;

  return `${text.slice(0, maxLength).replace(/\s+\S*$/, "")}…`;
}

export type IngestOptions = {
  mode: IngestMode;
  sourceIds?: string[];
  dryRun?: boolean;
  limitPerSource?: number;
  geocodeLimit?: number;
};

export type IngestSummary = {
  mode: IngestMode;
  source: string;
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  status: "ok" | "error";
  message?: string;
};

type EventWriteRow = {
  series_id: string;
  slug: string;
  title: string;
  normalized_title: string;
  description: string | null;
  category: string;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  venue_name: string | null;
  address: string | null;
  neighborhood: string | null;
  city: string;
  province: string;
  city_code: string | null;
  latitude: number | null;
  longitude: number | null;
  location_precision: "exact" | "street" | "city";
  price_text: string | null;
  price_min: number | null;
  currency: string;
  is_free: boolean | null;
  image_url: string | null;
  source: string;
  source_id: string;
  source_url: string | null;
  ticket_url: string | null;
  organizer: string | null;
  fingerprint: string;
  status: "active";
  featured: boolean;
  tags: string[];
  metadata: Record<string, unknown>;
  last_seen_at: string;
};

type StagingWriteRow = Omit<EventWriteRow, "status" | "featured" | "tags"> & {
  payload: Record<string, unknown>;
  status: "pending";
  first_seen_at: string;
};

function isPast(date: Date): boolean {
  return date.getTime() < Date.now() - 6 * 60 * 60 * 1000;
}

function parseDate(raw: Partial<Evento>): { startsAt: string; allDay: boolean } {
  const dateOnly = raw.fecha;
  const start = raw.inicio?.trim();

  if (start && start.includes("T")) {
    const normalized = /[zZ]|[+-]\d{2}:?\d{2}$/.test(start)
      ? start
      : `${start}-03:00`;
    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) {
      return { startsAt: parsed.toISOString(), allDay: false };
    }
  }

  const atNoon = new Date(`${dateOnly}T12:00:00-03:00`);
  return {
    startsAt: Number.isNaN(atNoon.getTime())
      ? new Date().toISOString()
      : atNoon.toISOString(),
    allDay: true,
  };
}

function parsePrice(value: string | undefined): number | null {
  if (!value) return null;
  const text = normalizeText(value);
  if (text.includes("libre") || text.includes("gratis")) return 0;

  const numeric = Number(
    value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."),
  );
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function cityForEvent(raw: Partial<Evento>): CityInfo {
  const explicit = findCity(raw.ciudad) ?? findCity(raw.provincia);
  if (explicit) return explicit;

  return inferCity(raw.ciudad, raw.provincia, raw.barrio, raw.lugar);
}

function jitter(seed: string, index: number): number {
  const hash = shortHash(seed, 8);
  const value = Number.parseInt(hash.slice(index * 2, index * 2 + 2), 16);
  return (value / 255 - 0.5) * 0.02;
}

async function lookupGeocode(
  supabase: SupabaseClient,
  address: string,
  city: string,
  province: string,
  budget: GeocodeBudget,
) {
  const cacheKey = `${normalizeText(address)}|${normalizeText(city)}|${normalizeText(province)}`;

  try {
    const { data } = await supabase
      .from("geocode_cache")
      .select("latitude, longitude")
      .eq("key", cacheKey)
      .maybeSingle();

    if (data) {
      return { lat: Number(data.latitude), lng: Number(data.longitude) };
    }
  } catch {
    // Si la tabla todavía no existe seguimos con el centro de la ciudad.
  }

  if (budget.remaining <= 0) return null;
  budget.remaining -= 1;

  const result = await geocodeAddress(address, city, province);
  if (!result) return null;

  try {
    await supabase.from("geocode_cache").upsert(
      {
        key: cacheKey,
        address,
        city,
        province,
        latitude: result.lat,
        longitude: result.lng,
        provider: result.provider,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
  } catch {
    // El cache es una optimización, no un requisito.
  }

  return { lat: result.lat, lng: result.lng };
}

async function buildWriteRow(
  supabase: SupabaseClient,
  raw: Partial<Evento>,
  source: SourceAdapter,
  budget: GeocodeBudget,
): Promise<{ row: EventWriteRow; raw: Record<string, unknown> } | null> {
  const normalized = normalizePartialEvent(raw, source.id);
  if (!normalized) return null;

  const { startsAt, allDay } = parseDate(raw);
  const startDate = new Date(startsAt);
  if (isPast(startDate)) return null;

  const city = cityForEvent(raw);
  const venue = normalized.lugar || normalized.barrio || city.name;
  const neighborhood = normalized.barrio || city.name;
  const title = normalized.titulo;
  const category = normalized.categoria || inferCategory(title, raw.descripcion);

  let lat: number | null =
    Number.isFinite(raw.lat) && raw.lat !== undefined ? raw.lat : null;
  let lng: number | null =
    Number.isFinite(raw.lng) && raw.lng !== undefined ? raw.lng : null;
  let precision: "exact" | "street" | "city" = "exact";

  const address = raw.direccion || raw.lugar || "";

  if (lat === null || lng === null) {
    precision = "city";
    const geocoded =
      address.length > 6 && !/online/i.test(address)
        ? await lookupGeocode(
            supabase,
            address,
            city.name,
            city.province,
            budget,
          )
        : null;

    if (geocoded) {
      lat = geocoded.lat;
      lng = geocoded.lng;
      precision = "street";
    } else {
      lat = city.lat + jitter(`${title}|${venue}`, 0);
      lng = city.lng + jitter(`${title}|${venue}`, 1);
    }
  }

  const sourceId = raw.id ? String(raw.id) : `${slugify(title)}-${startsAt}`;
  const fingerprint = eventFingerprint(title, startsAt, city.name, venue);
  const slug = eventSlug(title, startsAt, city.name, `${source.id}:${sourceId}`);
  const priceText = normalized.precio || "Consultar";
  const priceMin = parsePrice(priceText);

  const row: EventWriteRow = {
    series_id: stableUuid(
      `${normalizeText(title)}|${normalizeText(venue)}|${normalizeText(city.name)}`,
    ),
    slug,
    title,
    normalized_title: normalizeText(title),
    description: descriptionExcerpt(raw.descripcion || normalized.descripcion),
    category,
    starts_at: startsAt,
    ends_at: raw.fin && raw.fin.includes("T") ? raw.fin : null,
    all_day: allDay,
    venue_name: venue,
    address: raw.direccion || address || null,
    neighborhood,
    city: city.name,
    province: city.province,
    city_code: city.id,
    latitude: lat,
    longitude: lng,
    location_precision: precision,
    price_text: priceText,
    price_min: priceMin,
    currency: raw.moneda || "ARS",
    is_free: raw.esGratis ?? (priceMin === 0 ? true : null),
    // Solo conservamos imágenes de fuentes cuya licencia ya revisamos. Para el
    // resto usamos una portada propia por categoría y enlazamos a la fuente.
    image_url:
      (source.legalStatus === "ok" ? normalized.imagen : null) ||
      categoryImage(category),
    source: source.id,
    source_id: sourceId,
    source_url: raw.url || normalized.urlFuente || null,
    ticket_url: raw.urlEntrada || raw.url || normalized.urlEntrada || null,
    organizer: raw.organizador || null,
    fingerprint,
    status: "active",
    featured: normalized.destacado === true,
    tags: [category, city.name].map(slugify).filter(Boolean),
    metadata: {
      source_name: source.name,
      attribution: source.attribution,
      category_source: raw.categoriaFuente,
      normalized_id: normalized.id,
    },
    last_seen_at: new Date().toISOString(),
  };

  return { row, raw: raw as Record<string, unknown> };
}

async function upsertEvent(
  supabase: SupabaseClient,
  row: EventWriteRow,
  raw: Record<string, unknown>,
): Promise<"inserted" | "updated"> {
  const { data: existing } = await supabase
    .from("events")
    .select("id")
    .eq("fingerprint", row.fingerprint)
    .maybeSingle();

  const { data, error } = await supabase
    .from("events")
    .upsert(row, { onConflict: "fingerprint" })
    .select("id")
    .single();

  if (error) throw new Error(`events upsert: ${error.message}`);

  const { error: sourceError } = await supabase.from("event_sources").upsert(
    {
      event_id: data.id,
      source: row.source,
      source_id: row.source_id,
      source_url: row.source_url,
      raw,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "source,source_id" },
  );

  if (sourceError) {
    throw new Error(`event_sources upsert: ${sourceError.message}`);
  }

  return existing ? "updated" : "inserted";
}

async function insertStaging(
  supabase: SupabaseClient,
  row: EventWriteRow,
  raw: Record<string, unknown>,
): Promise<"inserted" | "updated"> {
  const staging: StagingWriteRow = {
    series_id: row.series_id,
    slug: row.slug,
    title: row.title,
    normalized_title: row.normalized_title,
    description: row.description,
    category: row.category,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    all_day: row.all_day,
    venue_name: row.venue_name,
    address: row.address,
    neighborhood: row.neighborhood,
    city: row.city,
    province: row.province,
    city_code: row.city_code,
    latitude: row.latitude,
    longitude: row.longitude,
    location_precision: row.location_precision,
    price_text: row.price_text,
    price_min: row.price_min,
    currency: row.currency,
    is_free: row.is_free,
    image_url: row.image_url,
    source: row.source,
    source_id: row.source_id,
    source_url: row.source_url,
    ticket_url: row.ticket_url,
    organizer: row.organizer,
    fingerprint: row.fingerprint,
    metadata: row.metadata,
    last_seen_at: row.last_seen_at,
    payload: raw,
    status: "pending",
    first_seen_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("events_staging")
    .select("id")
    .eq("source", row.source)
    .eq("source_id", row.source_id)
    .maybeSingle();

  const { error } = await supabase
    .from("events_staging")
    .upsert(staging, { onConflict: "source,source_id" });

  if (error) throw new Error(`staging upsert: ${error.message}`);
  return existing ? "updated" : "inserted";
}

async function runSource(
  supabase: SupabaseClient,
  source: SourceAdapter,
  mode: IngestMode,
  options: IngestOptions,
): Promise<IngestSummary> {
  const summary: IngestSummary = {
    mode,
    source: source.id,
    fetched: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    status: "ok",
  };

  let runId: number | null = null;
  if (!options.dryRun) {
    const { data } = await supabase
      .from("ingestion_runs")
      .insert({ source: source.id, mode, status: "running" })
      .select("id")
      .single();
    runId = data?.id ?? null;
  }

  const budget: GeocodeBudget = {
    remaining: options.geocodeLimit ?? 40,
  };

  try {
    const fetched = await source.fetch();
    summary.fetched = fetched.length;
    const limit = options.limitPerSource ?? fetched.length;

    for (const raw of fetched.slice(0, limit)) {
      const prepared = await buildWriteRow(supabase, raw, source, budget);
      if (!prepared) {
        summary.skipped += 1;
        continue;
      }

      if (options.dryRun) {
        summary.skipped += 1;
        continue;
      }

      try {
        const result =
          mode === "safe"
            ? await upsertEvent(supabase, prepared.row, prepared.raw)
            : await insertStaging(supabase, prepared.row, prepared.raw);

        if (result === "inserted") summary.inserted += 1;
        else summary.updated += 1;
      } catch (error) {
        summary.errors += 1;
        console.error(
          `[ingest:${mode}] ${source.id} item error`,
          error instanceof Error ? error.message : error,
        );
      }
    }
  } catch (error) {
    summary.status = "error";
    summary.message = error instanceof Error ? error.message : String(error);
    console.error(`[ingest:${mode}] ${source.id} failed`, summary.message);
  } finally {
    if (runId && !options.dryRun) {
      await supabase
        .from("ingestion_runs")
        .update({
          status: summary.status,
          fetched: summary.fetched,
          inserted: summary.inserted,
          updated: summary.updated,
          skipped: summary.skipped,
          error: summary.message ?? null,
          finished_at: new Date().toISOString(),
        })
        .eq("id", runId);
    }
  }

  return summary;
}

export async function runIngestion(
  options: IngestOptions,
): Promise<IngestSummary[]> {
  const supabase = createSupabaseAdminClient();
  const sources = options.sourceIds?.length
    ? options.sourceIds
        .map((id) => findSource(id))
        .filter((source): source is SourceAdapter => Boolean(source))
    : getSources(options.mode);

  if (sources.length === 0) {
    throw new Error("No hay fuentes para ejecutar");
  }

  const summaries: IngestSummary[] = [];

  for (const source of sources) {
    if (options.mode === "safe" && !source.allowedInProd) {
      console.warn(`[ingest:safe] saltando ${source.id}: no permitida en prod`);
      continue;
    }

    console.log(`\n[ingest:${options.mode}] → ${source.id} (${source.name})`);
    const summary = await runSource(supabase, source, options.mode, options);
    summaries.push(summary);
    console.log(
      `[ingest:${options.mode}] ← ${source.id}: ${summary.inserted} nuevos, ${summary.updated} actualizados, ${summary.skipped} saltados, ${summary.errors} errores`,
    );

    // Respetar rate limits entre fuentes.
    await new Promise((resolve) =>
      setTimeout(resolve, Math.max(source.rateLimitMs, 250)),
    );
  }

  return summaries;
}
