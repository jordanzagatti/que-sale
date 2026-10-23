import type { NextRequest } from "next/server";
import { z } from "zod";

import { isAllowedPushEndpoint } from "@/lib/push";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const subscribeSchema = z.object({
  subscription: z.object({
    endpoint: z
      .string()
      .url()
      .max(2000)
      .refine(isAllowedPushEndpoint, "Endpoint de push inválido"),
    keys: z.object({
      p256dh: z.string().min(10).max(500),
      auth: z.string().min(5).max(500),
    }),
  }),
  userAgent: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Necesitás iniciar sesión" }, { status: 401 });
  }

  const parsed = subscribeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Suscripción inválida" }, { status: 400 });
  }

  const { subscription, userAgent } = parsed.data;
  const admin = createSupabaseAdminClient();

  // Un mismo dispositivo puede haber quedado asociado a una sesión anónima
  // anterior. Reasignamos el endpoint al usuario actual.
  await admin
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", subscription.endpoint);

  const { error } = await admin.from("push_subscriptions").insert({
    user_id: user.id,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    user_agent: userAgent ?? request.headers.get("user-agent"),
  });

  if (error) {
    return Response.json(
      { error: "No pudimos guardar la suscripción" },
      { status: 500 },
    );
  }

  return Response.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Necesitás iniciar sesión" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { endpoint?: string }
    | null;

  if (!body?.endpoint) {
    return Response.json({ error: "Falta endpoint" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  await admin
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", body.endpoint)
    .eq("user_id", user.id);

  return Response.json({ ok: true });
}
