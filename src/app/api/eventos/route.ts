import { getEventos } from "@/lib/getEventos";

export async function GET() {
  const eventos = await getEventos();

  return Response.json(eventos, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=300",
    },
  });
}
