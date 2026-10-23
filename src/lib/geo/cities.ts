import { normalizeText } from "@/lib/categories";

export type CityInfo = {
  id: string;
  name: string;
  province: string;
  lat: number;
  lng: number;
  aliases: string[];
};

const rawCities: CityInfo[] = [
  {
    id: "caba",
    name: "CABA",
    province: "Ciudad Autónoma de Buenos Aires",
    lat: -34.6037,
    lng: -58.3816,
    aliases: [
      "caba",
      "ciudad autonoma de buenos aires",
      "capital federal",
      "buenos aires",
    ],
  },
  {
    id: "cordoba",
    name: "Córdoba",
    province: "Córdoba",
    lat: -31.4201,
    lng: -64.1888,
    aliases: ["cordoba", "ciudad de cordoba", "villa carlos paz"],
  },
  {
    id: "rosario",
    name: "Rosario",
    province: "Santa Fe",
    lat: -32.9442,
    lng: -60.6505,
    aliases: ["rosario"],
  },
  {
    id: "mendoza",
    name: "Mendoza",
    province: "Mendoza",
    lat: -32.8895,
    lng: -68.8458,
    aliases: ["mendoza", "ciudad de mendoza"],
  },
  {
    id: "la-plata",
    name: "La Plata",
    province: "Buenos Aires",
    lat: -34.9214,
    lng: -57.9545,
    aliases: ["la plata", "ciudad de la plata"],
  },
  {
    id: "mar-del-plata",
    name: "Mar del Plata",
    province: "Buenos Aires",
    lat: -38.0055,
    lng: -57.5426,
    aliases: ["mar del plata", "mardel"],
  },
  {
    id: "salta",
    name: "Salta",
    province: "Salta",
    lat: -24.7821,
    lng: -65.4232,
    aliases: ["salta"],
  },
  {
    id: "tucuman",
    name: "San Miguel de Tucumán",
    province: "Tucumán",
    lat: -26.8241,
    lng: -65.2226,
    aliases: ["tucuman", "san miguel de tucuman"],
  },
  {
    id: "bariloche",
    name: "Bariloche",
    province: "Río Negro",
    lat: -41.1335,
    lng: -71.3103,
    aliases: ["bariloche", "san carlos de bariloche"],
  },
  {
    id: "ushuaia",
    name: "Ushuaia",
    province: "Tierra del Fuego",
    lat: -54.8019,
    lng: -68.303,
    aliases: ["ushuaia"],
  },
  {
    id: "neuquen",
    name: "Neuquén",
    province: "Neuquén",
    lat: -38.9516,
    lng: -68.0591,
    aliases: ["neuquen", "capital de neuquen"],
  },
  {
    id: "santa-fe",
    name: "Santa Fe",
    province: "Santa Fe",
    lat: -31.6333,
    lng: -60.7,
    aliases: ["santa fe", "ciudad de santa fe"],
  },
  {
    id: "corrientes",
    name: "Corrientes",
    province: "Corrientes",
    lat: -27.4692,
    lng: -58.8306,
    aliases: ["corrientes"],
  },
  {
    id: "posadas",
    name: "Posadas",
    province: "Misiones",
    lat: -27.3671,
    lng: -55.8961,
    aliases: ["posadas"],
  },
  {
    id: "jujuy",
    name: "San Salvador de Jujuy",
    province: "Jujuy",
    lat: -24.1858,
    lng: -65.2995,
    aliases: ["jujuy", "san salvador de jujuy"],
  },
  {
    id: "santiago-del-estero",
    name: "Santiago del Estero",
    province: "Santiago del Estero",
    lat: -27.7951,
    lng: -64.2615,
    aliases: ["santiago del estero"],
  },
  {
    id: "bahia-blanca",
    name: "Bahía Blanca",
    province: "Buenos Aires",
    lat: -38.7183,
    lng: -62.2663,
    aliases: ["bahia blanca"],
  },
  {
    id: "san-juan",
    name: "San Juan",
    province: "San Juan",
    lat: -31.5375,
    lng: -68.5364,
    aliases: ["san juan"],
  },
  {
    id: "la-rioja",
    name: "La Rioja",
    province: "La Rioja",
    lat: -29.4131,
    lng: -66.8558,
    aliases: ["la rioja"],
  },
  {
    id: "catamarca",
    name: "San Fernando del Valle de Catamarca",
    province: "Catamarca",
    lat: -28.4696,
    lng: -65.7795,
    aliases: ["catamarca", "san fernando del valle de catamarca"],
  },
  {
    id: "formosa",
    name: "Formosa",
    province: "Formosa",
    lat: -26.1775,
    lng: -58.1781,
    aliases: ["formosa"],
  },
  {
    id: "resistencia",
    name: "Resistencia",
    province: "Chaco",
    lat: -27.4514,
    lng: -58.9867,
    aliases: ["resistencia"],
  },
  {
    id: "parana",
    name: "Paraná",
    province: "Entre Ríos",
    lat: -31.7413,
    lng: -60.5238,
    aliases: ["parana"],
  },
  {
    id: "comodoro-rivadavia",
    name: "Comodoro Rivadavia",
    province: "Chubut",
    lat: -45.8641,
    lng: -67.4966,
    aliases: ["comodoro rivadavia"],
  },
  {
    id: "puerto-madryn",
    name: "Puerto Madryn",
    province: "Chubut",
    lat: -42.7692,
    lng: -65.0385,
    aliases: ["puerto madryn"],
  },
  {
    id: "san-martin-de-los-andes",
    name: "San Martín de los Andes",
    province: "Neuquén",
    lat: -40.1579,
    lng: -71.3534,
    aliases: ["san martin de los andes"],
  },
  {
    id: "pinamar",
    name: "Pinamar",
    province: "Buenos Aires",
    lat: -37.1095,
    lng: -56.8617,
    aliases: ["pinamar"],
  },
];

export const CITIES = rawCities;

const CITY_BY_ID = new Map(CITIES.map((city) => [city.id, city]));

const ALIAS_INDEX = CITIES.flatMap((city) =>
  city.aliases.map((alias) => ({
    city,
    alias: normalizeText(alias),
  })),
).sort((a, b) => b.alias.length - a.alias.length);

export const DEFAULT_CITY = CITY_BY_ID.get("caba")!;

export function getCity(idOrName: string | null | undefined): CityInfo {
  const value = normalizeText(idOrName);
  if (!value) return DEFAULT_CITY;

  const byId = CITY_BY_ID.get(value);
  if (byId) return byId;

  const byAlias = ALIAS_INDEX.find(({ alias }) => alias === value);
  if (byAlias) return byAlias.city;

  return DEFAULT_CITY;
}

export function findCity(idOrName: string | null | undefined): CityInfo | null {
  const value = normalizeText(idOrName);
  if (!value) return null;

  const byId = CITY_BY_ID.get(value);
  if (byId) return byId;

  return ALIAS_INDEX.find(({ alias }) => alias === value)?.city ?? null;
}

/**
 * Busca la ciudad mencionada en un texto libre (venue, dirección, barrio).
 * Prioriza los aliases más largos para no matchear "capital" en cualquier lado.
 */
export function inferCity(...values: unknown[]): CityInfo {
  const text = normalizeText(values.filter(Boolean).join(" "));
  if (!text) return DEFAULT_CITY;

  for (const { city, alias } of ALIAS_INDEX) {
    if (alias.length < 4) continue;
    if (text.includes(alias)) return city;
  }

  return DEFAULT_CITY;
}

export function resolveCityFromHeaders(
  cityHeader: string | null | undefined,
  latHeader?: string | null,
  lngHeader?: string | null,
): CityInfo {
  let decoded = "";
  try {
    decoded = decodeURIComponent(cityHeader ?? "");
  } catch {
    decoded = cityHeader ?? "";
  }

  const byName = findCity(decoded);
  if (byName) return byName;

  const lat = Number(latHeader);
  const lng = Number(lngHeader);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    let nearest = DEFAULT_CITY;
    let best = Number.POSITIVE_INFINITY;

    for (const city of CITIES) {
      const distance = Math.hypot(city.lat - lat, city.lng - lng);
      if (distance < best) {
        best = distance;
        nearest = city;
      }
    }

    // Si el punto está a menos de ~1.5 grados, aceptamos la ciudad cercana.
    if (best < 1.5) return nearest;
  }

  return DEFAULT_CITY;
}

export function citySlug(city: CityInfo): string {
  return city.id;
}
