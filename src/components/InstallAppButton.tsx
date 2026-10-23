"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

export function InstallAppButton() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [iosHint] = useState(
    () =>
      typeof navigator !== "undefined" &&
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !isStandalone(),
  );

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;

    if (choice.outcome === "accepted") {
      setInstalled(true);
      setPrompt(null);
    }
  }

  if (installed) {
    return (
      <p className="text-xs text-emerald-300">
        La app ya está instalada en este dispositivo.
      </p>
    );
  }

  return (
    <div>
      {prompt ? (
        <button
          type="button"
          onClick={install}
          className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-xs font-semibold text-zinc-200 transition hover:border-violet-400/30 hover:text-white"
        >
          Instalar app
        </button>
      ) : iosHint ? (
        <p className="text-xs leading-5 text-zinc-500">
          Para instalar en iPhone: Compartir → “Agregar a inicio”.
        </p>
      ) : (
        <p className="text-xs leading-5 text-zinc-500">
          Podés instalar la app desde el menú del navegador (“Instalar” o
          “Agregar a pantalla de inicio”).
        </p>
      )}
    </div>
  );
}
