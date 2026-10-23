import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";

import { AttendButton } from "@/components/AttendButton";
import { AttendeesModalClient } from "@/components/AttendeesModalClient";
import { FollowButtons } from "@/components/FollowButtons";
import { ShareButton } from "@/components/ShareButton";
import { SiteHeader } from "@/components/SiteHeader";
import { categoryImage } from "@/lib/categories";
import { getEventBySlug, getRelatedOccurrences } from "@/lib/events";
import { getEventosLive } from "@/lib/getEventos";
import type { NormalizedEvent } from "@/lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SOURCE_LABELS: Record<string, string> = {
  ticketmaster: "Ticketmaster",
  gcba: "Agenda GCBA",
  eventbrite: "Eventbrite",
  passline: "Passline",
  cultura: "Cultura Argentina",
  alternativa: "Alternativa Teatral",
  ticketek: "Ticketek",
  timeout: "Time Out",
  plateanet: "Plateanet",
  meetup: "Meetup",
  jsonld: "Fuente pública",
  manual: "¿Qué Sale?",
  unknown: "Fuente pública",
};

function eventDate(event: NormalizedEvent): Date {
  return new Date(event.startsAt ?? `${event.fecha}T12:00:00-03:00`);
}

function formatLongDate(event: NormalizedEvent) {
  const date = eventDate(event);
  if (Number.isNaN(date.getTime())) return event.fecha;

  const formatted = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(date);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatTime(event: NormalizedEvent) {
  if (event.hora) return event.hora;
  const date = eventDate(event);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(date);
}

const loadEvent = cache(async (slug: string) => {
  try {
    // Si la DB responde, esa es la fuente de verdad. Un evento inexistente
    // devuelve null y no dispara scraping en el request.
    return await getEventBySlug(slug);
  } catch {
    // DB no disponible: probamos las fuentes live mientras se configura.
  }

  try {
    const live = await getEventosLive();
    return (
      live.find(
        (event) => event.slug === slug || event.id === slug,
      ) ?? null
    );
  } catch {
    return null;
  }
});

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { slug } = await params;
  const query = await searchParams;
  const token = typeof query.t === "string" ? query.t : null;
  const event = await loadEvent(slug);

  if (!event) {
    notFound();
  }

  const isPrivate = (event as any).is_private === true;
  const shareToken = (event as any).share_token ?? null;
  const canView = !isPrivate || token === shareToken;
  if (isPrivate && !canView) {
    notFound();
  }

  return {
    title: event.titulo,
    description:
      event.descripcion?.slice(0, 160) ??
      `${event.titulo} en ${event.lugar}, ${event.ciudad ?? "Argentina"}. ${formatLongDate(
        event,
      )}.`,
    alternates: { canonical: `/eventos/${slug}` },
    robots: isPrivate ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title: event.titulo,
      description: event.descripcion?.slice(0, 200) ?? undefined,
      images: event.imagen ? [{ url: event.imagen }] : undefined,
      type: "website",
      url: `/eventos/${slug}`,
    },
  };
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-white/5 py-4 last:border-0">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </span>
      <div className="text-sm text-zinc-200">{children}</div>
    </div>
  );
}

function EventSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="border-b border-white/5">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <span className="h-8 w-28 animate-pulse rounded-xl bg-white/5" />
          <span className="h-8 w-20 animate-pulse rounded-full bg-white/5" />
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <div>
            <div className="aspect-[16/10] animate-pulse rounded-3xl bg-white/5" />
            <div className="mt-7 h-4 w-40 animate-pulse rounded-full bg-white/5" />
            <div className="mt-3 h-10 w-3/4 animate-pulse rounded-xl bg-white/5" />
            <div className="mt-3 h-4 w-1/2 animate-pulse rounded-full bg-white/5" />
            <div className="mt-7 h-11 w-64 animate-pulse rounded-full bg-white/5" />
          </div>
          <div className="h-80 animate-pulse rounded-3xl bg-white/5" />
        </div>
      </div>
    </div>
  );
}

export default function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<EventSkeleton />}>
      <EventDetails params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function EventDetails({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const token = typeof query.t === "string" ? query.t : null;
  const event = await loadEvent(slug);

  if (!event) notFound();

  const eventRow = event as unknown as Record<string, unknown>;
  const isPrivate = eventRow.is_private === true;
  const shareTokenRow = (eventRow.share_token as string) ?? null;
  if (isPrivate && token !== shareTokenRow) {
    notFound();
  }

  const isDbEvent = UUID_RE.test(event.id);

  const related = event.seriesId
    ? await getRelatedOccurrences(event.seriesId, event.id)
    : [];

  const image = event.imagen || categoryImage(event.categoria);
  const time = formatTime(event);
  const sourceLabel = SOURCE_LABELS[event.fuente ?? "unknown"] ?? "Fuente pública";
  const mapHref =
    typeof event.lat === "number" && typeof event.lng === "number"
      ? `/mapa?lat=${event.lat}&lng=${event.lng}&event=${encodeURIComponent(
          event.slug ?? event.id,
        )}`
      : "/mapa";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.titulo,
    startDate: event.startsAt ?? event.fecha,
    endDate: event.endsAt,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    description: event.descripcion,
    image: [image],
    url: event.urlFuente,
    location: {
      "@type": "Place",
      name: event.lugar,
      address: {
        "@type": "PostalAddress",
        addressLocality: event.ciudad ?? event.barrio,
        addressRegion: event.provincia,
        addressCountry: "AR",
        streetAddress: event.lugar,
      },
      geo:
        typeof event.lat === "number" && typeof event.lng === "number"
          ? {
              "@type": "GeoCoordinates",
              latitude: event.lat,
              longitude: event.lng,
            }
          : undefined,
    },
    offers: {
      "@type": "Offer",
      price: event.esGratis ? 0 : undefined,
      priceCurrency: "ARS",
      url: event.urlEntrada ?? event.urlFuente,
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <SiteHeader active="eventos" />

      <main className="mx-auto max-w-6xl px-5 pb-24 pt-8 sm:px-6">
        <nav className="flex items-center gap-2 text-xs text-zinc-500">
          <Link href="/" className="transition hover:text-white">
            Eventos
          </Link>
          <span>/</span>
          <span className="truncate text-zinc-400">{event.categoria}</span>
        </nav>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <div>
            <div className="relative aspect-[16/10] overflow-hidden rounded-3xl border border-white/10 bg-zinc-900">
              {/* eslint-disable-next-line @next/next/no-img-element -- imágenes de terceros sin optimizar por el plan free */}
              <img
                src={image}
                alt={event.titulo}
                className="h-full w-full object-cover"
                loading="eager"
                decoding="async"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950/60 via-transparent to-transparent" />
              <span className="absolute left-5 top-5 rounded-full border border-white/15 bg-zinc-950/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                {event.categoria}
              </span>
            </div>

            <div className="mt-7">
              <p className="text-sm font-medium text-violet-300">
                {formatLongDate(event)}
                {time ? ` · ${time} hs` : ""}
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {event.titulo}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-400">
                <span className="inline-flex items-center gap-2">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 text-violet-400/80"
                  >
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span className="text-zinc-200">{event.lugar}</span>
                  <span className="text-zinc-600">·</span>
                  <span>{event.ciudad ?? event.barrio}</span>
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                  {event.precio}
                </span>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                {isDbEvent ? <AttendButton eventId={event.id} /> : null}
                <ShareButton title={event.titulo} shareToken={shareTokenRow} isPrivate={isPrivate} />
                <a
                  href={`/api/eventos/${encodeURIComponent(
                    event.slug ?? event.id,
                  )}/ics`}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 text-sm font-medium text-zinc-200 transition hover:border-violet-400/40 hover:text-white"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="3" />
                    <path d="M16 2v4M8 2v4M3 10h18M12 14v4M10 16h4" />
                  </svg>
                  Agendar
                </a>
                {(event.urlEntrada || (eventRow.ticket_url as string | null)) ? (
                  <a
                    href={(event.urlEntrada || (eventRow.ticket_url as string)) as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
                  >
                    Comprar entradas
                    <span aria-hidden="true">↗</span>
                  </a>
                ) : null}
              </div>

              <div className="mt-7">
                <FollowButtons event={event} />
              </div>

              {event.descripcion ? (
                <section className="mt-9 border-t border-white/5 pt-7">
                  <h2 className="text-lg font-semibold text-white">Sobre el evento</h2>
                  <div className="mt-3 space-y-3 text-sm leading-7 text-zinc-400">
                    {event.descripcion.split(/\n+/).slice(0, 8).map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>
                </section>
              ) : null}

              {related.length > 0 ? (
                <section className="mt-9 border-t border-white/5 pt-7">
                  <h2 className="text-lg font-semibold text-white">Otras funciones</h2>
                  <div className="mt-4 divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/[0.02]">
                    {related.map((item) => (
                      <Link
                        key={item.id}
                        href={`/eventos/${item.slug ?? item.id}`}
                        className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition hover:bg-white/5"
                      >
                        <span className="text-zinc-300">{formatLongDate(item)}</span>
                        <span className="text-zinc-500">{item.hora ?? ""}</span>
                        <span className="text-violet-300">Ver →</span>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </div>

          <aside className="h-fit rounded-3xl border border-white/10 bg-zinc-900/50 p-5 backdrop-blur lg:sticky lg:top-24">
            <h2 className="text-sm font-semibold text-white">Datos del evento</h2>
            <div className="mt-2">
              <InfoRow label="Cuándo">
                <div>{formatLongDate(event)}</div>
                {time ? <div className="text-zinc-400">{time} hs</div> : null}
              </InfoRow>
              <InfoRow label="Dónde">
                <div>{event.lugar}</div>
                <div className="text-zinc-400">
                  {event.barrio}
                  {event.ciudad && event.ciudad !== event.barrio
                    ? `, ${event.ciudad}`
                    : ""}
                </div>
                <Link
                  href={mapHref}
                  className="mt-2 inline-flex text-xs font-medium text-violet-300 hover:text-violet-200"
                >
                  Ver en el mapa →
                </Link>
              </InfoRow>
              <InfoRow label="Entrada">{event.precio}</InfoRow>
              <InfoRow label="Asistencia">
                <div>
                  <p className="text-zinc-400">Solo el creador puede ver quién va.</p>
                  <AttendeesModalClient eventId={event.id} createdBy={(eventRow.created_by as string) ?? null} />
                </div>
              </InfoRow>
              <InfoRow label="Fuente">
                {event.urlFuente ? (
                  <a
                    href={event.urlFuente}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-300 hover:text-violet-200"
                  >
                    {sourceLabel} ↗
                  </a>
                ) : (
                  sourceLabel
                )}
                <p className="mt-2 text-[11px] leading-5 text-zinc-500">
                  Los datos son de la fuente original. Confirmá horarios y precios
                  antes de comprar.
                </p>
              </InfoRow>
            </div>
          </aside>
        </div>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}
