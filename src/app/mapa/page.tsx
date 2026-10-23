import { MapClient } from "@/app/mapa/MapClient";
import { SiteHeader } from "@/components/SiteHeader";
import { getEventos } from "@/lib/getEventos";

export const metadata = {
  title: "Mapa de eventos",
  description:
    "Explorá los eventos de Argentina por cercanía: CABA, Córdoba, Rosario, Mendoza y todo el país.",
};

export default async function MapaPage() {
  const events = await getEventos({ limit: 500 });

  return (
    <div className="min-h-screen bg-zinc-950">
      <SiteHeader active="mapa" />
      <MapClient events={events} />
    </div>
  );
}
