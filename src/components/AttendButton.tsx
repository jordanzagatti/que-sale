"use client";

import { useState } from "react";

import { authErrorMessage, ensureUser } from "@/lib/auth-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AttendButton({
  eventId,
  initialGoing = false,
  compact = false,
  className = "",
}: {
  eventId: string;
  initialGoing?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const [going, setGoing] = useState(initialGoing);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setMessage("");

    const next = !going;
    setGoing(next);

    try {
      const user = await ensureUser();
      const supabase = createSupabaseBrowserClient();

      if (next) {
        const { error } = await supabase.from("attendance").upsert(
          {
            user_id: user.id,
            event_id: eventId,
            status: "going",
          },
          { onConflict: "user_id,event_id" },
        );
        if (error) throw error;
        setMessage("Te lo guardamos en Mi agenda");
      } else {
        const { error } = await supabase
          .from("attendance")
          .delete()
          .eq("user_id", user.id)
          .eq("event_id", eventId);
        if (error) throw error;
        setMessage("Lo sacamos de Mi agenda");
      }
    } catch (error) {
      setGoing(!next);
      setMessage(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const label = going ? "Voy" : "Asistir";

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={going}
        title={message || (going ? "Quitar de Mi agenda" : "Marcar que asistís")}
        className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[11px] font-semibold transition disabled:opacity-60 ${
          going
            ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
            : "border-white/10 bg-white/5 text-zinc-200 hover:border-violet-400/40 hover:text-white"
        } ${className}`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            going ? "bg-emerald-400" : "bg-zinc-500"
          }`}
        />
        {busy ? "..." : label}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={going}
        className={`inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm font-semibold transition disabled:opacity-60 ${
          going
            ? "bg-emerald-400 text-emerald-950 hover:bg-emerald-300"
            : "bg-violet-500 text-white shadow-lg shadow-violet-500/25 hover:bg-violet-400"
        } ${className}`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          {going ? (
            <path d="m5 12 4 4L19 6" />
          ) : (
            <>
              <path d="M12 5v14M5 12h14" />
            </>
          )}
        </svg>
        {busy ? "Guardando..." : going ? "Voy a ir" : "Asistir"}
      </button>
      {message ? (
        <span
          role="status"
          className={`text-xs ${
            /no pudimos|desactivadas|demasiados|configurado/i.test(message)
              ? "text-rose-300"
              : "text-emerald-300"
          }`}
        >
          {message}
        </span>
      ) : null}
    </div>
  );
}
