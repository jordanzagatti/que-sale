import type { Metadata } from "next";
import { Suspense } from "react";

import { HomeClient } from "@/components/HomeClient";
import { getEventos } from "@/lib/getEventos";
import { getCity } from "@/lib/geo/cities";
import { getRequestCity } from "@/lib/geo/location";
import { EVENT_CATEGORIES, type EventCategory } from "@/lib/types";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

type SearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function positiveNumber(value: string | undefined): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function finiteNumber(value: string | undefined): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

async function HomeServer({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const requestCity = await getRequestCity();

  const q = first(params.q)?.trim() || undefined;
  const categoryParam = first(params.category);
  const category = EVENT_CATEGORIES.includes(categoryParam as EventCategory)
    ? (categoryParam as EventCategory)
    : undefined;

  const cityParam = first(params.city);
  const lat = finiteNumber(first(params.lat));
  const lng = finiteNumber(first(params.lng));
  const radiusM = positiveNumber(first(params.radius));
  const hasCoordinates =
    typeof lat === "number" && typeof lng === "number";

  const city = cityParam ? getCity(cityParam) : requestCity;
  const events = await getEventos({
    city: hasCoordinates ? null : city.name,
    category: category ?? null,
    query: q ?? null,
    lat,
    lng,
    radiusM,
    limit: 180,
  });

  return (
    <HomeClient
      events={events}
      initialCity={hasCoordinates ? "Cerca tuyo" : city.name}
      initialQuery={q ?? ""}
      initialCategory={category ?? "Todos"}
      initialCoordinates={
        hasCoordinates
          ? { lat, lng, radiusM: radiusM ?? 25000 }
          : null
      }
    />
  );
}

function HomeSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-white/5">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white">
              QS
            </span>
            <span className="text-sm font-semibold text-white">¿Qué Sale?</span>
          </div>
          <span className="h-8 w-24 animate-pulse rounded-full bg-white/5" />
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 pt-20 text-center">
        <span className="inline-block h-6 w-52 animate-pulse rounded-full bg-white/5" />
        <div className="mx-auto mt-7 h-16 w-72 animate-pulse rounded-2xl bg-white/5 sm:h-20 sm:w-96" />
        <div className="mx-auto mt-6 h-5 w-full max-w-xl animate-pulse rounded-full bg-white/5" />
        <div className="mx-auto mt-10 h-14 w-full max-w-2xl animate-pulse rounded-2xl bg-white/5" />
      </main>
      <div className="mx-auto mt-16 grid max-w-7xl gap-6 px-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="aspect-[4/3] animate-pulse rounded-3xl bg-white/5"
          />
        ))}
      </div>
    </div>
  );
}

export default function Home({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeServer searchParams={searchParams} />
    </Suspense>
  );
}
