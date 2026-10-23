import { HomeClient } from "@/components/HomeClient";
import { getEventos } from "@/lib/getEventos";

export default async function Home() {
  const events = await getEventos();

  return <HomeClient events={events} />;
}
