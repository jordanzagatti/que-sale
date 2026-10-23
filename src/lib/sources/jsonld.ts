import type { Evento, EventSource } from "@/lib/types";

const USER_AGENT =
  "Mozilla/5.0 (compatible; QueSaleBot/1.0; +https://quesale.ar/bot)";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value == null ? [] : [value];
}

function str(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function cleanHtml(value: unknown): string {
  return str(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function toDateOnly(value: unknown): string | null {
  const text = str(value);
  if (!text) return null;
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  }
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function pickImage(value: unknown): string {
  if (typeof value === "string") return value;
  const record = asRecord(value);
  if (record) return str(record.url) || str(record.contentUrl);
  const first = asArray(value)[0];
  return typeof first === "string" ? first : pickImage(first);
}

function getTypes(value: unknown): string[] {
  return asArray(value)
    .map((item) => str(item))
    .filter(Boolean);
}

function collectEventNodes(value: unknown, output: Record<string, unknown>[]) {
  if (Array.isArray(value)) {
    for (const item of value) collectEventNodes(item, output);
    return;
  }

  const record = asRecord(value);
  if (!record) return;

  const types = getTypes(record["@type"]);
  if (types.some((type) => type === "Event" || type.endsWith("/Event"))) {
    output.push(record);
  }

  if (record["@graph"]) collectEventNodes(record["@graph"], output);
  if (record.itemListElement) collectEventNodes(record.itemListElement, output);
  if (record.item) collectEventNodes(record.item, output);
}

function parseJsonLd(html: string): Record<string, unknown>[] {
  const scripts = [
    ...html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ];
  const nodes: Record<string, unknown>[] = [];

  for (const script of scripts) {
    const raw = script[1]?.trim();
    if (!raw) continue;
    try {
      collectEventNodes(JSON.parse(raw), nodes);
    } catch {
      // Algunos sitios mandan JSON-LD inválido; lo ignoramos.
    }
  }

  return nodes;
}

function mapLocation(value: unknown): {
  place: string;
  address: string;
  city: string;
  province: string;
  lat?: number;
  lng?: number;
} {
  const record = asRecord(value);
  if (!record) {
    return { place: "", address: "", city: "", province: "" };
  }

  const addressRecord = asRecord(record.address);
  const geo = asRecord(record.geo);
  const lat = Number(geo?.latitude);
  const lng = Number(geo?.longitude);

  return {
    place: str(record.name),
    address: addressRecord
      ? [
          str(addressRecord.streetAddress),
          str(addressRecord.addressLocality),
          str(addressRecord.addressRegion),
        ]
          .filter(Boolean)
          .join(", ")
      : str(record.address),
    city: addressRecord ? str(addressRecord.addressLocality) : "",
    province: addressRecord ? str(addressRecord.addressRegion) : "",
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
  };
}

function mapOffer(value: unknown): {
  price?: string;
  url?: string;
  free?: boolean;
} {
  const record = asRecord(asArray(value)[0]);
  if (!record) return {};

  const price = Number(record.price);
  return {
    price: Number.isFinite(price)
      ? price <= 0
        ? "Entrada libre"
        : `$${new Intl.NumberFormat("es-AR").format(price)}`
      : undefined,
    url: str(record.url) || undefined,
    free: Number.isFinite(price) && price <= 0 ? true : undefined,
  };
}

/**
 * Lee eventos desde JSON-LD público. No ejecuta JS ni sigue links internos:
 * solo datos estructurados que el sitio ya publica para buscadores.
 */
export async function fetchJsonLdEvents(
  url: string,
  source: EventSource,
  options: { timeoutMs?: number; limit?: number } = {},
): Promise<Partial<Evento>[]> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 10000,
  );

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn(`[jsonld] ${res.status} ${url}`);
      return [];
    }

    const html = await res.text();
    const nodes = parseJsonLd(html);
    const events: Partial<Evento>[] = [];

    for (const node of nodes.slice(0, options.limit ?? 100)) {
      const titulo = cleanHtml(node.name);
      const fecha = toDateOnly(node.startDate);
      if (!titulo || !fecha) continue;

      const location = mapLocation(node.location);
      const offer = mapOffer(node.offers);
      const organizer = asRecord(node.organizer);

      events.push({
        id: str(node["@id"]) || str(node.identifier) || undefined,
        titulo,
        descripcion: cleanHtml(node.description) || undefined,
        fecha,
        inicio: str(node.startDate) || undefined,
        fin: str(node.endDate) || undefined,
        lugar: location.place || location.address || "Argentina",
        barrio: location.city || location.province || "Argentina",
        ciudad: location.city || undefined,
        provincia: location.province || undefined,
        direccion: location.address || undefined,
        lat: location.lat,
        lng: location.lng,
        precio: offer.price,
        esGratis: offer.free,
        imagen: pickImage(node.image) || undefined,
        fuente: source,
        url: str(node.url) || url,
        urlEntrada: offer.url || str(node.url) || url,
        organizador: str(organizer?.name) || undefined,
        categoriaFuente: getTypes(node["@type"]).join(","),
      });
    }

    console.log(`[jsonld] ${source} ${events.length} (${url})`);
    return events;
  } catch (error) {
    console.warn(
      `[jsonld] failed ${source}`,
      error instanceof Error ? error.message : error,
    );
    return [];
  } finally {
    clearTimeout(timer);
  }
}
