import Link from "next/link";

import { SiteHeader } from "@/components/SiteHeader";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <SiteHeader />
      <main className="mx-auto flex max-w-xl flex-col items-center px-5 py-24 text-center sm:px-6">
        <span className="text-6xl font-semibold tracking-tighter text-white/10">
          404
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white">
          No encontramos esta página
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-400">
          El evento puede haber terminado, cambiado de fecha o el enlace está
          mal. Probá buscar de nuevo en la agenda.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-full bg-violet-500 px-5 text-sm font-semibold text-white transition hover:bg-violet-400"
          >
            Ver eventos
          </Link>
          <Link
            href="/mapa"
            className="inline-flex h-10 items-center rounded-full border border-white/10 bg-white/5 px-5 text-sm font-medium text-zinc-200 transition hover:text-white"
          >
            Abrir mapa
          </Link>
        </div>
      </main>
    </div>
  );
}
