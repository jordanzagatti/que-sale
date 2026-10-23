import Image from "next/image";

import type { EventCategory, NormalizedEvent } from "@/lib/types";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const categoryStyles: Record<EventCategory, string> = {
  Fiesta:
    "border-fuchsia-300/30 bg-fuchsia-500/90 text-white shadow-fuchsia-500/20",
  Recital:
    "border-violet-300/30 bg-violet-500/90 text-white shadow-violet-500/20",
  Teatro:
    "border-amber-200/40 bg-amber-300/90 text-zinc-950 shadow-amber-400/20",
};

function parseEventDate(value: string) {
  if (!value) {
    return new Date();
  }

  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}

function formatEventDate(value: string) {
  try {
    const formatted = dateFormatter.format(parseEventDate(value));
    if (!formatted) {
      return value;
    }
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch {
    return value;
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
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="m12 2.6 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9L12 2.6Z" />
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
  return (
    <article
      className="group relative flex animate-fade-up flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/60 shadow-xl shadow-black/30 backdrop-blur transition duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:border-violet-400/30 hover:shadow-2xl hover:shadow-violet-500/10"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="relative aspect-video overflow-hidden bg-zinc-800">
        <Image
          src={event.imagen}
          alt={event.titulo}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          priority={index === 0}
          loading={index === 0 ? "eager" : "lazy"}
          className="object-cover transition duration-700 ease-out group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 via-transparent to-transparent" />

        <span
          className={`absolute left-4 top-4 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide shadow-lg backdrop-blur-md ${categoryStyles[event.categoria]}`}
        >
          {event.categoria}
        </span>

        {event.destacado ? (
          <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-zinc-950/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200 backdrop-blur-md">
            <StarIcon className="h-3 w-3" />
            Destacado
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3.5 p-5">
        <h3 className="text-lg font-semibold tracking-tight text-white transition-colors group-hover:text-violet-300">
          {event.titulo}
        </h3>

        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <CalendarIcon className="h-4 w-4 shrink-0 text-violet-400/70" />
          <span>{formatEventDate(event.fecha)}</span>
        </div>

        <div className="flex items-start gap-2 text-sm text-zinc-400">
          <PinIcon className="mt-0.5 h-4 w-4 shrink-0 text-violet-400/70" />
          <span className="leading-relaxed">
            <span className="font-medium text-zinc-200">{event.barrio}</span>
            <span className="text-zinc-600"> · </span>
            {event.lugar}
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/5 pt-4">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            Entrada
          </span>
          <span className="text-base font-semibold text-violet-300">
            {event.precio}
          </span>
        </div>
      </div>
    </article>
  );
}
