export type EventCategory = "Fiesta" | "Recital" | "Teatro";

export type Event = {
  id: string;
  titulo: string;
  fecha: string;
  lugar: string;
  barrio: string;
  categoria: EventCategory;
  precio: string;
  imagen: string;
  destacado: boolean;
};

const unsplash = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

export const mockEvents: Event[] = [
  {
    id: "halloween-warehouse",
    titulo: "Halloween Warehouse",
    fecha: "2026-10-31",
    lugar: "Warehouse Costanera",
    barrio: "Puerto Madero",
    categoria: "Fiesta",
    precio: "$14.000",
    imagen: unsplash("photo-1530103862676-de8c9debad1d"),
    destacado: true,
  },
  {
    id: "sunset-rooftop",
    titulo: "Sunset Rooftop: Opening de Temporada",
    fecha: "2026-11-07",
    lugar: "Terraza Áurea",
    barrio: "Palermo",
    categoria: "Fiesta",
    precio: "$18.000",
    imagen: unsplash("photo-1492684223066-81342ee5ff30"),
    destacado: false,
  },
  {
    id: "indie-porteno",
    titulo: "Indie Porteño: Noche de Bandas",
    fecha: "2026-11-13",
    lugar: "Niceto Club",
    barrio: "Palermo",
    categoria: "Recital",
    precio: "$15.000",
    imagen: unsplash("photo-1470229722913-7c0e2dbbafd3"),
    destacado: true,
  },
  {
    id: "bernarda-alba",
    titulo: "La Casa de Bernarda Alba",
    fecha: "2026-11-20",
    lugar: "Teatro San Martín",
    barrio: "San Nicolás",
    categoria: "Teatro",
    precio: "$9.500",
    imagen: unsplash("photo-1503095396549-807759245b35"),
    destacado: true,
  },
  {
    id: "rock-emergente",
    titulo: "Rock Nacional Emergente",
    fecha: "2026-11-21",
    lugar: "El Emergente",
    barrio: "Almagro",
    categoria: "Recital",
    precio: "$7.500",
    imagen: unsplash("photo-1493225457124-a3eb161ffa5f"),
    destacado: false,
  },
  {
    id: "risas-de-viernes",
    titulo: "Stand Up: Risas de Viernes",
    fecha: "2026-11-27",
    lugar: "Teatro Picadero",
    barrio: "Balvanera",
    categoria: "Teatro",
    precio: "$8.500",
    imagen: unsplash("photo-1514306191717-452ec28c7814"),
    destacado: false,
  },
  {
    id: "cumbia-90s",
    titulo: "Fiesta Cumbia 90s",
    fecha: "2026-11-28",
    lugar: "Salón Belgrano",
    barrio: "Belgrano",
    categoria: "Fiesta",
    precio: "$8.000",
    imagen: unsplash("photo-1516450360452-9312f5e86fc7"),
    destacado: false,
  },
  {
    id: "jazz-parque-centenario",
    titulo: "Jazz Bajo las Estrellas",
    fecha: "2026-12-04",
    lugar: "Anfiteatro Parque Centenario",
    barrio: "Caballito",
    categoria: "Recital",
    precio: "$12.000",
    imagen: unsplash("photo-1514525253161-7a46d19cd819"),
    destacado: true,
  },
  {
    id: "milonga-nocturna",
    titulo: "Tango Milonga Nocturna",
    fecha: "2026-12-05",
    lugar: "La Viruta Tango",
    barrio: "Palermo",
    categoria: "Fiesta",
    precio: "$6.000",
    imagen: unsplash("photo-1519671482749-fd09be7ccebf"),
    destacado: false,
  },
  {
    id: "el-acompanante",
    titulo: "El Acompañante",
    fecha: "2026-12-11",
    lugar: "Teatro Cervantes",
    barrio: "San Nicolás",
    categoria: "Teatro",
    precio: "$11.000",
    imagen: unsplash("photo-1507924538820-ede94a04019d"),
    destacado: false,
  },
  {
    id: "tango-en-el-colon",
    titulo: "Orquesta de Tango en el Colón",
    fecha: "2026-12-12",
    lugar: "Teatro Colón",
    barrio: "San Nicolás",
    categoria: "Recital",
    precio: "$16.000",
    imagen: unsplash("photo-1524368535928-5b5e00ddc76b"),
    destacado: false,
  },
  {
    id: "impro-total",
    titulo: "Impro Total: Teatro Improvisado",
    fecha: "2026-12-19",
    lugar: "Multiteatro Comafi",
    barrio: "San Nicolás",
    categoria: "Teatro",
    precio: "$10.000",
    imagen: unsplash("photo-1524178232363-1fb2b075b655"),
    destacado: false,
  },
];
