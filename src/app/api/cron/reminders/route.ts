import type { NextRequest } from "next/server";
import webpush from "web-push";

import { isAllowedPushEndpoint } from "@/lib/push";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type EventRow = {
  id: string;
  title: string;
  slug: string | null;
  starts_at: string;
  venue_name: string | null;
  city: string | null;
};

type AttendanceRow = {
  user_id: string;
  event_id: string;
  events: EventRow | EventRow[] | null;
};

type SubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function eventFromRelation(row: AttendanceRow): EventRow | null {
  if (!row.events) return null;
  return Array.isArray(row.events) ? (row.events[0] ?? null) : row.events;
}

function formatStart(value: string) {
  try {
    return new Intl.DateTimeFormat("es-AR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Argentina/Buenos_Aires",
    })
      .format(new Date(value))
      .replace(/\./g, "");
  } catch {
    return value;
  }
}

function isInvalidSubscription(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const statusCode = (error as { statusCode?: number }).statusCode;
  return statusCode === 404 || statusCode === 410;
}

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  return runReminders(request);
}

export async function POST(request: NextRequest) {
  return runReminders(request);
}

async function runReminders(request: NextRequest) {
  if (!authorized(request)) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    return Response.json(
      { error: "Faltan las claves VAPID" },
      { status: 503 },
    );
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:hola@quesale.ar",
    publicKey,
    privateKey,
  );

  const admin = createSupabaseAdminClient();
  const now = Date.now();
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.APP_URL ??
    "https://quesale.ar";

  const windows = [
    {
      kind: "24h" as const,
      from: new Date(now + 23.5 * 60 * 60 * 1000).toISOString(),
      to: new Date(now + 24.5 * 60 * 60 * 1000).toISOString(),
      title: (title: string) => `Mañana: ${title}`,
    },
    {
      kind: "2h" as const,
      from: new Date(now + 1.5 * 60 * 60 * 1000).toISOString(),
      to: new Date(now + 2.5 * 60 * 60 * 1000).toISOString(),
      title: (title: string) => `En 2 horas: ${title}`,
    },
  ];

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const invalidEndpoints: string[] = [];

  for (const window of windows) {
    const { data: attendance, error } = await admin
      .from("attendance")
      .select(
        "user_id, event_id, events!inner(id, title, slug, starts_at, venue_name, city)",
      )
      .eq("status", "going")
      .gte("events.starts_at", window.from)
      .lte("events.starts_at", window.to);

    if (error) {
      failed += 1;
      continue;
    }

    const rows = (attendance ?? []) as unknown as AttendanceRow[];
    if (rows.length === 0) continue;

    const { data: existingLogs } = await admin
      .from("notification_log")
      .select("user_id, event_id")
      .eq("kind", window.kind)
      .in("event_id", [...new Set(rows.map((row) => row.event_id))]);

    const alreadySent = new Set(
      (existingLogs ?? []).map(
        (log: { user_id: string; event_id: string }) =>
          `${log.user_id}:${log.event_id}`,
      ),
    );

    const userIds = [...new Set(rows.map((row) => row.user_id))];
    const { data: subscriptionData } = await admin
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .in("user_id", userIds);

    const subscriptions = (subscriptionData ?? []) as unknown as SubscriptionRow[];
    const byUser = new Map<string, SubscriptionRow[]>();

    for (const subscription of subscriptions) {
      const list = byUser.get(subscription.user_id) ?? [];
      list.push(subscription);
      byUser.set(subscription.user_id, list);
    }

    for (const row of rows) {
      if (alreadySent.has(`${row.user_id}:${row.event_id}`)) {
        skipped += 1;
        continue;
      }

      const event = eventFromRelation(row);
      if (!event) {
        skipped += 1;
        continue;
      }

      const userSubscriptions = byUser.get(row.user_id) ?? [];
      if (userSubscriptions.length === 0) {
        skipped += 1;
        continue;
      }

      const eventUrl = event.slug
        ? `${baseUrl}/eventos/${event.slug}`
        : `${baseUrl}/mapa`;
      const dateText = formatStart(event.starts_at);
      const body =
        window.kind === "24h"
          ? `${dateText} · ${event.venue_name ?? event.city ?? "Argentina"}`
          : `Hoy ${dateText} · ${event.venue_name ?? event.city ?? "Argentina"}`;

      const payload = JSON.stringify({
        title: window.title(event.title),
        body,
        icon: "/icons/icon-192.png",
        badge: "/icons/badge-72.png",
        tag: `event-${event.id}-${window.kind}`,
        data: { url: eventUrl },
      });

      let delivered = 0;

      for (const subscription of userSubscriptions) {
        if (!isAllowedPushEndpoint(subscription.endpoint)) {
          invalidEndpoints.push(subscription.endpoint);
          skipped += 1;
          continue;
        }

        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            payload,
            { TTL: 60 * 60 * 6 },
          );
          delivered += 1;
          sent += 1;
        } catch (error) {
          failed += 1;
          if (isInvalidSubscription(error)) {
            invalidEndpoints.push(subscription.endpoint);
          }
        }
      }

      if (delivered > 0) {
        const { error: logError } = await admin
          .from("notification_log")
          .insert({
            user_id: row.user_id,
            event_id: event.id,
            kind: window.kind,
            metadata: {
              delivered,
              subscriptions: userSubscriptions.length,
            },
          });

        // 23505 = ya enviamos este recordatorio en una corrida anterior.
        if (logError && logError.code !== "23505") {
          failed += 1;
        }
      }
    }
  }

  if (invalidEndpoints.length > 0) {
    await admin
      .from("push_subscriptions")
      .delete()
      .in("endpoint", [...new Set(invalidEndpoints)]);
  }

  return Response.json({ ok: true, sent, failed, skipped });
}
