import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

async function main() {
  const { createSupabaseAdminClient } = await import(
    "../src/lib/supabase/admin"
  );

  const supabase = createSupabaseAdminClient();
  const now = Date.now();
  const days = (value: number) =>
    new Date(now - value * 24 * 60 * 60 * 1000).toISOString();

  const operations = [
    {
      name: "eventos vencidos",
      run: () =>
        supabase
          .from("events")
          .delete({ count: "exact" })
          .lt("starts_at", days(7)),
    },
    {
      name: "staging viejo",
      run: () =>
        supabase
          .from("events_staging")
          .delete({ count: "exact" })
          .lt("first_seen_at", days(30)),
    },
    {
      name: "notification_log",
      run: () =>
        supabase
          .from("notification_log")
          .delete({ count: "exact" })
          .lt("sent_at", days(180)),
    },
    {
      name: "geocode_cache",
      run: () =>
        supabase
          .from("geocode_cache")
          .delete({ count: "exact" })
          .lt("updated_at", days(365)),
    },
    {
      name: "ingestion_runs",
      run: () =>
        supabase
          .from("ingestion_runs")
          .delete({ count: "exact" })
          .lt("started_at", days(90)),
    },
  ];

  for (const operation of operations) {
    const { error, count } = await operation.run();
    if (error) {
      console.error(`${operation.name}: ${error.message}`);
    } else {
      console.log(`${operation.name}: ${count ?? 0} borrados`);
    }
  }
}

void main();
