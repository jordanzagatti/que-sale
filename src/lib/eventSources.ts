import type { Evento } from "./types";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const GCBA_URLS = [
  "https://disfrutemosba.buenosaires.gob.ar/api/agenda?limit=100",
  "https://cdn.buenosaires.gob.ar/datosabiertos/EventosBA/eventos.json",
  // API que hoy responde de verdad (las dos de arriba están 404/caídas).
  "https://buenosaires.gob.ar/api/v1/eventos?limit=50",
];

const EVENTBRITE_URL =
  "https://www.eventbrite.com/d/argentina--buenos-aires/events/";

const PASSLINE_PAGE_URL = "https://www.passline.com/buenos-aires";
const PASSLINE_API_URL =
  "https://api.passline.com/v1/event/GetCountryByBillboardHome";

async function safeFetch(
  url: string,
  options: RequestInit = {},
  ms = 4000,
): Promise<Response | null> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        ...((options.headers as Record<string, string> | undefined) ?? {}),
      },
    });

    clearTimeout(id);

    if (!res.ok) {
      console.log(`[eventSources] ${res.status} ${url}`);
      return null;
    }

    return res;
  } catch (error) {
    clearTimeout(id);
    console.warn(
      "[eventSources] fetch failed",
      url,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Algunas APIs (Eventbrite) mandan objetos JSON serializados como string. */
function jsonRecord(value: unknown): Record<string, unknown> | null {
  const direct = asRecord(value);
  if (direct) return direct;

  if (typeof value === "string") {
    try {
      return asRecord(JSON.parse(value));
    } catch {
      return null;
    }
  }

  return null;
}

function str(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
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

function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&([a-z]+);/gi, (match, name: string) => {
      return HTML_ENTITIES[name.toLowerCase()] ?? match;
    });
}

function cleanHtml(value: string): string {
  return decodeEntities(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function dateFromParts(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Normaliza fechas de las APIs a YYYY-MM-DD. */
function toDateOnly(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    const ms = value < 1e12 ? value * 1000 : value;
    const date = new Date(ms);
    if (Number.isNaN(date.getTime())) return null;
    return dateFromParts(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
    );
  }

  const raw = String(value).trim();

  if (/^\d{10,13}$/.test(raw)) {
    return toDateOnly(Number(raw));
  }

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return dateFromParts(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) {
    return dateFromParts(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]));
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;

  return dateFromParts(
    parsed.getFullYear(),
    parsed.getMonth() + 1,
    parsed.getDate(),
  );
}

/** Elige la próxima fecha de un evento recurrente (lista de timestamps). */
function pickUpcomingDate(value: unknown): string | null {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [value];

  const dates = values
    .map(toDateOnly)
    .filter((date): date is string => Boolean(date))
    .sort();

  if (dates.length === 0) return null;

  const today = toDateOnly(new Date());
  if (!today) return dates[0];

  return dates.find((date) => date >= today) ?? dates[dates.length - 1];
}

function extractPlace(html: string): string {
  const decoded = decodeEntities(html);
  const labels = ["Dónde", "Donde", "Dirección", "Direccion", "Lugar", "Sede"];

  for (const label of labels) {
    const match = decoded.match(
      new RegExp(
        `(?:^|[>\\s])${label}\\s*:\\s*(?:<\\/strong>)?\\s*([^<\\n]+)`,
        "i",
      ),
    );

    if (match?.[1]) {
      const place = match[1].replace(/\s+/g, " ").trim();
      if (place.length > 2) return place;
    }
  }

  return "";
}

// 1. DISFRUTEMOS BA - OFICIAL Y GRATIS
export async function fetchGCBA(): Promise<Partial<Evento>[]> {
  for (const url of GCBA_URLS) {
    const res = await safeFetch(url, {}, 5000);
    if (!res) continue;

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      continue;
    }

    const payload = asRecord(json);
    const items = asArray(
      payload?.data ??
        payload?.result ??
        payload?.eventos ??
        payload?.rows ??
        json,
    );

    if (items.length === 0) continue;

    const events = items
      .map(mapGCBA)
      .filter((event): event is Partial<Evento> => event !== null);

    if (events.length > 0) {
      console.log(`GCBA ok ${events.length} (${url})`);
      return events.slice(0, 50);
    }
  }

  return [];
}

function mapGCBA(raw: unknown): Partial<Evento> | null {
  const event = asRecord(raw);
  if (!event) return null;

  const titulo = cleanHtml(
    str(event.titulo ?? event.nombre ?? event.title ?? event.evento),
  );
  if (!titulo) return null;

  const fecha =
    pickUpcomingDate(event.field_fecha_del_evento) ??
    pickUpcomingDate(
      event.field_fecha ?? event.fecha_desde ?? event.fecha_inicio ?? event.fecha,
    );
  if (!fecha) return null;

  const image =
    jsonRecord(event.field_image) ??
    jsonRecord(event.imagen) ??
    jsonRecord(event.image);

  const content = str(event.field_content) || str(event.body);
  const imagen =
    str(event.imagen) ||
    str(event.foto) ||
    str(image?.media_image) ||
    str(image?.url);
  const lugar =
    str(event.lugar) ||
    str(event.direccion) ||
    str(event.sede) ||
    extractPlace(content) ||
    "CABA";

  const tipo = str(event.field_tipo_de_evento);
  const descripcion = cleanHtml(
    [tipo, str(event.descripcion) || str(event.bajada) || content]
      .filter(Boolean)
      .join(". "),
  );

  const viewNode = str(event.view_node);
  const url = viewNode
    ? viewNode.startsWith("http")
      ? viewNode
      : `https://buenosaires.gob.ar${viewNode}`
    : undefined;

  return {
    id: str(event.nid ?? event.id ?? event._id) || undefined,
    titulo,
    descripcion: descripcion || undefined,
    lugar,
    barrio: str(event.field_barrio ?? event.barrio) || "CABA",
    fecha,
    precio: str(event.field_acceso ?? event.arancel ?? event.precio) || undefined,
    imagen: imagen || undefined,
    fuente: "gcba",
    url,
  };
}

// 2. EVENTBRITE - SCRAPING DEL JSON EMBEBIDO EN LA PÁGINA
export async function fetchEventbrite(): Promise<Partial<Evento>[]> {
  const res = await safeFetch(EVENTBRITE_URL, {}, 8000);
  if (!res) return [];

  let html = "";
  try {
    html = await res.text();
  } catch {
    return [];
  }

  const events = collectEventbriteServerData(html);
  if (events.length > 0) {
    console.log(`Eventbrite ok ${events.length}`);
    return events.slice(0, 50);
  }

  return collectEventbriteFallback(html).slice(0, 20);
}

/** Extrae `window.__SERVER_DATA__ = {...}` respetando strings y llaves. */
function extractServerData(html: string): Record<string, unknown> | null {
  const marker = html.indexOf("window.__SERVER_DATA__");
  if (marker === -1) return null;

  const start = html.indexOf("{", marker);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < html.length; index += 1) {
    const char = html[index];

    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }

    if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return asRecord(JSON.parse(html.slice(start, index + 1)));
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

function collectEventbriteServerData(html: string): Partial<Evento>[] {
  const serverData = extractServerData(html);
  if (!serverData) return [];

  const events: Partial<Evento>[] = [];
  const seen = new Set<string>();

  for (const bucket of asArray(serverData.buckets)) {
    for (const raw of asArray(asRecord(bucket)?.events)) {
      const event = asRecord(raw);
      if (!event) continue;

      const titulo = str(event.name);
      if (!titulo) continue;

      const id = str(event.id);
      const dedupe = id || titulo;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);

      const image = jsonRecord(event.image);
      const venue = jsonRecord(event.primary_venue);
      const address = asRecord(venue?.address);
      const lugar =
        str(venue?.name) ||
        (event.is_online_event === true ? "Evento online" : "") ||
        str(address?.localized_address_display) ||
        "Buenos Aires";

      events.push({
        id: id || undefined,
        titulo,
        descripcion:
          cleanHtml(str(event.summary) || str(event.full_description)) ||
          undefined,
        lugar,
        barrio:
          str(address?.city) || str(address?.region) || "CABA",
        fecha: toDateOnly(event.start_date) ?? undefined,
        imagen:
          str(image?.url) || str(asRecord(image?.original)?.url) || undefined,
        precio: event.is_free === true ? "Entrada libre" : "Consultar",
        fuente: "eventbrite",
        url: str(event.url) || undefined,
      });
    }
  }

  return events.filter(
    (event): event is Partial<Evento> & { fecha: string } =>
      typeof event.fecha === "string",
  );
}

/** Fallback por si cambia el HTML y ya no está __SERVER_DATA__. */
function collectEventbriteFallback(html: string): Partial<Evento>[] {
  const matches = [
    ...html.matchAll(/"name":"([^"]+)".*?"url":"([^"]+)".*?"image":"([^"]+)"/g),
  ];

  return matches.map((match) => ({
    titulo: match[1],
    lugar: "Buenos Aires",
    fecha: toDateOnly(new Date()) ?? new Date().toISOString(),
    imagen: match[3]?.replace(/\\u002F/g, "/"),
    fuente: "eventbrite",
    url: match[2]?.replace(/\\u002F/g, "/"),
  }));
}

// 3. PASSLINE - API REAL DEL HOME (LA PÁGINA /buenos-aires DA 404)
export async function fetchPassline(): Promise<Partial<Evento>[]> {
  const api = await safeFetch(
    PASSLINE_API_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ country: "argentina", limit: "0,48" }),
    },
    8000,
  );

  if (api) {
    try {
      const events = mapPasslineCollection(asRecord(await api.json()));
      if (events.length > 0) {
        console.log(`Passline ok ${events.length}`);
        return events.slice(0, 50);
      }
    } catch {
      // Seguimos con los fallbacks.
    }
  }

  // Cloudflare rechaza el fingerprint TLS de Node (403), pero curl pasa.
  const curlPayload = await fetchPasslineViaCurl();
  const curlEvents = mapPasslineCollection(curlPayload);
  if (curlEvents.length > 0) {
    console.log(`Passline ok ${curlEvents.length} (curl)`);
    return curlEvents.slice(0, 50);
  }

  const res = await safeFetch(PASSLINE_PAGE_URL, {}, 5000);
  if (!res) return [];

  let html = "";
  try {
    html = await res.text();
  } catch {
    return [];
  }

  const matches = [
    ...html.matchAll(/"eventName":"([^"]+)".*?"venue":"([^"]+)"/g),
  ];

  if (matches.length > 0) {
    return matches.slice(0, 20).map((match) => ({
      titulo: match[1],
      lugar: match[2],
      fecha: toDateOnly(new Date()) ?? new Date().toISOString(),
      fuente: "passline",
    }));
  }

  const titles = [...html.matchAll(/<h3[^>]*>([^<]+)<\/h3>/g)];

  return titles.slice(0, 20).map((match) => ({
    titulo: cleanHtml(match[1]),
    lugar: "CABA",
    fecha: toDateOnly(new Date()) ?? new Date().toISOString(),
    fuente: "passline",
  }));
}

async function fetchPasslineViaCurl(): Promise<Record<string, unknown> | null> {
  if (process.env.PASSLINE_DISABLE_CURL === "1") return null;

  const body = JSON.stringify({ country: "argentina", limit: "0,48" });
  const args = [
    "-sS",
    "--max-time",
    "8",
    "-X",
    "POST",
    PASSLINE_API_URL,
    "-H",
    "Content-Type: application/json",
    "-H",
    "Accept: application/json",
    "--data-binary",
    body,
  ];

  try {
    const { execFile } = await import("node:child_process");

    const stdout = await new Promise<string>((resolve, reject) => {
      execFile(
        process.platform === "win32" ? "curl.exe" : "curl",
        args,
        {
          timeout: 10000,
          maxBuffer: 10 * 1024 * 1024,
          windowsHide: true,
        },
        (error, output, stderr) => {
          if (error) {
            reject(new Error(stderr.trim() || error.message));
            return;
          }
          resolve(output);
        },
      );
    });

    return asRecord(JSON.parse(stdout));
  } catch (error) {
    console.warn(
      "[eventSources] passline curl fallback failed",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

function mapPasslineCollection(
  payload: Record<string, unknown> | null,
): Partial<Evento>[] {
  if (!payload) return [];

  const seen = new Set<string>();
  const events: Partial<Evento>[] = [];

  for (const raw of [
    ...asArray(payload.BillboardByCountry),
    ...asArray(payload.EventTop10),
  ]) {
    const event = mapPassline(raw);
    if (!event) continue;

    const key = event.id ?? event.titulo ?? "";
    if (!key || seen.has(key)) continue;

    seen.add(key);
    events.push(event);
  }

  return events;
}

function formatPasslinePrice(value: unknown): string | undefined {
  const raw = str(value);
  if (!raw) return undefined;

  const amount = Number(raw);
  if (!Number.isFinite(amount)) return raw;
  if (amount <= 0) return "Entrada libre";

  return `$${new Intl.NumberFormat("es-AR").format(amount)}`;
}

function mapPassline(raw: unknown): Partial<Evento> | null {
  const event = asRecord(raw);
  if (!event) return null;

  const titulo = cleanHtml(str(event.nombre ?? event.titulo ?? event.title));
  const fecha = toDateOnly(event.fecha_inicio ?? event.fecha);
  if (!titulo || !fecha) return null;

  // La API trae también eventos ya terminados: los descartamos.
  const today = toDateOnly(new Date());
  if (today && fecha < today) return null;

  return {
    id: str(event.id) || undefined,
    titulo,
    descripcion: cleanHtml(str(event.artistas)) || undefined,
    lugar:
      str(event.lugar) ||
      str(event.nombre_region) ||
      "Buenos Aires",
    barrio:
      str(event.nombre_communa) || str(event.nombre_region) || "CABA",
    fecha,
    precio: formatPasslinePrice(event.precio_min),
    imagen:
      str(event.miniatura) ||
      str(event.recorte) ||
      str(jsonRecord(event.image)?.url) ||
      undefined,
    destacado: str(event.act_fullhome) === "1" ? true : undefined,
    fuente: "passline",
    url: str(event.url) || undefined,
  };
}

// 4. TICKETMASTER
export async function fetchTicketmaster(): Promise<Partial<Evento>[]> {
  const key = process.env.TICKETMASTER_API_KEY;
  if (!key) return [];

  const url =
    "https://app.ticketmaster.com/discovery/v2/events.json" +
    `?apikey=${encodeURIComponent(key)}` +
    "&latlong=-34.6037,-58.3816&radius=100&unit=km&size=50&locale=*";

  const res = await safeFetch(url, {}, 6000);
  if (!res) return [];

  try {
    const json = asRecord(await res.json());
    const events = asArray(asRecord(json?._embedded)?.events);

    console.log(`Ticketmaster ok ${events.length}`);

    return events
      .map(mapTicketmaster)
      .filter((event): event is Partial<Evento> => event !== null);
  } catch {
    return [];
  }
}

function mapTicketmaster(raw: unknown): Partial<Evento> | null {
  const event = asRecord(raw);
  if (!event) return null;

  const titulo = str(event.name);
  const dates = asRecord(event.dates);
  const start = asRecord(dates?.start);
  const fecha = toDateOnly(start?.localDate ?? start?.dateTime);
  if (!titulo || !fecha) return null;

  const venue = asRecord(asArray(asRecord(event._embedded)?.venues)[0]);
  const priceRange = asRecord(asArray(event.priceRanges)[0]);
  const min = Number(priceRange?.min);
  const precio = Number.isFinite(min)
    ? min <= 0
      ? "Entrada libre"
      : `$${new Intl.NumberFormat("es-AR").format(Math.round(min))}`
    : "Consultar";

  return {
    id: str(event.id) || undefined,
    titulo,
    descripcion: cleanHtml(str(event.info) || str(event.pleaseNote)) || undefined,
    lugar: str(venue?.name) || "Buenos Aires",
    barrio: str(asRecord(venue?.city)?.name) || "CABA",
    fecha,
    precio,
    imagen: str(asRecord(asArray(event.images)[0])?.url) || undefined,
    fuente: "ticketmaster",
    url: str(event.url) || undefined,
  };
}
