export type EventCategory = "Fiesta" | "Recital" | "Teatro";

export type EventSource =
  | "ticketmaster"
  | "gcba"
  | "eventbrite"
  | "meetup"
  | "passline";

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
};

/** Evento listo para la UI: sin campos faltantes. */
export type NormalizedEvent = {
  id: string;
  titulo: string;
  fecha: string;
  lugar: string;
  barrio: string;
  categoria: EventCategory;
  precio: string;
  imagen: string;
  destacado?: boolean;
  fuente?: EventSource;
};
