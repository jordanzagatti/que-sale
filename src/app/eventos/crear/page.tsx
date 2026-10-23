import type { Metadata } from "next";

import { CreateEventForm } from "@/app/eventos/crear/CreateEventForm";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Crear evento",
  description: "Creá tu evento público o privado y compartilo con un link.",
};

export default function CrearEventoPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="text-2xl font-semibold text-white">Crear evento</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Podés hacerlo público para que aparezca en la agenda, o privado para compartir solo con un link.
        </p>
        <div className="mt-8">
          <CreateEventForm />
        </div>
      </main>
    </div>
  );
}
