export type EventCategory =
  | "Música"
  | "Teatro"
  | "Fiesta"
  | "Arte"
  | "Cine"
  | "Deportes"
  | "Gastronomía"
  | "Ferias"
  | "Talleres"
  | "Infantil"
  | "Tech"
  | "Comunidad"
  | "Otros";

export const EVENT_CATEGORIES: EventCategory[] = [
  "Música",
  "Teatro",
  "Fiesta",
  "Arte",
  "Cine",
  "Deportes",
  "Gastronomía",
  "Ferias",
  "Talleres",
  "Infantil",
  "Tech",
  "Comunidad",
  "Otros",
];

export type EventSource =
  | "ticketmaster"
  | "gcba"
  | "eventbrite"
  | "meetup"
  | "passline"
  | "cultura"
  | "alternativa"
  | "ticketek"
  | "timeout"
  | "plateanet"
  | "jsonld"
  | "manual"
  | "unknown";

/**
 * Evento tal como lo devuelven las fuentes externas.
 * Todos los campos son opcionales porque cada API trae lo que puede.
 */
export type Evento = {
  id?: string;
  titulo: string;
  descripcion?: string;
  fecha: string;
  lugar: string;
  barrio?: string;
  categoria?: EventCategory;
  precio?: string;
  imagen?: string;
  destacado?: boolean;
  fuente?: EventSource;
  url?: string;

  // Datos extra que usamos para geolocalización y para la base.
  ciudad?: string;
  provincia?: string;
  direccion?: string;
  lat?: number;
  lng?: number;
  inicio?: string;
  fin?: string;
  esGratis?: boolean;
  moneda?: string;
  urlEntrada?: string;
  organizador?: string;
  categoriaFuente?: string;
  seriesKey?: string;
};

/** Evento listo para la UI: sin campos faltantes. */
export type NormalizedEvent = {
  id: string;
  slug?: string;
  titulo: string;
  fecha: string;
  startsAt?: string;
  endsAt?: string;
  hora?: string;
  lugar: string;
  barrio: string;
  ciudad?: string;
  provincia?: string;
  categoria: EventCategory;
  precio: string;
  imagen: string;
  destacado?: boolean;
  fuente?: EventSource;
  descripcion?: string;
  urlFuente?: string;
  urlEntrada?: string;
  lat?: number;
  lng?: number;
  distanciaM?: number;
  esGratis?: boolean;
  seriesId?: string;
  sourceId?: string;
};
