import type { Metadata } from "next";

import { AccountClient } from "@/components/AccountClient";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Mi agenda",
  description:
    "Tus eventos guardados, búsquedas, lugares seguidos y recordatorios en ¿Qué Sale?",
  robots: { index: false, follow: false },
};

export default function CuentaPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <SiteHeader active="cuenta" />
      <main>
        <AccountClient />
      </main>
    </div>
  );
}
