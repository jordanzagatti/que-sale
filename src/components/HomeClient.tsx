"use client";

import { useMemo, useState } from "react";

import { EventCard } from "@/components/EventCard";
import type { EventCategory, NormalizedEvent } from "@/lib/types";

const CATEGORIES = ["Todos", "Fiesta", "Recital", "Teatro"] as const;
type CategoryFilter = (typeof CATEGORIES)[number];

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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

export function HomeClient({ events }: { events: NormalizedEvent[] }) {
  const [query, setQuery] = useState("");
  const [categoria, setCategoria] = useState<CategoryFilter>("Todos");

  const filteredEvents = useMemo(() => {
    const term = normalize(query.trim());

    return events.filter((event) => {
      const matchesCategoria =
        categoria === "Todos" || event.categoria === categoria;
      if (!matchesCategoria) {
        return false;
      }
      if (!term) {
        return true;
      }

      return normalize(
        `${event.titulo} ${event.lugar} ${event.barrio} ${event.categoria}`,
      ).includes(term);
    });
  }, [categoria, events, query]);

  const desde = useMemo(() => {
    const amounts = events
      .map((event) => Number(event.precio.replace(/[^\d]/g, "")))
      .filter((amount) => Number.isFinite(amount) && amount > 0);

    if (amounts.length === 0) return null;

    return new Intl.NumberFormat("es-AR").format(Math.min(...amounts));
  }, [events]);

  const hasFilters = query.trim().length > 0 || categoria !== "Todos";

  function resetFilters() {
    setQuery("");
    setCategoria("Todos");
  }

  function countByCategory(category: EventCategory) {
    return events.filter((event) => event.categoria === category).length;
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-zinc-950">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] overflow-hidden"
      >
        <div className="absolute left-1/2 top-[-320px] h-[620px] w-[980px] -translate-x-1/2 rounded-full bg-violet-600/25 blur-[130px]" />
        <div className="absolute left-[12%] top-28 h-72 w-72 rounded-full bg-fuchsia-600/10 blur-[110px]" />
        <div className="absolute right-[8%] top-10 h-64 w-64 rounded-full bg-indigo-500/10 blur-[100px]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-zinc-950" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/5 bg-zinc-950/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <a href="#" className="group flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white shadow-lg shadow-violet-500/30">
              QS
            </span>
            <span className="text-sm font-semibold tracking-tight text-white">
              ¿Qué Sale?
            </span>
          </a>

          <nav className="hidden items-center gap-7 text-sm text-zinc-400 sm:flex">
            <a href="#eventos" className="transition-colors hover:text-white">
              Eventos
            </a>
            <a href="#categorias" className="transition-colors hover:text-white">
              Categorías
            </a>
            <a
              href="#contacto"
              className="transition-colors hover:text-white"
            >
              Contacto
            </a>
          </nav>

          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            CABA
          </span>
        </div>
      </header>

      <main>
        <section className="relative mx-auto max-w-4xl px-6 pb-24 pt-16 text-center sm:pt-24">
          <span className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            La agenda cultural de Buenos Aires
          </span>

          <h1 className="mt-7 animate-fade-up text-5xl font-semibold leading-[0.95] tracking-[-0.045em] text-white [animation-delay:80ms] sm:text-6xl lg:text-7xl">
            ¿Qué{" "}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-amber-300 bg-clip-text text-transparent">
              Sale
            </span>
            ?
          </h1>

          <p className="mx-auto mt-6 max-w-xl animate-fade-up text-base leading-relaxed text-zinc-400 [animation-delay:160ms] sm:text-lg">
            Fiestas, recitales y teatro. Encontrá qué hacer esta semana en la
            ciudad, en un solo lugar.
          </p>

          <div className="mt-7 flex animate-fade-up flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-zinc-500 [animation-delay:240ms]">
            <span>
              <strong className="font-semibold text-zinc-200">
                {events.length}
              </strong>{" "}
              eventos en CABA
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
                "Entradas para todos los gustos"
              )}
            </span>
            <span className="hidden h-1 w-1 rounded-full bg-zinc-700 sm:block" />
            <span>Actualizado hoy</span>
          </div>
        </section>

        <div className="relative z-10 mx-auto -mt-10 w-full max-w-2xl px-6 sm:px-0">
          <form
            role="search"
            onSubmit={(event) => event.preventDefault()}
            className="group relative"
          >
            <span className="pointer-events-none absolute inset-y-0 left-5 flex items-center text-zinc-500 transition-colors group-focus-within:text-violet-400">
              <SearchIcon className="h-5 w-5" />
            </span>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscá por evento, lugar o barrio..."
              aria-label="Buscar eventos"
              className="h-14 w-full rounded-2xl border border-white/10 bg-zinc-900/90 pl-14 pr-12 text-sm text-white shadow-2xl shadow-black/40 outline-none backdrop-blur-xl transition placeholder:text-zinc-500 focus:border-violet-400/50 focus:ring-4 focus:ring-violet-500/10"
            />
            {query.length > 0 ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Limpiar búsqueda"
                className="absolute inset-y-0 right-3 my-auto flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white"
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
            ) : (
              <span className="pointer-events-none absolute inset-y-0 right-4 hidden items-center rounded-lg border border-white/10 bg-white/5 px-2 text-[10px] font-medium text-zinc-500 sm:flex">
                Enter
              </span>
            )}
          </form>
        </div>

        <section
          id="eventos"
          className="relative mx-auto mt-16 max-w-7xl scroll-mt-24 px-6 pb-24"
        >
          <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-white">
                Próximos eventos
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                {filteredEvents.length}{" "}
                {filteredEvents.length === 1 ? "evento" : "eventos"} · Buenos
                Aires
              </p>
            </div>

            <div
              id="categorias"
              className="-mx-6 flex scroll-mt-24 gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:px-0"
            >
              {CATEGORIES.map((item) => {
                const active = item === categoria;
                const label =
                  item === "Todos" ? "Todos" : `${item} (${countByCategory(item)})`;

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategoria(item)}
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
                Probá con otra búsqueda o cambiá la categoría para ver toda la
                agenda.
              </p>
              {hasFilters ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-6 rounded-full bg-violet-500 px-5 py-2 text-xs font-semibold text-white transition hover:bg-violet-400"
                >
                  Ver todos los eventos
                </button>
              ) : null}
            </div>
          )}
        </section>
      </main>

      <footer id="contacto" className="border-t border-white/5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-zinc-500 sm:flex-row">
          <p>© 2026 ¿Qué Sale? · Hecho en Buenos Aires</p>
          <div className="flex items-center gap-6">
            <a href="#eventos" className="transition-colors hover:text-white">
              Eventos
            </a>
            <a href="#" className="transition-colors hover:text-white">
              Instagram
            </a>
            <a href="#" className="transition-colors hover:text-white">
              Publicar
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
