import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

const args = process.argv.slice(2);
const limit =
  Number(args.find((value) => value.startsWith("--limit="))?.split("=")[1]) ||
  50;

async function main() {
  const { createSupabaseAdminClient } = await import(
    "../src/lib/supabase/admin"
  );
  const { geocodeAddress } = await import("../src/lib/geo/georef");

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("events")
    .select("id, title, address, city, province, latitude, longitude")
    .gte("starts_at", new Date().toISOString())
    .not("address", "is", null)
    .neq("address", "")
    .is("latitude", null)
    .limit(limit);

  if (error) {
    console.error("No se pudieron leer eventos:", error.message);
    process.exit(1);
  }

  let updated = 0;

  for (const event of data ?? []) {
    const result = await geocodeAddress(
      event.address,
      event.city,
      event.province,
    );

    if (!result) {
      console.warn(`Sin resultado: ${event.title}`);
      continue;
    }

    const { error: updateError } = await supabase
      .from("events")
      .update({
        latitude: result.lat,
        longitude: result.lng,
        location_precision: "street",
      })
      .eq("id", event.id);

    if (updateError) {
      console.error(`Update falló ${event.id}: ${updateError.message}`);
      continue;
    }

    updated += 1;
    await new Promise((resolve) => setTimeout(resolve, 1100));
  }

  console.log(`Geocodificados: ${updated}.`);
}

void main();
