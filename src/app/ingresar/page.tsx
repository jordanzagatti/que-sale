import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/app/ingresar/LoginForm";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Ingresar",
  description:
    "Entrá a ¿Qué Sale? para guardar búsquedas, marcar Asistir y recibir recordatorios de eventos.",
};

export default function IngresarPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <SiteHeader />

      <main className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-5 py-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div className="absolute left-1/2 top-[-280px] h-[540px] w-[820px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[130px]" />
          <div className="absolute bottom-0 left-[10%] h-64 w-64 rounded-full bg-fuchsia-500/10 blur-[100px]" />
        </div>

        <Suspense
          fallback={
            <div className="h-[520px] w-full max-w-md animate-pulse rounded-3xl bg-white/5" />
          }
        >
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
