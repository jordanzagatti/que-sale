import type { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";

export async function POST(request: NextRequest) {
  const secret =
    process.env.REVALIDATE_SECRET ?? process.env.CRON_SECRET ?? null;
  const authorization = request.headers.get("authorization");

  if (!secret || authorization !== `Bearer ${secret}`) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  revalidateTag("events", "max");
  return Response.json({ ok: true, revalidated: "events" });
}
