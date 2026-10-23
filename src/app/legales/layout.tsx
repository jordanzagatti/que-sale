import Link from "next/link";

import { SiteHeader } from "@/components/SiteHeader";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-16">
        <div className="text-sm leading-7 text-zinc-400 [&_a]:text-violet-300 [&_a:hover]:text-violet-200 [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc [&_li]:py-1 [&_p]:mt-3 [&_strong]:font-medium [&_strong]:text-zinc-200 [&_ul]:mt-3">
          {children}
        </div>

        <div className="mt-12 flex flex-wrap gap-5 border-t border-white/5 pt-6 text-xs text-zinc-500">
          <Link href="/" className="hover:text-white">
            Volver a la agenda
          </Link>
          <Link href="/legales/terminos" className="hover:text-white">
            Términos
          </Link>
          <Link href="/legales/privacidad" className="hover:text-white">
            Privacidad
          </Link>
          <Link href="/fuentes" className="hover:text-white">
            Fuentes
          </Link>
        </div>
      </main>
    </div>
  );
}
