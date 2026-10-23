"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    output[index] = rawData.charCodeAt(index);
  }

  return output;
}

type PushState = "unknown" | "unsupported" | "off" | "on" | "denied";

export function PushManager({ userId }: { userId: string }) {
  const [state, setState] = useState<PushState>("unknown");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [iosHint, setIosHint] = useState(false);
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setState("unsupported");
        return;
      }

      const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        Boolean(
          (navigator as Navigator & { standalone?: boolean }).standalone,
        );

      if (isIos && !standalone) {
        setIosHint(true);
      }

      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }

      try {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        if (!cancelled) setState(subscription ? "on" : "off");
      } catch {
        if (!cancelled) setState("off");
      }
    }

    void check();

    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    if (busy) return;

    if (!vapidKey) {
      setMessage(
        "Falta configurar NEXT_PUBLIC_VAPID_PUBLIC_KEY para activar los recordatorios.",
      );
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        setMessage("No diste permiso para mostrar notificaciones.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        }));

      const payload = subscription.toJSON();
      if (!payload.endpoint || !payload.keys?.p256dh || !payload.keys?.auth) {
        throw new Error("Suscripción push incompleta");
      }

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          subscription: {
            endpoint: payload.endpoint,
            keys: {
              p256dh: payload.keys.p256dh,
              auth: payload.keys.auth,
            },
          },
          userAgent: navigator.userAgent,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error ?? "No pudimos guardar la suscripción");
      }

      setState("on");
      setMessage("Listo. Te avisamos 24 horas y 2 horas antes de cada evento.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No pudimos activar las notificaciones.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (busy) return;
    setBusy(true);
    setMessage("");

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }

      setState("off");
      setMessage("Desactivamos los recordatorios en este dispositivo.");
    } catch {
      setMessage("No pudimos desactivar las notificaciones.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Recordatorios push
          </h3>
          <p className="mt-1 text-xs leading-5 text-zinc-400">
            Te avisamos 24 horas y 2 horas antes de los eventos que marcaste
            como “Voy”.
          </p>
        </div>

        <span
          className={`mt-0.5 shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
            state === "on"
              ? "bg-emerald-400/15 text-emerald-200"
              : "bg-white/5 text-zinc-400"
          }`}
        >
          {state === "on" ? "Activados" : state === "denied" ? "Bloqueados" : "Apagados"}
        </span>
      </div>

      {iosHint ? (
        <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-[11px] leading-5 text-amber-100">
          En iPhone, primero agregá la app a la pantalla de inicio (Compartir →
          “Agregar a inicio”). Las notificaciones web solo funcionan así en iOS.
        </p>
      ) : null}

      {state === "unsupported" ? (
        <p className="mt-3 text-xs text-zinc-500">
          Este navegador no soporta notificaciones push. Probá con Chrome,
          Edge o Safari actualizado.
        </p>
      ) : state === "denied" ? (
        <p className="mt-3 text-xs leading-5 text-zinc-500">
          Bloqueaste las notificaciones para este sitio. Podés habilitarlas
          desde la configuración del navegador.
        </p>
      ) : (
        <div className="mt-4">
          <button
            type="button"
            disabled={busy || state === "unknown"}
            onClick={state === "on" ? disable : enable}
            className={`inline-flex h-9 items-center rounded-full px-4 text-xs font-semibold transition disabled:opacity-60 ${
              state === "on"
                ? "border border-white/10 bg-white/5 text-zinc-200 hover:text-white"
                : "bg-violet-500 text-white shadow-lg shadow-violet-500/20 hover:bg-violet-400"
            }`}
          >
            {busy
              ? "Guardando..."
              : state === "on"
                ? "Desactivar en este dispositivo"
                : "Activar notificaciones"}
          </button>
        </div>
      )}

      {message ? (
        <p className="mt-3 text-xs leading-5 text-zinc-400" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
