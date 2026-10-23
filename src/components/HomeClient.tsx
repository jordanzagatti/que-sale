"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { EventCard } from "@/components/EventCard";
import { SaveSearchButton } from "@/components/SaveSearchButton";
import { getCurrentUser } from "@/lib/auth-client";
import { CITIES, getCity } from "@/lib/geo/cities";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { EventCategory, NormalizedEvent } from "@/lib/types";
import { EVENT_CATEGORIES } from "@/lib/types";

type CategoryFilter = EventCategory | "Todos";

type Follow = {
  kind: "venue" | "category" | "city";
  value: string;
};

type Coordinates = {
  lat: number;
  lng: number;
  radiusM: number;
};

function followScore(event: NormalizedEvent, follows: Follow[]) {
  let score = 0;

  for (const follow of follows) {
    if (follow.kind === "venue" && normalize(event.lugar) === normalize(follow.value)) {
      score += 4;
    }
    if (follow.kind === "category" && event.categoria === follow.value) {
      score += 3;
    }
    if (
      follow.kind === "city" &&
      normalize(event.ciudad ?? "") === normalize(follow.value)
    ) {
      score += 2;
    }
  }

  return score;
}

const SUGGESTED_CATEGORIES: CategoryFilter[] = [
  "Todos",
  "Música",
  "Teatro",
  "Fiesta",
  "Arte",
  "Cine",
  "Gastronomía",
  "Deportes",
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function SearchIcon({ className }: { className?: string }) {
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
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
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

function MapIcon({ className }: { className?: string }) {
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
      <path d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z" />
      <path d="M9 3v15M15 6v15" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
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
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function HomeClient({
  events,
  initialCity = "CABA",
  initialQuery = "",
  initialCategory = "Todos",
  initialCoordinates = null,
}: {
  events: NormalizedEvent[];
  initialCity?: string;
  initialQuery?: string;
  initialCategory?: CategoryFilter;
  initialCoordinates?: Coordinates | null;
}) {
  const initialCityInfo = getCity(initialCity);
  const [items, setItems] = useState(events);
  const [query, setQuery] = useState(initialQuery);
  const [categoria, setCategoria] =
    useState<CategoryFilter>(initialCategory);
  const [city, setCity] = useState(
    initialCoordinates ? "Cerca tuyo" : initialCityInfo.name,
  );
  const [nearMe, setNearMe] = useState(Boolean(initialCoordinates));
  const [coordinates, setCoordinates] = useState<Coordinates | null>(
    initialCoordinates,
  );
  const [follows, setFollows] = useState<Follow[]>([]);
  const [onlyFollowing, setOnlyFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAllCategories, setShowAllCategories] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadFollows() {
      const user = await getCurrentUser();
      if (!user || cancelled) return;

      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from("follows")
        .select("kind, value")
        .eq("user_id", user.id)
        .in("kind", ["venue", "category", "city"]);

      if (!cancelled && data) {
        setFollows(data as Follow[]);
      }
    }

    void loadFollows();

    const onChange = () => {
      void loadFollows();
    };
    window.addEventListener("quesale:follows-changed", onChange);

    return () => {
      cancelled = true;
      window.removeEventListener("quesale:follows-changed", onChange);
    };
  }, []);


  const visibleCategories = showAllCategories
    ? (["Todos", ...EVENT_CATEGORIES] as CategoryFilter[])
    : SUGGESTED_CATEGORIES;

  const filteredEvents = useMemo(() => {
    const term = normalize(query.trim());

    const matching = items.filter((event) => {
      const matchesCategoria =
        categoria === "Todos" || event.categoria === categoria;
      if (!matchesCategoria) return false;

      if (nearMe && coordinates) {
        if (typeof event.lat !== "number" || typeof event.lng !== "number") {
          return false;
        }
        if (
          distanceKm(coordinates, { lat: event.lat, lng: event.lng }) >
          coordinates.radiusM / 1000
        ) {
          return false;
        }
      }

      if (!term) return true;

      return normalize(
        `${event.titulo} ${event.lugar} ${event.barrio} ${event.ciudad ?? ""} ${
          event.categoria
        } ${event.descripcion ?? ""}`,
      ).includes(term);
    });

    if (!onlyFollowing || follows.length === 0) return matching;

    return matching
      .map((event) => ({ event, score: followScore(event, follows) }))
      .filter((item) => item.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.event.fecha.localeCompare(b.event.fecha) ||
          a.event.titulo.localeCompare(b.event.titulo),
      )
      .map((item) => item.event);
  }, [categoria, coordinates, follows, items, nearMe, onlyFollowing, query]);

  const forYouCount = useMemo(
    () => items.filter((event) => followScore(event, follows) > 0).length,
    [follows, items],
  );

  const desde = useMemo(() => {
    const amounts = items
      .map((event) => Number(event.precio.replace(/[^\d]/g, "")))
      .filter((amount) => Number.isFinite(amount) && amount > 0);

    if (amounts.length === 0) return null;
    return new Intl.NumberFormat("es-AR").format(Math.min(...amounts));
  }, [items]);

  async function loadEvents(params: {
    cityName?: string;
    q?: string;
    lat?: number;
    lng?: number;
    radiusM?: number;
  }) {
    setLoading(true);
    setError("");

    try {
      const search = new URLSearchParams();
      if (params.cityName) search.set("city", params.cityName);
      if (params.q) search.set("q", params.q);
      if (typeof params.lat === "number") search.set("lat", String(params.lat));
      if (typeof params.lng === "number") search.set("lng", String(params.lng));
      if (params.radiusM) search.set("radius", String(params.radiusM));
      search.set("limit", "180");

      const res = await fetch(`/api/eventos?${search.toString()}`, {
        headers: { Accept: "application/json" },
      });

      if (!res.ok) throw new Error(`La API respondió ${res.status}`);

      const data = (await res.json()) as
        | NormalizedEvent[]
        | { events?: NormalizedEvent[] };
      const nextEvents = Array.isArray(data) ? data : data.events ?? [];
      setItems(nextEvents);
    } catch {
      setError("No pudimos actualizar la agenda. Probá de nuevo en un rato.");
    } finally {
      setLoading(false);
    }
  }

  function chooseCity(nextCity: string) {
    const info = getCity(nextCity);
    setCity(info.name);
    setNearMe(false);
    setCoordinates(null);
    setOnlyFollowing(false);
    setCategoria("Todos");
    setQuery("");
    void loadEvents({ cityName: info.name });
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setError("Tu navegador no soporta geolocalización.");
      return;
    }

    setLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCoordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          radiusM: 25000,
        };

        setNearMe(true);
        setCoordinates(nextCoordinates);
        setOnlyFollowing(false);
        setCategoria("Todos");
        setQuery("");
        setCity("Cerca tuyo");
        void loadEvents({
          lat: nextCoordinates.lat,
          lng: nextCoordinates.lng,
          radiusM: nextCoordinates.radiusM,
        });
      },
      () => {
        setLoading(false);
        setError(
          "No pudimos acceder a tu ubicación. Podés elegir una ciudad a mano.",
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  function submitSearch() {
    if (query.trim()) {
      void loadEvents({
        cityName: nearMe ? undefined : city,
        q: query.trim(),
        lat: coordinates?.lat,
        lng: coordinates?.lng,
        radiusM: coordinates?.radiusM,
      });
    } else {
      void loadEvents({
        cityName: nearMe ? undefined : city,
        lat: coordinates?.lat,
        lng: coordinates?.lng,
        radiusM: coordinates?.radiusM,
      });
    }
  }

  function resetFilters() {
    setQuery("");
    setCategoria("Todos");
    setOnlyFollowing(false);
    if (nearMe) {
      void loadEvents({
        lat: coordinates?.lat,
        lng: coordinates?.lng,
        radiusM: coordinates?.radiusM,
      });
    } else {
      void loadEvents({ cityName: city });
    }
  }

  function countByCategory(category: EventCategory) {
    return items.filter((event) => event.categoria === category).length;
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-zinc-950">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[680px] overflow-hidden"
      >
        <div className="absolute left-1/2 top-[-320px] h-[620px] w-[980px] -translate-x-1/2 rounded-full bg-violet-600/25 blur-[130px]" />
        <div className="absolute left-[12%] top-28 h-72 w-72 rounded-full bg-fuchsia-600/10 blur-[110px]" />
        <div className="absolute right-[8%] top-10 h-64 w-64 rounded-full bg-indigo-500/10 blur-[100px]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-zinc-950" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/5 bg-zinc-950/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-6">
          <Link href="/" className="group flex shrink-0 items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white shadow-lg shadow-violet-500/30">
              QS
            </span>
            <span className="hidden text-sm font-semibold tracking-tight text-white sm:block">
              ¿Qué Sale?
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-zinc-400 md:flex">
            <a href="#eventos" className="transition-colors hover:text-white">
              Eventos
            </a>
            <Link href="/mapa" className="transition-colors hover:text-white">
              Mapa
            </Link>
            <Link href="/cuenta" className="transition-colors hover:text-white">
              Mi agenda
            </Link>
            <Link href="/ingresar" className="transition-colors hover:text-white">
              Ingresar
            </Link>
          </nav>

          <div className="flex min-w-0 items-center gap-2">
            <label className="relative flex min-w-0 items-center">
              <span className="sr-only">Elegir ciudad</span>
              <PinIcon className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-violet-300/80" />
              <select
                value={nearMe ? "" : city}
                onChange={(event) => chooseCity(event.target.value)}
                className="h-9 max-w-[170px] appearance-none truncate rounded-full border border-white/10 bg-white/5 pl-8 pr-8 text-xs font-medium text-zinc-200 outline-none transition hover:border-violet-400/30 focus:border-violet-400/50"
              >
                {nearMe ? <option value="">Cerca tuyo</option> : null}
                {CITIES.map((item) => (
                  <option key={item.id} value={item.name} className="bg-zinc-900">
                    {item.name}
                  </option>
                ))}
              </select>
              <ChevronIcon className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-zinc-500" />
            </label>

            <Link
              href="/cuenta"
              className="hidden h-9 items-center rounded-full bg-white px-4 text-xs font-semibold text-zinc-950 transition hover:bg-zinc-200 sm:inline-flex"
            >
              Mi agenda
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative mx-auto max-w-4xl px-6 pb-20 pt-14 text-center sm:pt-20">
          <span className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            La agenda cultural de Argentina
          </span>

          <h1 className="mt-7 animate-fade-up text-5xl font-semibold leading-[0.95] tracking-[-0.045em] text-white [animation-delay:80ms] sm:text-6xl lg:text-7xl">
            ¿Qué{" "}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-amber-300 bg-clip-text text-transparent">
              Sale
            </span>
            ?
          </h1>

          <p className="mx-auto mt-6 max-w-xl animate-fade-up text-base leading-relaxed text-zinc-400 [animation-delay:160ms] sm:text-lg">
            Recitales, teatro, ferias, deportes y planes para cualquier día. Una
            sola agenda para descubrir qué hacer en tu ciudad.
          </p>

          <div className="mt-7 flex animate-fade-up flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-zinc-500 [animation-delay:240ms]">
            <span>
              <strong className="font-semibold text-zinc-200">
                {items.length}
              </strong>{" "}
              eventos {nearMe ? "cerca tuyo" : `en ${city}`}
            </span>
            <span className="hidden h-1 w-1 rounded-full bg-zinc-700 sm:block" />
            <span>
              {desde ? (
                <>
                  Entradas desde{" "}
                  <strong className="font-semibold text-zinc-200">
                    ${desde}
                  </strong>
                </>
              ) : (
                "Planes gratis y pagos"
              )}
            </span>
            <span className="hidden h-1 w-1 rounded-full bg-zinc-700 sm:block" />
            <span>Actualizado hoy</span>
          </div>
        </section>

        <div className="relative z-10 mx-auto -mt-8 w-full max-w-3xl px-5 sm:px-6">
          <form
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              submitSearch();
            }}
            className="group relative"
          >
            <span className="pointer-events-none absolute inset-y-0 left-5 flex items-center text-zinc-500 transition-colors group-focus-within:text-violet-400">
              <SearchIcon className="h-5 w-5" />
            </span>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscá por evento, lugar, barrio o ciudad..."
              aria-label="Buscar eventos"
              className="h-14 w-full rounded-2xl border border-white/10 bg-zinc-900/90 pl-14 pr-24 text-sm text-white shadow-2xl shadow-black/40 outline-none backdrop-blur-xl transition placeholder:text-zinc-500 focus:border-violet-400/50 focus:ring-4 focus:ring-violet-500/10"
            />
            <div className="absolute inset-y-0 right-2 flex items-center gap-1">
              {query.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    void loadEvents({
                      cityName: nearMe ? undefined : city,
                      lat: coordinates?.lat,
                      lng: coordinates?.lng,
                      radiusM: coordinates?.radiusM,
                    });
                  }}
                  aria-label="Limpiar búsqueda"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    className="h-4 w-4"
                  >
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              ) : null}
              <button
                type="submit"
                className="inline-flex h-10 items-center rounded-xl bg-violet-500 px-4 text-xs font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:bg-violet-400"
              >
                Buscar
              </button>
            </div>
          </form>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={useMyLocation}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-[11px] font-medium text-zinc-300 transition hover:border-violet-400/40 hover:text-white"
            >
              <PinIcon className="h-3.5 w-3.5 text-violet-300" />
              Cerca mío
            </button>
            <Link
              href="/mapa"
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-[11px] font-medium text-zinc-300 transition hover:border-violet-400/40 hover:text-white"
            >
              <MapIcon className="h-3.5 w-3.5 text-violet-300" />
              Ver mapa
            </Link>
            <span className="text-[11px] text-zinc-600">
              Usamos tu IP para elegir la ciudad. La ubicación precisa solo si la
              pedís.
            </span>
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-2 text-center text-xs text-rose-200"
            >
              {error}
            </p>
          ) : null}
        </div>

        <section
          id="eventos"
          className="relative mx-auto mt-14 max-w-7xl scroll-mt-24 px-5 pb-24 sm:px-6"
        >
          <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold tracking-tight text-white">
                  Próximos eventos
                </h2>
                {loading ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
                    <span className="h-3 w-3 animate-spin rounded-full border border-zinc-600 border-t-violet-400" />
                    Actualizando
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-zinc-500">
                {filteredEvents.length}{" "}
                {filteredEvents.length === 1 ? "evento" : "eventos"} ·{" "}
                {nearMe ? "cerca tuyo" : city}
              </p>
              <div className="mt-3">
                <SaveSearchButton
                  query={query}
                  category={categoria}
                  city={nearMe ? undefined : city}
                  lat={nearMe ? coordinates?.lat : undefined}
                  lng={nearMe ? coordinates?.lng : undefined}
                  radiusM={nearMe ? coordinates?.radiusM : undefined}
                />
              </div>
            </div>

            <div
              id="categorias"
              className="-mx-5 flex scroll-mt-24 gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:px-0 lg:max-w-4xl lg:justify-end"
            >
              {follows.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setOnlyFollowing((value) => !value);
                    setCategoria("Todos");
                  }}
                  aria-pressed={onlyFollowing}
                  className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition ${
                    onlyFollowing
                      ? "border-amber-300 bg-amber-300 text-zinc-950 shadow-lg shadow-amber-300/20"
                      : "border-amber-300/30 bg-amber-300/10 text-amber-200 hover:border-amber-300/60"
                  }`}
                >
                  Para vos ({forYouCount})
                </button>
              ) : null}

              {visibleCategories.map((item) => {
                const active = item === categoria && !onlyFollowing;
                const count =
                  item === "Todos" ? items.length : countByCategory(item);
                const label = item === "Todos" ? "Todos" : `${item} (${count})`;

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setCategoria(item);
                      setOnlyFollowing(false);
                    }}
                    aria-pressed={active}
                    className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition ${
                      active
                        ? "border-violet-400 bg-violet-500 text-white shadow-lg shadow-violet-500/25"
                        : "border-white/10 bg-white/5 text-zinc-400 hover:border-violet-400/30 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setShowAllCategories((value) => !value)}
                className="shrink-0 rounded-full border border-dashed border-white/15 px-4 py-1.5 text-xs font-medium text-zinc-500 transition hover:border-violet-400/30 hover:text-white"
              >
                {showAllCategories ? "Menos" : "Más categorías"}
              </button>
            </div>
          </div>

          {filteredEvents.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredEvents.map((event, index) => (
                <EventCard key={event.id} event={event} index={index} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center rounded-3xl border border-dashed border-white/10 bg-zinc-900/30 px-6 py-20 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-400">
                <SearchIcon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-base font-semibold text-white">
                No encontramos eventos
              </h3>
              <p className="mt-2 max-w-sm text-sm text-zinc-500">
                Probá con otra búsqueda, cambiá de categoría o elegí otra ciudad.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-6 rounded-full bg-violet-500 px-5 py-2 text-xs font-semibold text-white transition hover:bg-violet-400"
              >
                Ver todos los eventos
              </button>
            </div>
          )}
        </section>
      </main>

      <footer id="contacto" className="border-t border-white/5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-zinc-500 sm:flex-row">
          <p>© 2026 ¿Qué Sale? · Agenda de Argentina</p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link href="/mapa" className="transition-colors hover:text-white">
              Mapa
            </Link>
            <Link href="/cuenta" className="transition-colors hover:text-white">
              Mi agenda
            </Link>
            <Link href="/ingresar" className="transition-colors hover:text-white">
              Ingresar
            </Link>
            <Link href="/fuentes" className="transition-colors hover:text-white">
              Fuentes
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
