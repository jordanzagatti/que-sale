"use client";

import { useState } from "react";

export function ShareButton({
  title,
  shareToken,
  isPrivate,
}: {
  title: string;
  shareToken?: string | null;
  isPrivate?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  function buildUrl() {
    const base = window.location.origin;
    const path = window.location.pathname;
    if (isPrivate && shareToken) {
      return `${base}${path}?t=${shareToken}`;
    }
    return `${base}${path}`;
  }

  async function share() {
    const url = buildUrl();

    try {
      if (navigator.share) {
        await navigator.share({ title, text: `${title} · ¿Qué Sale?`, url });
        return;
      }

      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      // El usuario canceló el share o el navegador bloqueó el portapapeles.
    }
  }

  async function shareWhatsApp() {
    const url = buildUrl();
    const text = encodeURIComponent(`${title} · ¿Qué Sale?\n${url}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={share}
        className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 text-sm font-medium text-zinc-200 transition hover:border-violet-400/40 hover:text-white"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" />
        </svg>
        {copied ? "Link copiado" : "Compartir"}
      </button>
      <button
        type="button"
        onClick={shareWhatsApp}
        className="inline-flex h-11 items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-5 text-sm font-medium text-emerald-200 transition hover:bg-emerald-400/20"
      >
        WhatsApp
      </button>
    </div>
  );
}
