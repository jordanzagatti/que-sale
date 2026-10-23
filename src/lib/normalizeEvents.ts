import type { EventCategory } from "@/lib/types";
import type {
  Evento,
  EventSource,
  NormalizedEvent,
} from "@/lib/types";
import {
  CATEGORY_IMAGES,
  inferCategory as inferCategoryFromText,
} from "@/lib/categories";

type TicketmasterEvent = {
  id?: string | number;
  name?: string;
  dates?: {
    start?: {
      localDate?: string;
      dateTime?: string;
    };
  };
  _embedded?: {
    venues?: Array<{
      name?: string;
      city?: { name?: string };
      state?: { name?: string };
    }>;
  };
  classifications?: Array<{
    segment?: { name?: string };
    genre?: { name?: string };
    subGenre?: { name?: string };
  }>;
  priceRanges?: Array<{
    min?: number;
    max?: number;
    currency?: string;
  }>;
  images?: Array<{
    url?: string;
    ratio?: string;
    width?: number;
  }>;
};

type EventbriteEvent = {
  id?: string | number;
  name?: string | { text?: string };
  start?: {
    local?: string;
    utc?: string;
  };
  online_event?: boolean;
  venue?: {
    name?: string;
    address?: {
      city?: string;
      region?: string;
    };
  };
  category?: { name?: string };
  subcategory?: { name?: string };
  summary?: string;
  is_free?: boolean;
  ticket_availability?: {
    minimum_ticket_price?: {
      display?: string;
      major_value?: string;
    };
  };
  logo?: { url?: string } | string | null;
};

type GCBAEvent = {
  _id?: string | number;
  id?: string | number;
  nid?: string | number;
  slug?: string;
  evento?: string;
  nombre?: string;
  titulo?: string;
  title?: string;
  fecha_desde?: string;
  fecha?: string;
  fecha_inicio?: string;
  field_fecha?: string | number;
  field_fecha_1?: string | number;
  field_fecha_del_evento?: string | number;
  direccion?: string;
  piso_dpto?: string;
  barrio?: string;
  field_barrio?: string;
  descripcion?: string;
  field_content?: string;
  body?: string;
  arancel?: string | number;
  precio?: string | number;
  field_acceso?: string;
  field_tags?: string;
  field_tipo_de_evento?: string;
  imagen?: string | { url?: string; media_image?: string };
  image?: string | { url?: string; media_image?: string };
  field_image?: string | { url?: string; media_image?: string };
};

type MeetupEvent = {
  id?: string | number;
  title?: string;
  name?: string;
  dateTime?: string;
  start?: {
    local?: string;
    utc?: string;
  };
  description?: string;
  eventUrl?: string;
  venue?: {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
  } | null;
  image?: string | { url?: string };
  featuredEventPhoto?: string | { url?: string };
  displayPhoto?: string | { url?: string };
  feeSettings?: {
    amount?: number | string;
    currency?: string;
  } | null;
  isFree?: boolean;
};

type PasslineEvent = {
  id?: string | number;
  nombre?: string;
  titulo?: string;
  title?: string;
  slug?: string;
  url?: string;
  fecha_inicio?: string;
  fecha?: string;
  hora_inicio?: string;
  lugar?: string;
  nombre_communa?: string;
  nombre_region?: string;
  comuna?: string;
  region?: string;
  precio_min?: string | number;
  miniatura?: string;
  recorte?: string;
  image?: string | { url?: string };
  category_name?: string;
  categoria?: string;
  act_fullhome?: string;
};

const FALLBACK_IMAGES: Record<EventCategory, string> = CATEGORY_IMAGES;

/** Texto plano, sin tildes y en minusculas para comparar. */
function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function cleanText(value: unknown): string {
  if (typeof value === "number") return String(value);
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
}

function slugify(value: string): string {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function inferCategory(text: string): EventCategory {
  return inferCategoryFromText(text);
}

function pad(value: number | string): string {
  return String(value).padStart(2, "0");
}

function buildDate(year: number, month: number, day: number): string | null {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    year < 1900 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }

  return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * Normaliza cualquier fecha de las APIs a YYYY-MM-DD.
 * Acepta ISO, YYYY/MM/DD, DD/MM/YYYY y timestamps.
 */
function toDateOnly(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    // Las APIs de GCBA usan segundos; Ticketmaster/Passline suelen usar ms.
    const ms = value < 1e12 ? value * 1000 : value;
    const parsed = new Date(ms);
    if (Number.isNaN(parsed.getTime())) return null;
    return buildDate(
      parsed.getFullYear(),
      parsed.getMonth() + 1,
      parsed.getDate(),
    );
  }

  const text = String(value).trim();

  // Timestamps numéricos serializados como string (GCBA).
  if (/^\d{10,13}$/.test(text)) {
    const numeric = Number(text);
    const ms = text.length <= 10 ? numeric * 1000 : numeric;
    const parsed = new Date(ms);
    if (Number.isNaN(parsed.getTime())) return null;
    return buildDate(
      parsed.getFullYear(),
      parsed.getMonth() + 1,
      parsed.getDate(),
    );
  }

  const iso = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) {
    return buildDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  const dmy = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmy) {
    return buildDate(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]));
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return buildDate(
      parsed.getFullYear(),
      parsed.getMonth() + 1,
      parsed.getDate(),
    );
  }

  return null;
}

function todayDateOnly(): string {
  const now = new Date();
  return buildDate(now.getFullYear(), now.getMonth() + 1, now.getDate()) ||
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function toDateList(value: unknown): string[] {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [value];

  return values
    .map((item) => toDateOnly(item))
    .filter((item): item is string => Boolean(item))
    .sort();
}

/** Elige la próxima fecha de un evento recurrente de GCBA. */
function pickUpcomingDate(value: unknown): string | null {
  const dates = toDateList(value);
  if (dates.length === 0) return null;

  const today = todayDateOnly();
  return dates.find((date) => date >= today) ?? dates[dates.length - 1];
}

function formatAmount(value: number, currency?: string): string {
  const amount = new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(value);

  const code = cleanText(currency).toUpperCase();
  if (code && code !== "ARS") return `${code} ${amount}`;

  return `$${amount}`;
}

function parseAmount(value: string): number {
  let cleaned = value.replace(/[^\d.,-]/g, "");
  if (!cleaned) return Number.NaN;

  const hasDot = cleaned.includes(".");
  const hasComma = cleaned.includes(",");

  if (hasDot && hasComma) {
    // 1.200,50 (es-AR) o 1,200.50 (en-US).
    if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (hasComma) {
    cleaned = cleaned.replace(",", ".");
  } else if (hasDot) {
    const parts = cleaned.split(".");

    if (parts.length > 2) {
      // 1.200.000
      cleaned = parts.join("");
    } else if (parts[1].length === 3 && parts[0].length <= 3) {
      // 12.000
      cleaned = parts.join("");
    }
  }

  return Number(cleaned);
}

function formatPrice(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Consultar";

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "Consultar";
    if (value <= 0) return "Entrada libre";
    return formatAmount(value);
  }

  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    const candidate =
      object.display ??
      object.major_value ??
      object.min ??
      object.value ??
      object.amount;

    if (candidate === undefined) return "Consultar";
    return formatPrice(candidate);
  }

  const text = cleanText(value);
  if (!text) return "Consultar";

  const lower = normalizeText(text);
  if (
    lower === "gratis" ||
    lower === "gratuito" ||
    lower === "gratuita" ||
    lower === "libre" ||
    lower === "free" ||
    lower === "sin cargo" ||
    lower === "sin costo" ||
    lower === "entrada libre" ||
    lower === "entrada gratuita"
  ) {
    return "Entrada libre";
  }

  if (lower === "con entrada paga" || lower === "entrada paga") {
    return "Consultar";
  }

  const numeric = parseAmount(text);

  if (Number.isFinite(numeric) && numeric > 0) return formatAmount(numeric);

  return text;
}

function formatTicketmasterPrice(priceRanges: unknown): string {
  if (!Array.isArray(priceRanges) || priceRanges.length === 0) {
    return "Consultar";
  }

  const range = priceRanges[0] as Record<string, unknown>;
  const min = Number(range?.min);

  if (!Number.isFinite(min)) return formatPrice(range?.max);
  if (min <= 0) return "Entrada libre";

  return formatAmount(min, cleanText(range?.currency));
}

function pickImage(value: unknown): string {
  if (typeof value === "string") return cleanText(value);

  if (Array.isArray(value)) {
    const images = value.filter(
      (image): image is Record<string, unknown> =>
        Boolean(image) && typeof image === "object",
    );

    const withUrl = images.filter(
      (image) => typeof image.url === "string" && image.url.length > 0,
    );

    const preferred = withUrl
      .filter((image) => image.ratio === "16_9")
      .sort((a, b) => Number(b.width ?? 0) - Number(a.width ?? 0))[0];

    if (preferred?.url) return String(preferred.url);
    if (withUrl[0]?.url) return String(withUrl[0].url);
    return "";
  }

  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return pickImage(
      object.url ??
        object.media_image ??
        object.image ??
        object.miniatura ??
        object.recorte,
    );
  }

  return "";
}

function sourceId(
  source: {
    _id?: string | number;
    id?: string | number;
    nid?: string | number;
    slug?: string;
  },
  prefix: string,
  titulo: string,
  fecha: string,
): string {
  const raw = source._id ?? source.id ?? source.nid ?? source.slug;
  if (raw !== null && raw !== undefined && String(raw).trim() !== "") {
    const id = String(raw).trim();
    return id.startsWith(`${prefix}-`) ? id : `${prefix}-${id}`;
  }

  return `${prefix}-${slugify(titulo) || "evento"}-${fecha}`;
}

function normalizeTicketmaster(source: TicketmasterEvent): NormalizedEvent | null {
  const titulo = cleanText(source?.name);
  const fecha = toDateOnly(
    source?.dates?.start?.localDate ?? source?.dates?.start?.dateTime,
  );

  if (!titulo || !fecha) return null;

  const venue = source?._embedded?.venues?.[0];
  const classification = source?.classifications?.[0];
  const categoryText = [
    titulo,
    classification?.segment?.name,
    classification?.genre?.name,
    classification?.subGenre?.name,
  ]
    .filter(Boolean)
    .join(" ");
  const categoria = inferCategory(categoryText);

  const lugar = cleanText(venue?.name) || "Buenos Aires";
  const barrio =
    cleanText(venue?.city?.name) || cleanText(venue?.state?.name) || "CABA";
  const imagen = pickImage(source?.images) || FALLBACK_IMAGES[categoria];

  return {
    id: sourceId(source, "tm", titulo, fecha),
    titulo,
    fecha,
    lugar,
    barrio,
    categoria,
    precio: formatTicketmasterPrice(source?.priceRanges),
    imagen,
    fuente: "ticketmaster",
  };
}

function normalizeEventbrite(source: EventbriteEvent): NormalizedEvent | null {
  const titulo =
    typeof source?.name === "string"
      ? cleanText(source.name)
      : cleanText(source?.name?.text);
  const fecha = toDateOnly(source?.start?.local ?? source?.start?.utc);

  if (!titulo || !fecha) return null;

  const venue = source?.venue;
  const lugar =
    cleanText(venue?.name) ||
    (source?.online_event ? "Evento online" : "Buenos Aires");
  const barrio =
    cleanText(venue?.address?.city) ||
    cleanText(venue?.address?.region) ||
    "CABA";
  const categoria = inferCategory(
    [titulo, source?.category?.name, source?.subcategory?.name, source?.summary]
      .filter(Boolean)
      .join(" "),
  );

  const price = source?.is_free
    ? "Entrada libre"
    : formatPrice(
        source?.ticket_availability?.minimum_ticket_price?.display ??
          source?.ticket_availability?.minimum_ticket_price?.major_value,
      );

  const imagen =
    pickImage(source?.logo) || FALLBACK_IMAGES[categoria];

  return {
    id: sourceId(source, "eb", titulo, fecha),
    titulo,
    fecha,
    lugar,
    barrio,
    categoria,
    precio: price,
    imagen,
    fuente: "eventbrite",
  };
}

const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  aacute: "á",
  eacute: "é",
  iacute: "í",
  oacute: "ó",
  uacute: "ú",
  ntilde: "ñ",
  nbsp: " ",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
};

function decodeHtml(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&([a-z]+);/gi, (match, name: string) => {
      return HTML_ENTITIES[name.toLowerCase()] ?? match;
    })
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractGCBAPlace(source: GCBAEvent): string {
  const html = cleanText(source?.field_content ?? source?.body);
  if (!html) return "";

  const labels = ["Dónde", "Donde", "Dirección", "Direccion", "Lugar", "Sede"];

  for (const label of labels) {
    const match = html.match(
      new RegExp(`${label}\\s*:?\\s*(?:<\\/strong>)?\\s*([^<\\n]+)`, "i"),
    );

    if (match?.[1]) {
      const place = decodeHtml(match[1]);
      if (place.length > 2) return place;
    }
  }

  return "";
}

function normalizeGCBA(source: GCBAEvent): NormalizedEvent | null {
  const titulo = cleanText(
    source?.title ?? source?.evento ?? source?.nombre ?? source?.titulo,
  );
  const fecha =
    pickUpcomingDate(source?.field_fecha_del_evento) ??
    toDateOnly(
      source?.field_fecha ??
        source?.fecha_desde ??
        source?.fecha ??
        source?.fecha_inicio,
    );

  if (!titulo || !fecha) return null;

  const direccion = [cleanText(source?.direccion), cleanText(source?.piso_dpto)]
    .filter(Boolean)
    .join(" ");
  const lugar =
    direccion || extractGCBAPlace(source) || "Buenos Aires";
  const barrio = cleanText(source?.field_barrio ?? source?.barrio) || "CABA";
  const categoria = inferCategory(
    [
      titulo,
      source?.descripcion,
      source?.field_tags,
      source?.field_tipo_de_evento,
    ]
      .filter(Boolean)
      .join(" "),
  );
  const acceso = cleanText(source?.field_acceso);

  return {
    id: sourceId(source, "gcba", titulo, fecha),
    titulo,
    fecha,
    lugar,
    barrio,
    categoria,
    precio: acceso
      ? formatPrice(acceso)
      : formatPrice(source?.arancel ?? source?.precio),
    imagen:
      pickImage(source?.field_image ?? source?.imagen ?? source?.image) ||
      FALLBACK_IMAGES[categoria],
    fuente: "gcba",
  };
}

function normalizeMeetup(source: MeetupEvent): NormalizedEvent | null {
  const titulo = cleanText(source?.title ?? source?.name);
  const fecha = toDateOnly(
    source?.dateTime ?? source?.start?.local ?? source?.start?.utc,
  );

  if (!titulo || !fecha) return null;

  const venue = source?.venue;
  const lugar =
    cleanText(venue?.name) || cleanText(venue?.address) || "Buenos Aires";
  const barrio = cleanText(venue?.city) || cleanText(venue?.state) || "CABA";
  const descripcion = cleanText(source?.description);
  const categoria = inferCategory(
    [titulo, descripcion, source?.eventUrl].filter(Boolean).join(" "),
  );
  const precio = source?.isFree
    ? "Entrada libre"
    : formatPrice(source?.feeSettings?.amount);

  return {
    id: sourceId(source, "meetup", titulo, fecha),
    titulo,
    fecha,
    lugar,
    barrio,
    categoria,
    precio,
    imagen:
      pickImage(
        source?.image ?? source?.featuredEventPhoto ?? source?.displayPhoto,
      ) || FALLBACK_IMAGES[categoria],
    fuente: "meetup",
  };
}

function normalizePassline(source: PasslineEvent): NormalizedEvent | null {
  const titulo = cleanText(source?.nombre ?? source?.titulo ?? source?.title);
  const fecha = toDateOnly(source?.fecha_inicio ?? source?.fecha);

  if (!titulo || !fecha) return null;

  const lugar = cleanText(source?.lugar) || "Buenos Aires";
  const barrio =
    cleanText(source?.nombre_communa) ||
    cleanText(source?.nombre_region) ||
    "CABA";
  const categoria = inferCategory(
    [titulo, source?.category_name, source?.categoria, source?.lugar]
      .filter(Boolean)
      .join(" "),
  );

  return {
    id: sourceId(source, "passline", titulo, fecha),
    titulo,
    fecha,
    lugar,
    barrio,
    categoria,
    precio: formatPrice(source?.precio_min),
    imagen:
      pickImage(source?.miniatura ?? source?.recorte ?? source?.image) ||
      FALLBACK_IMAGES[categoria],
    fuente: "passline",
    destacado: source?.act_fullhome === "1" ? true : undefined,
  };
}

/**
 * Convierte una respuesta cruda de cualquiera de las fuentes
 * al formato que consume la UI. Devuelve null si no hay datos utiles.
 */
export function normalizeEvent(
  source: unknown,
  fuente: EventSource,
): NormalizedEvent | null {
  try {
    if (!source || typeof source !== "object") return null;

    if (fuente === "ticketmaster") {
      return normalizeTicketmaster(source as TicketmasterEvent);
    }
    if (fuente === "eventbrite") {
      return normalizeEventbrite(source as EventbriteEvent);
    }
    if (fuente === "gcba") {
      return normalizeGCBA(source as GCBAEvent);
    }
    if (fuente === "meetup") {
      return normalizeMeetup(source as MeetupEvent);
    }
    if (fuente === "passline") {
      return normalizePassline(source as PasslineEvent);
    }

    return null;
  } catch (error) {
    console.error("[normalizeEvent] error", fuente, error);
    return null;
  }
}

const SOURCE_PREFIX: Record<EventSource, string> = {
  ticketmaster: "tm",
  gcba: "gcba",
  eventbrite: "eb",
  meetup: "meetup",
  passline: "passline",
  cultura: "cultura",
  alternativa: "alternativa",
  ticketek: "ticketek",
  timeout: "timeout",
  plateanet: "plateanet",
  jsonld: "jsonld",
  manual: "manual",
  unknown: "unknown",
};

/**
 * Normaliza el `Partial<Evento>` que devuelven los fetchers de
 * eventSources.ts. Completa barrio/categoría/precio/imagen y descarta
 * eventos sin título o sin fecha válida.
 */
export function normalizePartialEvent(
  source: Partial<Evento>,
  fuente: EventSource,
): NormalizedEvent | null {
  try {
    const titulo = cleanText(source.titulo);
    const fecha = toDateOnly(source.fecha);
    if (!titulo || !fecha) return null;

    const lugar = cleanText(source.lugar) || "Buenos Aires";
    const barrio = cleanText(source.barrio) || "CABA";
    const categoria = inferCategory(
      [titulo, source.descripcion, source.categoria, source.lugar]
        .filter(Boolean)
        .join(" "),
    );
    const precio = cleanText(source.precio);
    const imagen = pickImage(source.imagen) || FALLBACK_IMAGES[categoria];

    return {
      id: sourceId(
        { id: source.id, slug: slugify(titulo) },
        SOURCE_PREFIX[fuente],
        titulo,
        fecha,
      ),
      slug: `${slugify(titulo) || "evento"}-${fecha}`,
      titulo,
      fecha,
      startsAt: source.inicio,
      endsAt: source.fin,
      lugar,
      barrio,
      ciudad: cleanText(source.ciudad) || undefined,
      provincia: cleanText(source.provincia) || undefined,
      categoria,
      precio: precio ? formatPrice(precio) : "Consultar",
      imagen,
      destacado: source.destacado === true ? true : undefined,
      fuente,
      descripcion: cleanText(source.descripcion) || undefined,
      urlFuente: cleanText(source.url) || undefined,
      urlEntrada: cleanText(source.urlEntrada) || undefined,
      lat: Number.isFinite(source.lat) ? source.lat : undefined,
      lng: Number.isFinite(source.lng) ? source.lng : undefined,
      esGratis: source.esGratis,
      sourceId: source.id ? String(source.id) : undefined,
    };
  } catch (error) {
    console.error("[normalizePartialEvent] error", fuente, error);
    return null;
  }
}
