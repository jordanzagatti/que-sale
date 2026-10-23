"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { authErrorMessage } from "@/lib/auth-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Status = "idle" | "sending" | "sent" | "anonymous";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2a7 7 0 0 1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.4 14.4a7.2 7.2 0 0 1 0-4.8V6.5H1.4a12 12 0 0 0 0 11l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.4 6.5l4 3.1A7 7 0 0 1 12 4.8Z"
      />
    </svg>
  );
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [hasSession, setHasSession] = useState(false);
  const callbackFailed = Boolean(searchParams.get("error"));
  const displayError =
    error ||
    (callbackFailed
      ? "No pudimos completar el ingreso. El link puede haber vencido; probá de nuevo."
      : "");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getUser().then(({ data }) => {
      setHasSession(Boolean(data.user));
    });
  }, []);

  async function sendMagicLink(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim() || status === "sending") return;

    setStatus("sending");
    setError("");
    setMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/cuenta`,
        },
      });
      if (authError) throw authError;

      setStatus("sent");
      setMessage(
        `Te mandamos un link a ${email.trim()}. Revisá también la carpeta de spam.`,
      );
    } catch (caught) {
      setStatus("idle");
      setError(authErrorMessage(caught));
    }
  }

  async function continueWithGoogle() {
    setError("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/cuenta`,
        },
      });
      if (authError) throw authError;
    } catch (caught) {
      setError(authErrorMessage(caught));
    }
  }

  async function continueAnonymously() {
    setStatus("anonymous");
    setError("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInAnonymously();
      if (authError) throw authError;
      router.push("/cuenta");
      router.refresh();
    } catch (caught) {
      setStatus("idle");
      setError(authErrorMessage(caught));
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-3xl border border-white/10 bg-zinc-900/60 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
          Tu agenda personal
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
          Guardá eventos y no te pierdas nada
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Marcá “Asistir”, seguí tus lugares favoritos y recibí recordatorios 24
          horas y 2 horas antes.
        </p>

        {hasSession ? (
          <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
            <p className="text-sm text-emerald-200">
              Ya tenés una sesión activa en este dispositivo.
            </p>
            <Link
              href="/cuenta"
              className="mt-3 inline-flex h-10 items-center rounded-full bg-emerald-400 px-5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300"
            >
              Ir a Mi agenda
            </Link>
          </div>
        ) : null}

        <form onSubmit={sendMagicLink} className="mt-6 space-y-3">
          <label htmlFor="email" className="block text-xs font-medium text-zinc-300">
            Tu email
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="vos@email.com"
              className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-violet-400/50 focus:ring-4 focus:ring-violet-500/10"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-violet-500 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:bg-violet-400 disabled:opacity-60"
            >
              {status === "sending" ? "Enviando..." : "Entrar"}
            </button>
          </div>
          <p className="text-[11px] leading-5 text-zinc-500">
            Te enviamos un link mágico. No necesitás contraseña.
          </p>
        </form>

        {message ? (
          <p
            role="status"
            className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-xs leading-5 text-emerald-200"
          >
            {message}
          </p>
        ) : null}

        {displayError ? (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-xs leading-5 text-rose-200"
          >
            {displayError}
          </p>
        ) : null}

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-white/10" />
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-600">
            o continuá con
          </span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={continueWithGoogle}
            className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white px-4 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100"
          >
            <GoogleIcon />
            Google
          </button>

          <button
            type="button"
            onClick={continueAnonymously}
            disabled={status === "anonymous"}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-zinc-200 transition hover:border-violet-400/30 hover:text-white disabled:opacity-60"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-violet-300"
            >
              <path d="M20 21a8 8 0 0 0-16 0" />
              <circle cx="12" cy="8" r="5" />
            </svg>
            {status === "anonymous" ? "Entrando..." : "Probar sin registrarme"}
          </button>
        </div>

        <p className="mt-6 text-center text-[11px] leading-5 text-zinc-600">
          Al continuar aceptás los{" "}
          <Link href="/legales/terminos" className="text-zinc-400 hover:text-white">
            términos
          </Link>{" "}
          y la{" "}
          <Link href="/legales/privacidad" className="text-zinc-400 hover:text-white">
            política de privacidad
          </Link>
          .
        </p>
      </div>

      <p className="mt-5 text-center text-xs text-zinc-500">
        ¿Solo querés mirar?{" "}
        <Link href="/" className="font-medium text-zinc-300 hover:text-white">
          Volver a la agenda
        </Link>
      </p>
    </div>
  );
}
