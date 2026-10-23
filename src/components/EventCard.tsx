"use client";

import Link from "next/link";

import { AttendButton } from "@/components/AttendButton";
import { categoryImage } from "@/lib/categories";
import type { EventCategory, NormalizedEvent } from "@/lib/types";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const categoryStyles: Record<EventCategory, string> = {
  Música:
    "border-violet-300/30 bg-violet-500/90 text-white shadow-violet-500/20",
  Teatro:
    "border-amber-200/40 bg-amber-300/90 text-zinc-950 shadow-amber-400/20",
  Fiesta:
    "border-fuchsia-300/30 bg-fuchsia-500/90 text-white shadow-fuchsia-500/20",
  Arte: "border-rose-200/30 bg-rose-400/90 text-zinc-950 shadow-rose-400/20",
  Cine: "border-sky-200/30 bg-sky-400/90 text-zinc-950 shadow-sky-400/20",
  Deportes:
    "border-emerald-200/30 bg-emerald-400/90 text-zinc-950 shadow-emerald-400/20",
  Gastronomía:
    "border-orange-200/30 bg-orange-400/90 text-zinc-950 shadow-orange-400/20",
  Ferias:
    "border-lime-200/30 bg-lime-300/90 text-zinc-950 shadow-lime-400/20",
  Talleres:
    "border-cyan-200/30 bg-cyan-400/90 text-zinc-950 shadow-cyan-400/20",
  Infantil:
    "border-pink-200/30 bg-pink-300/90 text-zinc-950 shadow-pink-400/20",
  Tech: "border-indigo-200/30 bg-indigo-400/90 text-zinc-950 shadow-indigo-400/20",
  Comunidad:
    "border-teal-200/30 bg-teal-400/90 text-zinc-950 shadow-teal-400/20",
  Otros: "border-white/20 bg-zinc-700/90 text-white shadow-black/20",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_RE.test(value);
}

function parseEventDate(value: string) {
  if (!value) return new Date();
  const date = new Date(`${value}T12:00:00-03:00`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function formatEventDate(event: NormalizedEvent) {
  try {
    const formatted = dateFormatter.format(parseEventDate(event.fecha));
    const clean = formatted.replace(/\./g, "");
    const capitalized = clean.charAt(0).toUpperCase() + clean.slice(1);
    return event.hora ? `${capitalized} · ${event.hora}` : capitalized;
  } catch {
    return event.fecha;
  }
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="m12 2.6 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9L12 2.6Z" />
    </svg>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function EventCard({
  event,
  index = 0,
}: {
  event: NormalizedEvent;
  index?: number;
}) {
  const internalHref = event.slug ? `/eventos/${event.slug}` : null;
  const externalHref = event.urlEntrada ?? event.urlFuente ?? null;
  const href = internalHref ?? externalHref;
  const canAttend = Boolean(event.slug) && isUuid(event.id);

  const image = (
    // eslint-disable-next-line @next/next/no-img-element -- Vercel Hobby limita las transformaciones de imagen.
    <img
      src={event.imagen || categoryImage(event.categoria)}
      alt={event.titulo}
      loading={index < 2 ? "eager" : "lazy"}
      decoding="async"
      onError={(error) => {
        const fallback = categoryImage(event.categoria);
        if (error.currentTarget.src !== fallback) {
          error.currentTarget.src = fallback;
        }
      }}
      className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-110"
    />
  );

  const title = (
    <h3 className="text-lg font-semibold tracking-tight text-white transition-colors group-hover:text-violet-300">
      {event.titulo}
    </h3>
  );

  return (
    <article
      className="group relative flex animate-fade-up flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/60 shadow-xl shadow-black/30 backdrop-blur transition duration-300 ease-out hover:-translate-y-1 hover:border-violet-400/30 hover:shadow-2xl hover:shadow-violet-500/10"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <div className="relative aspect-video overflow-hidden bg-zinc-800">
        {href ? (
          <Link
            href={href}
            target={!internalHref ? "_blank" : undefined}
            rel={!internalHref ? "noopener noreferrer" : undefined}
            aria-label={event.titulo}
            className="absolute inset-0 z-0"
          >
            {image}
          </Link>
        ) : (
          image
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950/70 via-transparent to-transparent" />

        <span
          className={`pointer-events-none absolute left-4 top-4 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide shadow-lg backdrop-blur-md ${categoryStyles[event.categoria]}`}
        >
          {event.categoria}
        </span>

        {event.destacado ? (
          <span className="pointer-events-none absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-zinc-950/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200 backdrop-blur-md">
            <StarIcon className="h-3 w-3" />
            Destacado
          </span>
        ) : null}

        {typeof event.distanciaM === "number" ? (
          <span className="pointer-events-none absolute bottom-3 left-4 rounded-full bg-zinc-950/75 px-2.5 py-1 text-[10px] font-medium text-zinc-200 backdrop-blur">
            A {(event.distanciaM / 1000).toFixed(1)} km
          </span>
        ) : null}
      </div>

      <div className="relative flex flex-1 flex-col gap-3.5 p-5">
        {href ? (
          <Link
            href={href}
            target={!internalHref ? "_blank" : undefined}
            rel={!internalHref ? "noopener noreferrer" : undefined}
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          >
            {title}
          </Link>
        ) : (
          title
        )}

        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <CalendarIcon className="h-4 w-4 shrink-0 text-violet-400/70" />
          <span>{formatEventDate(event)}</span>
        </div>

        <div className="flex items-start gap-2 text-sm text-zinc-400">
          <PinIcon className="mt-0.5 h-4 w-4 shrink-0 text-violet-400/70" />
          <span className="line-clamp-2 leading-relaxed">
            <span className="font-medium text-zinc-200">{event.barrio}</span>
            <span className="text-zinc-600"> · </span>
            {event.lugar}
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/5 pt-4">
          <div className="min-w-0">
            <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
              Entrada
            </span>
            <span className="block truncate text-base font-semibold text-violet-300">
              {event.precio}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {canAttend ? (
              <AttendButton eventId={event.id} compact />
            ) : externalHref ? (
              <a
                href={externalHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-zinc-200 transition hover:border-violet-400/40 hover:text-white"
              >
                Más info
                <ArrowIcon className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
