import { connection } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  await connection();
  const startedAt = Date.now();
  const env = {
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabaseServiceKey: Boolean(process.env.SUPABASE_SERVICE_KEY),
    ticketmaster: Boolean(process.env.TICKETMASTER_API_KEY),
    eventbrite: Boolean(process.env.EVENTBRITE_TOKEN),
    vapidPublic: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
    vapidPrivate: Boolean(process.env.VAPID_PRIVATE_KEY),
    cronSecret: Boolean(process.env.CRON_SECRET),
  };

  try {
    const admin = createSupabaseAdminClient();
    // No usar `head: true`: PostgREST devuelve 204 sin error aunque la tabla
    // no exista, lo que daría un falso positivo de salud.
    const { count, error } = await admin
      .from("events")
      .select("id", { count: "exact" })
      .eq("status", "active")
      .limit(1);

    if (error) {
      return Response.json(
        {
          ok: false,
          database: {
            connected: false,
            code: error.code,
            message: error.message,
          },
          env,
          latencyMs: Date.now() - startedAt,
        },
        { status: 503 },
      );
    }

    return Response.json({
      ok: true,
      database: { connected: true, activeEvents: count ?? 0 },
      env,
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        database: {
          connected: false,
          message: error instanceof Error ? error.message : "Error desconocido",
        },
        env,
        latencyMs: Date.now() - startedAt,
      },
      { status: 503 },
    );
  }
}
