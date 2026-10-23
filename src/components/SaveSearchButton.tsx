"use client";

import Link from "next/link";
import { useState } from "react";

import { authErrorMessage, ensureUser } from "@/lib/auth-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { EventCategory } from "@/lib/types";

export function SaveSearchButton({
  query,
  category,
  city,
  lat,
  lng,
  radiusM,
}: {
  query: string;
  category: EventCategory | "Todos";
  city?: string;
  lat?: number;
  lng?: number;
  radiusM?: number;
}) {
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");

  const name = [
    query.trim() ? `“${query.trim()}”` : "Todo",
    category !== "Todos" ? category : null,
    `en ${city ?? "cerca tuyo"}`,
  ]
    .filter(Boolean)
    .join(" · ");

  async function save() {
    if (busy) return;
    setBusy(true);
    setMessage("");

    try {
      const user = await ensureUser();
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from("saved_searches").insert({
        user_id: user.id,
        name,
        filters: {
          q: query.trim() || null,
          category: category === "Todos" ? null : category,
          city: city ?? null,
          lat: lat ?? null,
          lng: lng ?? null,
          radiusM: radiusM ?? null,
        },
        notify: true,
      });
      if (error) throw error;
      setSaved(true);
      setMessage("Búsqueda guardada");
    } catch (error) {
      setMessage(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-[11px] font-medium text-zinc-300 transition hover:border-violet-400/40 hover:text-white disabled:opacity-60"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5"
        >
          <path d="M19 21 12 16l-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z" />
        </svg>
        {busy ? "Guardando..." : saved ? "Guardada" : "Guardar búsqueda"}
      </button>

      {message ? (
        <span
          role="status"
          className={
            saved
              ? "text-[11px] text-emerald-300"
              : "text-[11px] text-rose-300"
          }
        >
          {message}
        </span>
      ) : null}

      {saved ? (
        <Link
          href="/cuenta"
          className="text-[11px] font-medium text-violet-300 hover:text-violet-200"
        >
          Ver en Mi agenda
        </Link>
      ) : null}
    </div>
  );
}
