import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

const args = process.argv.slice(2);
const limit =
  Number(args.find((value) => value.startsWith("--limit="))?.split("=")[1]) ||
  100;
const source = args
  .find((value) => value.startsWith("--source="))
  ?.split("=")[1];

async function main() {
  const { createSupabaseAdminClient } = await import(
    "../src/lib/supabase/admin"
  );

  const supabase = createSupabaseAdminClient();

  let query = supabase
    .from("events_staging")
    .select("*")
    .eq("status", "pending")
    .gte("starts_at", new Date().toISOString())
    .order("first_seen_at", { ascending: true })
    .limit(limit);

  if (source) query = query.eq("source", source);

  const { data, error } = await query;

  if (error) {
    console.error("No se pudo leer staging:", error.message);
    process.exit(1);
  }

  let promoted = 0;
  let skipped = 0;

  for (const item of data ?? []) {
    const row = {
      series_id: item.series_id,
      slug: item.slug,
      title: item.title,
      normalized_title: item.normalized_title,
      description: item.description,
      category: item.category,
      starts_at: item.starts_at,
      ends_at: item.ends_at,
      all_day: item.all_day,
      venue_name: item.venue_name,
      address: item.address,
      neighborhood: item.neighborhood,
      city: item.city,
      province: item.province,
      city_code: item.city_code,
      latitude: item.latitude,
      longitude: item.longitude,
      location_precision: item.location_precision,
      price_text: item.price_text,
      price_min: item.price_min,
      currency: item.currency,
      is_free: item.is_free,
      image_url: item.image_url,
      source: item.source,
      source_id: item.source_id,
      source_url: item.source_url,
      ticket_url: item.ticket_url,
      organizer: item.organizer,
      fingerprint: item.fingerprint,
      status: "active",
      featured: false,
      tags: [item.category, item.city].filter(Boolean),
      metadata: { ...(item.metadata ?? {}), promoted_from_staging: item.id },
      last_seen_at: new Date().toISOString(),
    };

    try {
      const { data: event, error: upsertError } = await supabase
        .from("events")
        .upsert(row, { onConflict: "fingerprint" })
        .select("id")
        .single();

      if (upsertError) throw upsertError;

      await supabase.from("event_sources").upsert(
        {
          event_id: event.id,
          source: item.source,
          source_id: item.source_id,
          source_url: item.source_url,
          raw: item.payload,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "source,source_id" },
      );

      await supabase
        .from("events_staging")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      promoted += 1;
    } catch (error) {
      skipped += 1;
      console.error(
        `No se pudo promover ${item.id}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  console.log(`Promovidos: ${promoted}. Saltados: ${skipped}.`);
}

void main();
