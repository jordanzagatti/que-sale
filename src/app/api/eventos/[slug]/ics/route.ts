import { getEventBySlug } from "@/lib/events";
import { getEventosLive } from "@/lib/getEventos";
import type { NormalizedEvent } from "@/lib/types";

function icsDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function escapeIcs(value: string | undefined | null): string {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

async function loadEvent(slug: string): Promise<NormalizedEvent | null> {
  try {
    // Si la DB responde, un evento inexistente es 404 y no consultamos fuentes.
    return await getEventBySlug(slug);
  } catch {
    // DB no disponible: seguimos con fuentes live.
  }

  try {
    const live = await getEventosLive();
    return live.find((event) => event.slug === slug || event.id === slug) ?? null;
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const event = await loadEvent(slug);

  if (!event) {
    return new Response("Evento no encontrado", { status: 404 });
  }

  const start = event.startsAt
    ? new Date(event.startsAt)
    : new Date(`${event.fecha}T${event.hora ?? "12:00"}:00-03:00`);
  const end = event.endsAt
    ? new Date(event.endsAt)
    : new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const location = [event.lugar, event.barrio, event.ciudad, event.provincia]
    .filter(Boolean)
    .join(", ");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Que Sale//Agenda Argentina//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcs(event.id)}@quesale`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${escapeIcs(event.titulo)}`,
    `DESCRIPTION:${escapeIcs(
      [event.descripcion, event.urlFuente].filter(Boolean).join("\n\n").slice(0, 1800),
    )}`,
    `LOCATION:${escapeIcs(location)}`,
    event.urlFuente ? `URL:${escapeIcs(event.urlFuente)}` : null,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((line): line is string => Boolean(line));

  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug ?? "evento"}.ics"`,
      "Cache-Control": "public, s-maxage=3600",
    },
  });
}
