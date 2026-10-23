import Link from "next/link";

export function SiteHeader({ active }: { active?: "eventos" | "mapa" | "cuenta" | "crear" }) {
  const links = [
    { id: "eventos", href: "/", label: "Eventos" },
    { id: "mapa", href: "/mapa", label: "Mapa" },
    { id: "crear", href: "/eventos/crear", label: "Crear evento" },
    { id: "cuenta", href: "/cuenta", label: "Mi agenda" },
  ] as const;

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-zinc-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white shadow-lg shadow-violet-500/30">
            QS
          </span>
          <span className="hidden text-sm font-semibold tracking-tight text-white sm:block">
            ¿Qué Sale?
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm text-zinc-400 sm:gap-2">
          {links.map((link) => (
            <Link
              key={link.id}
              href={link.href}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                active === link.id
                  ? "bg-white/10 text-white"
                  : "hover:bg-white/5 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/ingresar"
          className="inline-flex h-9 items-center rounded-full bg-white px-4 text-xs font-semibold text-zinc-950 transition hover:bg-zinc-200"
        >
          Ingresar
        </Link>
      </div>
    </header>
  );
}
