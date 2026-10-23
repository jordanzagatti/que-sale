import type { EventCategory } from "@/lib/types";
import { EVENT_CATEGORIES } from "@/lib/types";

export function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const KEYWORDS: Array<[EventCategory, string[]]> = [
  [
    "Teatro",
    [
      "teatro",
      "theatre",
      "theater",
      "obra",
      "funcion",
      "comedia",
      "stand up",
      "standup",
      "impro",
      "danza",
      "musical",
      "titere",
      "performing arts",
    ],
  ],
  [
    "Cine",
    ["cine", "pelicula", "film", "documental", "proyeccion", "cineteca"],
  ],
  [
    "Fiesta",
    [
      "fiesta",
      "boliche",
      "milonga",
      "rave",
      "after",
      "nightlife",
      "halloween",
      "cumbia",
      "electronica",
      "dj",
      "baile",
      "party",
      "club",
    ],
  ],
  [
    "Deportes",
    [
      "deporte",
      "partido",
      "futbol",
      "voley",
      "basquet",
      "running",
      "maraton",
      "torneo",
      "carrera",
      "hockey",
      "rugby",
    ],
  ],
  [
    "Gastronomía",
    [
      "gastronomia",
      "food",
      "comida",
      "vino",
      "degustacion",
      "cocina",
      "restaurante",
      "cerveza",
      "cafe",
      "brunch",
    ],
  ],
  [
    "Ferias",
    ["feria", "mercado", "artesanos", "flea", "expo", "exposicion comercial"],
  ],
  [
    "Talleres",
    [
      "taller",
      "curso",
      "workshop",
      "clase",
      "seminario",
      "charla",
      "masterclass",
      "capacitacion",
    ],
  ],
  [
    "Infantil",
    ["infantil", "ninos", "kids", "familia", "titeres", "peques"],
  ],
  [
    "Tech",
    [
      "tech",
      "tecnologia",
      "programacion",
      "startup",
      "inteligencia artificial",
      "desarrollador",
      "hackathon",
      "software",
    ],
  ],
  [
    "Arte",
    [
      "arte",
      "museo",
      "galeria",
      "muestra",
      "fotografia",
      "pintura",
      "escultura",
      "cultura",
    ],
  ],
  [
    "Comunidad",
    [
      "comunidad",
      "vecinos",
      "voluntariado",
      "encuentro",
      "asamblea",
      "social",
      "barrial",
    ],
  ],
  [
    "Música",
    [
      "musica",
      "music",
      "concierto",
      "concert",
      "recital",
      "jazz",
      "rock",
      "orquesta",
      "banda",
      "indie",
      "tango",
      "sinfonica",
      "festival",
      "live",
      "show",
    ],
  ],
];

const LEGACY_CATEGORY_MAP: Record<string, EventCategory> = {
  recital: "Música",
  musica: "Música",
  music: "Música",
  teatro: "Teatro",
  fiesta: "Fiesta",
  arte: "Arte",
  cine: "Cine",
  deportes: "Deportes",
  deporte: "Deportes",
  gastronomia: "Gastronomía",
  comedia: "Teatro",
  ferias: "Ferias",
  feria: "Ferias",
  talleres: "Talleres",
  taller: "Talleres",
  infantil: "Infantil",
  tech: "Tech",
  comunidad: "Comunidad",
  otros: "Otros",
};

export function normalizeCategory(value: unknown): EventCategory {
  const normalized = normalizeText(value);
  if (!normalized) return "Otros";

  const legacy = LEGACY_CATEGORY_MAP[normalized];
  if (legacy) return legacy;

  const exact = EVENT_CATEGORIES.find(
    (category) => normalizeText(category) === normalized,
  );
  return exact ?? "Otros";
}

export function inferCategory(...values: unknown[]): EventCategory {
  const text = normalizeText(values.filter(Boolean).join(" "));
  if (!text) return "Otros";

  for (const [category, keywords] of KEYWORDS) {
    if (keywords.some((keyword) => text.includes(keyword))) return category;
  }

  // Si la fuente manda una categoría conocida, respetarla antes de "Otros".
  for (const category of EVENT_CATEGORIES) {
    if (text === normalizeText(category)) return category;
  }

  return "Otros";
}

export const CATEGORY_IMAGES: Record<EventCategory, string> = {
  Música:
    "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=80",
  Teatro:
    "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1200&q=80",
  Fiesta:
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80",
  Arte: "https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=1200&q=80",
  Cine: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80",
  Deportes:
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80",
  Gastronomía:
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
  Ferias:
    "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1200&q=80",
  Talleres:
    "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80",
  Infantil:
    "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=1200&q=80",
  Tech: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
  Comunidad:
    "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80",
  Otros:
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80",
};

export function categoryImage(category: EventCategory): string {
  return CATEGORY_IMAGES[category] ?? CATEGORY_IMAGES.Otros;
}
