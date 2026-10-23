import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "@/components/SiteHeader";
import { SOURCES } from "@/lib/sources/registry";

export const metadata: Metadata = {
  title: "Fuentes y políticas de datos",
  description:
    "De dónde salen los eventos de ¿Qué Sale? y cómo respetamos los términos de cada fuente.",
};

const METHOD_LABELS = {
  api: "API oficial",
  jsonld: "JSON-LD público",
  rss: "RSS",
  html: "HTML público",
} as const;

const LEGAL_LABELS = {
  ok: "Revisada",
  review: "En revisión",
  blocked: "No habilitada",
} as const;

export default function FuentesPage() {
  const safe = SOURCES.filter((source) => source.allowedInProd);
  const experimental = SOURCES.filter((source) => !source.allowedInProd);

  return (
    <div className="min-h-screen bg-zinc-950">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-12 sm:px-6 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
          Transparencia
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Fuentes y políticas de datos
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
          ¿Qué Sale? no inventa eventos: reúne información pública de agendas,
          APIs y sitios oficiales. Guardamos datos factuales y siempre enlazamos
          a la fuente original para que puedas confirmar horarios, precios y
          disponibilidad.
        </p>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/[0.025] p-6">
          <h2 className="text-base font-semibold text-white">Nuestros criterios</h2>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-zinc-400 sm:grid-cols-2">
            <li>· Priorizamos APIs oficiales y feeds JSON-LD públicos.</li>
            <li>· Respetamos límites de frecuencia y robots.txt.</li>
            <li>· No publicamos scraping experimental sin revisión manual.</li>
            <li>· No copiamos descripciones largas ni imágenes sin licencia.</li>
            <li>· Atribuimos la fuente y enlazamos al sitio original.</li>
            <li>· Corregimos o quitamos datos a pedido del titular.</li>
          </ul>
        </section>

        <section className="mt-10">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white">
              Pipeline de producción
            </h2>
            <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
              safe
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Solo fuentes habilitadas. La ingesta corre en GitHub Actions y
            escribe en Supabase.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {safe.map((source) => (
              <article
                key={source.id}
                className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold text-white">
                    {source.name}
                  </h3>
                  <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400">
                    {source.coverage === "national" ? "Nacional" : "Ciudad"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-violet-300">
                  {METHOD_LABELS[source.method]} ·{" "}
                  {LEGAL_LABELS[source.legalStatus]}
                </p>
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  {source.notes}
                </p>
                {source.attribution ? (
                  <p className="mt-2 text-[10px] text-zinc-600">
                    Atribución: {source.attribution}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white">
              Pipeline experimental
            </h2>
            <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
              staging
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Estos adaptadores escriben en <code>events_staging</code>. No se
            muestran en la app hasta revisar legalidad, calidad y atribución.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {experimental.map((source) => (
              <article
                key={source.id}
                className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.03] p-5"
              >
                <h3 className="text-sm font-semibold text-white">{source.name}</h3>
                <p className="mt-1 text-[11px] text-amber-300">
                  {METHOD_LABELS[source.method]} · En revisión
                </p>
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  {source.notes}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/[0.025] p-6">
          <h2 className="text-base font-semibold text-white">
            Correcciones y retiro de contenido
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Si sos organizador, ticketera o titular de derechos y encontrás un
            dato incorrecto o contenido que no querés que aparezca, escribinos a{" "}
            <a
              href="mailto:fuentes@quesale.ar"
              className="font-medium text-violet-300 hover:text-violet-200"
            >
              fuentes@quesale.ar
            </a>
            . Indicá el evento, la fuente y el motivo. Revisamos y respondemos a la
            brevedad.
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-500">
            <Link href="/legales/terminos" className="hover:text-white">
              Términos
            </Link>
            <Link href="/legales/privacidad" className="hover:text-white">
              Privacidad
            </Link>
            <Link href="/" className="hover:text-white">
              Volver a la agenda
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
