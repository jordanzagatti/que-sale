"use client";

import { useEffect, useState } from "react";

import { authErrorMessage, ensureUser, getCurrentUser } from "@/lib/auth-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { NormalizedEvent } from "@/lib/types";

type FollowKind = "venue" | "category" | "city";

type FollowOption = {
  kind: FollowKind;
  value: string;
  label: string;
};

function optionsFor(event: NormalizedEvent): FollowOption[] {
  const options: FollowOption[] = [
    { kind: "venue", value: event.lugar, label: `Seguir ${event.lugar}` },
    { kind: "category", value: event.categoria, label: `Seguir ${event.categoria}` },
    {
      kind: "city",
      value: event.ciudad || "CABA",
      label: `Seguir ${event.ciudad || "CABA"}`,
    },
  ];

  return options.filter((option) => option.value.length > 1);
}

export function FollowButtons({ event }: { event: NormalizedEvent }) {
  const options = optionsFor(event);
  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const user = await getCurrentUser();
      if (!user) return;

      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from("follows")
        .select("kind, value")
        .eq("user_id", user.id);

      if (cancelled || !data) return;

      const next: Record<string, boolean> = {};
      for (const row of data) {
        next[`${row.kind}:${row.value}`] = true;
      }
      setFollowed(next);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle(option: FollowOption) {
    const key = `${option.kind}:${option.value}`;
    if (busy) return;
    setBusy(key);
    setMessage("");

    const next = !followed[key];
    setFollowed((current) => ({ ...current, [key]: next }));

    try {
      const user = await ensureUser();
      const supabase = createSupabaseBrowserClient();

      if (next) {
        const { error } = await supabase.from("follows").upsert(
          {
            user_id: user.id,
            kind: option.kind,
            value: option.value,
            label: option.value,
          },
          { onConflict: "user_id,kind,value" },
        );
        if (error) throw error;
        setMessage(`Vas a recibir novedades de ${option.value}`);
      } else {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("user_id", user.id)
          .eq("kind", option.kind)
          .eq("value", option.value);
        if (error) throw error;
        setMessage(`Dejaste de seguir ${option.value}`);
      }

      window.dispatchEvent(new Event("quesale:follows-changed"));
    } catch (error) {
      setFollowed((current) => ({ ...current, [key]: !next }));
      setMessage(authErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const key = `${option.kind}:${option.value}`;
          const active = followed[key] === true;

          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(option)}
              disabled={busy === key}
              aria-pressed={active}
              className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-xs font-medium transition disabled:opacity-60 ${
                active
                  ? "border-violet-400/40 bg-violet-500/15 text-violet-200"
                  : "border-white/10 bg-white/5 text-zinc-300 hover:border-violet-400/30 hover:text-white"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  active ? "bg-violet-400" : "bg-zinc-500"
                }`}
              />
              {active ? "Siguiendo" : "Seguir"} {option.value}
            </button>
          );
        })}
      </div>
      {message ? (
        <span className="text-xs text-zinc-400" role="status">
          {message}
        </span>
      ) : null}
    </div>
  );
}
