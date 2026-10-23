"use client";

import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { InstallAppButton } from "@/components/InstallAppButton";
import { PushManager } from "@/components/PushManager";
import { authErrorMessage } from "@/lib/auth-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Tab = "agenda" | "busquedas" | "seguidos" | "notificaciones";

type EventLite = {
  id: string;
  slug: string | null;
  title: string;
  starts_at: string;
  venue_name: string | null;
  city: string | null;
  image_url: string | null;
  category: string | null;
  price_text: string | null;
};

type AttendanceRow = {
  status: string;
  created_at: string;
  events: EventLite | EventLite[] | null;
};

type SavedSearch = {
  id: string;
  name: string;
  filters: {
    q?: string | null;
    category?: string | null;
    city?: string | null;
    lat?: number | null;
    lng?: number | null;
    radiusM?: number | null;
  } | null;
  created_at: string;
};

type Follow = {
  id: string;
  kind: "venue" | "category" | "city";
  value: string;
  label: string | null;
};

function eventFromRelation(row: AttendanceRow): EventLite | null {
  if (!row.events) return null;
  return Array.isArray(row.events) ? (row.events[0] ?? null) : row.events;
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("es-AR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Argentina/Buenos_Aires",
    })
      .format(new Date(value))
      .replace(/\./g, "");
  } catch {
    return value;
  }
}

function kindLabel(kind: Follow["kind"]) {
  if (kind === "venue") return "Lugar";
  if (kind === "category") return "Categoría";
  return "Ciudad";
}

function savedSearchHref(search: SavedSearch) {
  const params = new URLSearchParams();
  const filters = search.filters;

  if (filters?.q) params.set("q", filters.q);
  if (filters?.category) params.set("category", filters.category);
  if (filters?.city) params.set("city", filters.city);
  if (typeof filters?.lat === "number" && typeof filters?.lng === "number") {
    params.set("lat", String(filters.lat));
    params.set("lng", String(filters.lng));
    if (typeof filters.radiusM === "number") {
      params.set("radius", String(filters.radiusM));
    }
  }

  const query = params.toString();
  return query ? `/?${query}#eventos` : "/#eventos";
}

function EmptyState({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-zinc-500">{body}</p>
      <Link
        href={href}
        className="mt-4 inline-flex h-9 items-center rounded-full bg-violet-500 px-4 text-xs font-semibold text-white transition hover:bg-violet-400"
      >
        {cta}
      </Link>
    </div>
  );
}

export function AccountClient() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("agenda");
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [follows, setFollows] = useState<Follow[]>([]);
  const [message, setMessage] = useState("");
  const [linkEmail, setLinkEmail] = useState("");
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;

      if (!data.user) {
        setLoading(false);
        return;
      }

      setUser(data.user);

      const [attendanceResult, searchesResult, followsResult] =
        await Promise.all([
          supabase
            .from("attendance")
            .select(
              "status, created_at, events(id, slug, title, starts_at, venue_name, city, image_url, category, price_text)",
            )
            .eq("user_id", data.user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("saved_searches")
            .select("id, name, filters, created_at")
            .eq("user_id", data.user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("follows")
            .select("id, kind, value, label")
            .eq("user_id", data.user.id)
            .order("created_at", { ascending: false }),
        ]);

      if (cancelled) return;

      setAttendance((attendanceResult.data as AttendanceRow[] | null) ?? []);
      setSearches((searchesResult.data as SavedSearch[] | null) ?? []);
      setFollows((followsResult.data as Follow[] | null) ?? []);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function removeAttendance(eventId: string) {
    if (!user) return;
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from("attendance")
      .delete()
      .eq("user_id", user.id)
      .eq("event_id", eventId);
    if (error) {
      setMessage("No pudimos quitarlo de tu agenda.");
      return;
    }
    setAttendance((rows) =>
      rows.filter((row) => eventFromRelation(row)?.id !== eventId),
    );
  }

  async function removeSearch(id: string) {
    if (!user) return;
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from("saved_searches")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      setMessage("No pudimos borrar la búsqueda.");
      return;
    }
    setSearches((rows) => rows.filter((row) => row.id !== id));
  }

  async function removeFollow(id: string) {
    if (!user) return;
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      setMessage("No pudimos dejar de seguir.");
      return;
    }
    setFollows((rows) => rows.filter((row) => row.id !== id));
    window.dispatchEvent(new Event("quesale:follows-changed"));
  }

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  async function saveEmail(event: React.FormEvent) {
    event.preventDefault();
    if (!linkEmail.trim() || linking) return;

    setLinking(true);
    setMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({
        email: linkEmail.trim(),
      });
      if (error) throw error;

      setMessage(
        `Te mandamos un mail a ${linkEmail.trim()} para confirmar y guardar tu cuenta.`,
      );
      setLinkEmail("");
    } catch (error) {
      setMessage(authErrorMessage(error));
    } finally {
      setLinking(false);
    }
  }

  const upcoming = attendance
    .map((row) => ({ row, event: eventFromRelation(row) }))
    .filter((item): item is { row: AttendanceRow; event: EventLite } =>
      Boolean(item.event),
    )
    .sort(
      (a, b) =>
        new Date(a.event.starts_at).getTime() -
        new Date(b.event.starts_at).getTime(),
    );

  const tabs: Array<{ id: Tab; label: string; count: number }> = [
    { id: "agenda", label: "Mi agenda", count: upcoming.length },
    { id: "busquedas", label: "Búsquedas", count: searches.length },
    { id: "seguidos", label: "Seguidos", count: follows.length },
    { id: "notificaciones", label: "Notificaciones", count: 0 },
  ];

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-16 sm:px-6">
        <div className="h-8 w-48 animate-pulse rounded-full bg-white/5" />
        <div className="mt-8 h-40 animate-pulse rounded-3xl bg-white/5" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-5 py-20 text-center sm:px-6">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/5">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6 text-violet-300"
          >
            <path d="M20 21a8 8 0 0 0-16 0" />
            <circle cx="12" cy="8" r="5" />
          </svg>
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-white">Tu agenda te espera</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-400">
          Entrá para guardar eventos, seguir lugares y recibir recordatorios
          antes de que empiecen.
        </p>
        <Link
          href="/ingresar"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-violet-500 px-6 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:bg-violet-400"
        >
          Ingresar
        </Link>
      </div>
    );
  }

  const isAnonymous = user.is_anonymous ?? !user.email;

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
            Mi cuenta
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            {isAnonymous ? "Tu agenda" : user.email}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {isAnonymous
              ? "Estás en una sesión anónima. Podés vincular tu email cuando quieras."
              : "Tus eventos, búsquedas y lugares favoritos."}
          </p>
        </div>

        <button
          type="button"
          onClick={signOut}
          className="inline-flex h-9 w-fit items-center rounded-full border border-white/10 bg-white/5 px-4 text-xs font-medium text-zinc-300 transition hover:text-white"
        >
          Cerrar sesión
        </button>
      </div>

      {isAnonymous ? (
        <form
          onSubmit={saveEmail}
          className="mt-6 flex flex-col gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4 sm:flex-row sm:items-center"
        >
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-violet-200">
              Guardá tu cuenta
            </p>
            <p className="mt-0.5 text-[11px] leading-5 text-violet-200/70">
              Vinculá tu email para no perder tu agenda si cambiás de
              dispositivo.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="email"
              required
              value={linkEmail}
              onChange={(event) => setLinkEmail(event.target.value)}
              placeholder="vos@email.com"
              className="h-9 min-w-0 rounded-full border border-white/10 bg-zinc-950/50 px-3 text-xs text-white outline-none placeholder:text-zinc-500 focus:border-violet-400/50"
            />
            <button
              type="submit"
              disabled={linking}
              className="shrink-0 rounded-full bg-white px-3.5 text-xs font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-60"
            >
              {linking ? "..." : "Vincular"}
            </button>
          </div>
        </form>
      ) : null}

      {message ? (
        <p
          role="status"
          className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs leading-5 text-zinc-300"
        >
          {message}
        </p>
      ) : null}

      <div className="mt-8 flex gap-1 overflow-x-auto border-b border-white/5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`shrink-0 border-b-2 px-4 py-3 text-xs font-medium transition ${
              tab === item.id
                ? "border-violet-400 text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-200"
            }`}
          >
            {item.label}
            {item.count > 0 ? (
              <span className="ml-1.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-zinc-300">
                {item.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "agenda" ? (
          upcoming.length === 0 ? (
            <EmptyState
              title="Todavía no marcaste ningún evento"
              body="Cuando encuentres algo que te guste, tocá “Asistir”. Te va a quedar guardado acá y te avisamos antes."
              href="/"
              cta="Descubrir eventos"
            />
          ) : (
            <ul className="space-y-2">
              {upcoming.map(({ event, row }) => (
                <li
                  key={event.id}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-3"
                >
                  <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-800">
                    {event.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- imágenes de terceros
                      <img
                        src={event.image_url}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-violet-300">
                      {formatDate(event.starts_at)}
                    </p>
                    {event.slug ? (
                      <Link
                        href={`/eventos/${event.slug}`}
                        className="mt-0.5 block truncate text-sm font-semibold text-white hover:text-violet-200"
                      >
                        {event.title}
                      </Link>
                    ) : (
                      <p className="mt-0.5 truncate text-sm font-semibold text-white">
                        {event.title}
                      </p>
                    )}
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {event.venue_name ?? "Lugar a confirmar"}
                      {event.city ? ` · ${event.city}` : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                      {row.status === "going" ? "Voy" : "Interesado"}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttendance(event.id)}
                      className="text-[10px] text-zinc-500 transition hover:text-rose-300"
                    >
                      Quitar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : null}

        {tab === "busquedas" ? (
          searches.length === 0 ? (
            <EmptyState
              title="No guardaste búsquedas"
              body="Buscá un plan y tocá “Guardar búsqueda” para volver a encontrarlo fácil."
              href="/"
              cta="Buscar eventos"
            />
          ) : (
            <ul className="space-y-2">
              {searches.map((search) => (
                <li
                  key={search.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {search.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-zinc-500">
                      Guardada {formatDate(search.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Link
                      href={savedSearchHref(search)}
                      className="text-[11px] font-medium text-violet-300 transition hover:text-violet-200"
                    >
                      Abrir
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeSearch(search.id)}
                      className="text-[11px] text-zinc-500 transition hover:text-rose-300"
                    >
                      Borrar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : null}

        {tab === "seguidos" ? (
          follows.length === 0 ? (
            <EmptyState
              title="Todavía no seguís nada"
              body="Seguí lugares, categorías o ciudades desde la ficha de un evento para recibir novedades."
              href="/"
              cta="Explorar eventos"
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {follows.map((follow) => (
                <span
                  key={follow.id}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-200"
                >
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-violet-300">
                    {kindLabel(follow.kind)}
                  </span>
                  {follow.label ?? follow.value}
                  <button
                    type="button"
                    onClick={() => removeFollow(follow.id)}
                    aria-label={`Dejar de seguir ${follow.value}`}
                    className="ml-0.5 text-zinc-500 transition hover:text-rose-300"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )
        ) : null}

        {tab === "notificaciones" ? (
          <div className="space-y-4">
            <PushManager userId={user.id} />

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-sm font-semibold text-white">Instalar la app</h3>
              <p className="mt-1 text-xs leading-5 text-zinc-400">
                Accedé más rápido desde tu pantalla de inicio y recibí push en
                iPhone (iOS 16.4 o superior).
              </p>
              <div className="mt-3">
                <InstallAppButton />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-sm font-semibold text-white">
                Cómo funcionan los recordatorios
              </h3>
              <ul className="mt-2 space-y-2 text-xs leading-5 text-zinc-400">
                <li>· 24 horas antes del evento que marcaste “Voy”.</li>
                <li>· 2 horas antes, con el lugar y el horario.</li>
                <li>· Podés desactivarlos en cualquier momento.</li>
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
