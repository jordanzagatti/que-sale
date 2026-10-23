export type GeocodeResult = {
  lat: number;
  lng: number;
  provider: "georef" | "nominatim";
  normalized?: string;
};

const GEOREF_URL = "https://apis.datos.gob.ar/georef/api/direcciones";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "QueSale/1.0 (agenda de eventos; contacto@quesale.ar)";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

async function fetchJson(
  url: string,
  ms = 8000,
): Promise<Record<string, unknown> | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return asRecord(await res.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Georef es el servicio oficial de Argentina: gratis, sin API key y con
 * direcciones normalizadas. Es la primera opción para geocodificar.
 */
export async function geocodeWithGeoref(
  address: string,
  province?: string,
  city?: string,
): Promise<GeocodeResult | null> {
  const query = [address, city, province, "Argentina"]
    .filter(Boolean)
    .join(", ");

  const params = new URLSearchParams({
    direccion: address,
    max: "1",
    campos: "lat,lng,nomenclatura,ubicacion",
  });
  if (province) params.set("provincia", province);

  const payload = await fetchJson(`${GEOREF_URL}?${params.toString()}`);
  const first = Array.isArray(payload?.direcciones)
    ? asRecord(payload?.direcciones[0])
    : null;

  const lat = Number(first?.lat);
  const lng = Number(first?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    lat,
    lng,
    provider: "georef",
    normalized: String(first?.nomenclatura ?? query),
  };
}

/**
 * Fallback internacional. Nominatim pide 1 request/segundo y un User-Agent
 * identificable; por eso siempre cacheamos en Supabase antes de llamarlo.
 */
export async function geocodeWithNominatim(
  address: string,
  city?: string,
  province?: string,
): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({
    q: [address, city, province, "Argentina"].filter(Boolean).join(", "),
    format: "jsonv2",
    limit: "1",
    countrycodes: "ar",
  });

  const payload = await fetchJson(`${NOMINATIM_URL}?${params.toString()}`);
  const first = Array.isArray(payload) ? asRecord(payload[0]) : null;
  if (!first) return null;

  const lat = Number(first.lat);
  const lng = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    lat,
    lng,
    provider: "nominatim",
    normalized: String(first.display_name ?? address),
  };
}

export async function geocodeAddress(
  address: string,
  city?: string,
  province?: string,
): Promise<GeocodeResult | null> {
  if (!address.trim()) return null;

  const georef = await geocodeWithGeoref(address, province, city);
  if (georef) return georef;

  // Nominatim es más lento y restrictivo: solo como último recurso.
  return geocodeWithNominatim(address, city, province);
}
