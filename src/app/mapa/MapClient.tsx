"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { EventCategory, NormalizedEvent } from "@/lib/types";
import { EVENT_CATEGORIES } from "@/lib/types";

const MapCanvas = dynamic(() => import("./MapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-zinc-900">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-violet-400" />
    </div>
  ),
});

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function shortDate(event: NormalizedEvent) {
  try {
    const date = new Date(`${event.fecha}T12:00:00-03:00`);
    return new Intl.DateTimeFormat("es-AR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
      .format(date)
      .replace(/\./g, "");
  } catch {
    return event.fecha;
  }
}

export function MapClient({
  events: initialEvents,
}: {
  events: NormalizedEvent[];
}) {
  const [events, setEvents] = useState(initialEvents);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<EventCategory | "Todos">("Todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [initialCenter, setInitialCenter] = useState<[number, number] | undefined>();
  const [initialZoom, setInitialZoom] = useState(11);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const lat = Number(params.get("lat"));
      const lng = Number(params.get("lng"));
      const slug = params.get("event");

      if (params.has("lat") && Number.isFinite(lat) && Number.isFinite(lng)) {
        setInitialCenter([lng, lat]);
        setInitialZoom(14);
      }

      if (slug && initialEvents.length > 0) {
        const match = initialEvents.find(
          (event) => event.slug === slug || event.id === slug,
        );
        if (match) setSelectedId(match.id);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [initialEvents]);

  const visible = useMemo(() => {
    const term = normalize(query.trim());

    return events.filter((event) => {
      if (category !== "Todos" && event.categoria !== category) return false;
      if (!term) return true;

      return normalize(
        `${event.titulo} ${event.lugar} ${event.barrio} ${event.ciudad ?? ""} ${
          event.categoria
        }`,
      ).includes(term);
    });
  }, [category, events, query]);

  const selected =
    events.find((event) => event.id === selectedId) ?? null;

  const withCoords = visible.filter(
    (event) => typeof event.lat === "number" && typeof event.lng === "number",
  );

  async function loadNearby() {
    if (!("geolocation" in navigator)) {
      setError("Tu navegador no soporta geolocalización.");
      return;
    }

    setLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          setInitialCenter([longitude, latitude]);
          setInitialZoom(13);

          const res = await fetch(
            `/api/eventos?lat=${latitude}&lng=${longitude}&radius=25000&limit=300`,
          );
          if (!res.ok) throw new Error("API");
          const data = (await res.json()) as NormalizedEvent[];
          setEvents(Array.isArray(data) ? data : []);
        } catch {
          setError("No pudimos cargar eventos cerca tuyo.");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLoading(false);
        setError("No nos diste permiso para usar tu ubicación.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  async function resetLocation() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/eventos?limit=400");
      if (!res.ok) throw new Error("API");
      const data = (await res.json()) as NormalizedEvent[];
      setEvents(Array.isArray(data) ? data : []);
      setInitialCenter(undefined);
      setInitialZoom(11);
    } catch {
      setError("No pudimos recargar la agenda.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col-reverse lg:flex-row">
      <aside className="flex min-h-0 flex-1 flex-col border-t border-white/5 bg-zinc-950 lg:max-w-[430px] lg:border-r lg:border-t-0">
        <div className="border-b border-white/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-base font-semibold text-white">Mapa de eventos</h1>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                {withCoords.length} eventos ubicados
              </p>
            </div>
            <Link
              href="/"
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:text-white"
            >
              Lista
            </Link>
          </div>

          <form
            role="search"
            onSubmit={(event) => event.preventDefault()}
            className="relative mt-3"
          >
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar en el mapa..."
              className="h-10 w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-violet-400/50"
            />
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              className="absolute left-3 top-3 h-4 w-4 text-zinc-500"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </form>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={loadNearby}
              disabled={loading}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-violet-500 px-3 text-[11px] font-semibold text-white transition hover:bg-violet-400 disabled:opacity-60"
            >
              {loading ? "Buscando..." : "Cerca mío"}
            </button>
            <button
              type="button"
              onClick={resetLocation}
              className="inline-flex h-8 items-center rounded-full border border-white/10 bg-white/5 px-3 text-[11px] font-medium text-zinc-300 transition hover:text-white"
            >
              Todo el país
            </button>
          </div>

          {error ? (
            <p className="mt-3 text-[11px] text-rose-300" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-white/5 px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(["Todos", ...EVENT_CATEGORIES] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                category === item
                  ? "border-violet-400 bg-violet-500 text-white"
                  : "border-white/10 text-zinc-400 hover:text-white"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {visible.length === 0 ? (
            <p className="p-6 text-center text-sm text-zinc-500">
              No hay eventos con estos filtros.
            </p>
          ) : (
            <ul className="space-y-1">
              {visible.map((event) => (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(event.id)}
                    className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
                      selectedId === event.id
                        ? "bg-violet-500/15 ring-1 ring-violet-400/30"
                        : "hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-100">
                          {event.titulo}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                          {shortDate(event)} · {event.lugar}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400">
                        {event.categoria}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <div className="relative h-[48dvh] min-h-[280px] w-full lg:h-full lg:min-h-0 lg:flex-1">
        <MapCanvas
          events={withCoords}
          selectedId={selectedId}
          onSelect={(event) => setSelectedId(event.id)}
          initialCenter={initialCenter}
          initialZoom={initialZoom}
        />

        {selected ? (
          <div className="absolute inset-x-3 bottom-3 z-10 rounded-2xl border border-white/10 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur sm:inset-x-auto sm:left-4 sm:max-w-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-300">
                  {selected.categoria}
                </p>
                <h2 className="mt-1 text-sm font-semibold text-white">
                  {selected.titulo}
                </h2>
                <p className="mt-1 text-xs text-zinc-400">
                  {shortDate(selected)}
                  {selected.hora ? ` · ${selected.hora}` : ""} · {selected.lugar}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="Cerrar"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {selected.slug ? (
                <Link
                  href={`/eventos/${selected.slug}`}
                  className="inline-flex h-8 items-center rounded-full bg-white px-3.5 text-[11px] font-semibold text-zinc-950 transition hover:bg-zinc-200"
                >
                  Ver ficha
                </Link>
              ) : null}
              <span className="text-xs font-medium text-violet-300">
                {selected.precio}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
