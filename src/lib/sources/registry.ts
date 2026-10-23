import {
  fetchEventbrite,
  fetchGCBA,
  fetchPassline,
  fetchTicketmaster,
} from "@/lib/eventSources";
import { fetchJsonLdEvents } from "@/lib/sources/jsonld";
import type { IngestMode, SourceAdapter } from "@/lib/sources/types";

export const SOURCES: SourceAdapter[] = [
  {
    id: "gcba",
    name: "Agenda GCBA",
    coverage: "city",
    method: "api",
    allowedInProd: true,
    legalStatus: "ok",
    attribution: "Gobierno de la Ciudad de Buenos Aires",
    rateLimitMs: 800,
    cities: ["CABA"],
    notes: "API pública de la agenda oficial de la Ciudad.",
    fetch: fetchGCBA,
  },
  {
    id: "ticketmaster",
    name: "Ticketmaster",
    coverage: "national",
    method: "api",
    allowedInProd: true,
    legalStatus: "ok",
    attribution: "Ticketmaster",
    rateLimitMs: 600,
    notes: "Discovery API oficial. Requiere TICKETMASTER_API_KEY.",
    fetch: fetchTicketmaster,
  },
  {
    id: "eventbrite",
    name: "Eventbrite",
    coverage: "national",
    method: "jsonld",
    allowedInProd: true,
    legalStatus: "review",
    attribution: "Eventbrite",
    rateLimitMs: 1000,
    notes:
      "Se leen datos públicos de la página de descubrimiento. Revisar ToS antes de escalar.",
    fetch: fetchEventbrite,
  },
  {
    id: "passline",
    name: "Passline",
    coverage: "national",
    method: "api",
    allowedInProd: true,
    legalStatus: "review",
    attribution: "Passline",
    rateLimitMs: 1000,
    notes:
      "API pública sin documentación formal. Si Cloudflare bloquea Node, usa curl.",
    fetch: fetchPassline,
  },
  {
    id: "cultura",
    name: "Cultura Argentina",
    coverage: "national",
    method: "jsonld",
    allowedInProd: true,
    legalStatus: "review",
    attribution: "Ministerio de Cultura de la Nación",
    rateLimitMs: 1200,
    notes: "JSON-LD de la agenda nacional. Verificar cobertura por provincia.",
    fetch: () =>
      fetchJsonLdEvents("https://www.cultura.gob.ar/agenda/", "cultura"),
  },
  {
    id: "alternativa",
    name: "Alternativa Teatral",
    coverage: "city",
    method: "jsonld",
    allowedInProd: false,
    legalStatus: "review",
    attribution: "Alternativa Teatral",
    rateLimitMs: 1500,
    cities: ["CABA"],
    notes:
      "Experimental. Solo JSON-LD público; no se scrapean funciones ni precios internos.",
    fetch: () =>
      fetchJsonLdEvents(
        "https://www.alternativateatral.com/",
        "alternativa",
      ),
  },
  {
    id: "ticketek",
    name: "Ticketek",
    coverage: "national",
    method: "jsonld",
    allowedInProd: false,
    legalStatus: "review",
    attribution: "Ticketek Argentina",
    rateLimitMs: 2000,
    notes:
      "Experimental. Revisar ToS y robots.txt antes de habilitar en producción.",
    fetch: () =>
      fetchJsonLdEvents("https://www.ticketek.com.ar/", "ticketek"),
  },
  {
    id: "timeout",
    name: "Time Out Argentina",
    coverage: "city",
    method: "jsonld",
    allowedInProd: false,
    legalStatus: "review",
    attribution: "Time Out",
    rateLimitMs: 1500,
    cities: ["CABA"],
    notes:
      "Experimental. Contenido editorial: no copiar descripciones largas sin permiso.",
    fetch: () =>
      fetchJsonLdEvents("https://www.timeout.com.ar/", "timeout"),
  },
  {
    id: "plateanet",
    name: "Plateanet",
    coverage: "national",
    method: "jsonld",
    allowedInProd: false,
    legalStatus: "review",
    attribution: "Plateanet",
    rateLimitMs: 1500,
    notes:
      "Experimental. Priorizar link de compra y datos factuales; no copiar imágenes sin licencia.",
    fetch: () =>
      fetchJsonLdEvents("https://www.plateanet.com/", "plateanet"),
  },
];

export function getSources(mode: IngestMode): SourceAdapter[] {
  if (mode === "safe") {
    return SOURCES.filter((source) => source.allowedInProd);
  }

  // Experimental: incluye todo para poder probar el staging, pero el destino
  // siempre es events_staging y no se sirve en la app.
  return SOURCES;
}

export function findSource(id: string): SourceAdapter | undefined {
  return SOURCES.find((source) => source.id === id);
}
